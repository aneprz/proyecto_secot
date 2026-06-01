from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import require_read, require_write
from ..db import get_connection
from ..models import GrupoCreate, GrupoOut, GrupoUpdate

router = APIRouter(prefix="/grupos", tags=["grupos"], dependencies=[Depends(require_read)])


def _row_to_grupo(row) -> GrupoOut:
    return GrupoOut(**row)


@router.get("", response_model=list[GrupoOut])
def list_grupos(
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    where = "" if include_inactive else "where activo = true"
    sql = f"""
        select
            grupo_id,
            nombre_grupo,
            descripcion,
            color_hex,
            canal_teams,
            responsable_senior_id,
            delegacion_id,
            activo
        from grupo
        {where}
        order by grupo_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"limit": limit, "offset": offset})
            return [_row_to_grupo(r) for r in cur.fetchall()]


@router.get("/{grupo_id}", response_model=GrupoOut)
def get_grupo(grupo_id: int):
    sql = """
        select
            grupo_id,
            nombre_grupo,
            descripcion,
            color_hex,
            canal_teams,
            responsable_senior_id,
            delegacion_id,
            activo
        from grupo
        where grupo_id = %(grupo_id)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"grupo_id": grupo_id})
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Grupo no encontrado")
            return _row_to_grupo(row)


@router.post("", response_model=GrupoOut, status_code=201)
def create_grupo(payload: GrupoCreate, _: str = Depends(require_write)):
    sql = """
        insert into grupo (
            nombre_grupo,
            descripcion,
            color_hex,
            canal_teams,
            responsable_senior_id,
            delegacion_id,
            activo
        )
        values (
            %(nombre_grupo)s,
            %(descripcion)s,
            %(color_hex)s,
            %(canal_teams)s,
            %(responsable_senior_id)s,
            %(delegacion_id)s,
            %(activo)s
        )
        returning
            grupo_id,
            nombre_grupo,
            descripcion,
            color_hex,
            canal_teams,
            responsable_senior_id,
            delegacion_id,
            activo;
    """
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload.model_dump())
                row = cur.fetchone()
                conn.commit()
                return _row_to_grupo(row)
    except Exception as exc:
        message = str(exc)
        if "uq_grupo_nombre_grupo" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Nombre ya existe")
        raise


@router.patch("/{grupo_id}", response_model=GrupoOut)
def update_grupo(grupo_id: int, payload: GrupoUpdate, _: str = Depends(require_write)):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_grupo(grupo_id)

    set_parts = []
    params = {"grupo_id": grupo_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update grupo
        set {set_sql}
        where grupo_id = %(grupo_id)s
        returning
            grupo_id,
            nombre_grupo,
            descripcion,
            color_hex,
            canal_teams,
            responsable_senior_id,
            delegacion_id,
            activo;
    """

    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Grupo no encontrado")
                conn.commit()
                return _row_to_grupo(row)
    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        if "uq_grupo_nombre_grupo" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Nombre ya existe")
        raise


@router.delete("/{grupo_id}", status_code=204)
def delete_grupo(grupo_id: int, hard: bool = False, _: str = Depends(require_write)):
    sql = (
        "delete from grupo where grupo_id = %(grupo_id)s;"
        if hard
        else "update grupo set activo = false where grupo_id = %(grupo_id)s;"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"grupo_id": grupo_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Grupo no encontrado")
            conn.commit()

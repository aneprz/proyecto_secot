from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import require_read, require_write
from ..db import get_connection
from ..models import CentroCreate, CentroOut, CentroUpdate

router = APIRouter(prefix="/centros", tags=["centros"], dependencies=[Depends(require_read)])


def _row_to_centro(row) -> CentroOut:
    return CentroOut(**row)


@router.get("", response_model=list[CentroOut])
def list_centros(
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    where = "" if include_inactive else "where activo = true"
    sql = f"""
        select centro_id,
               nombre_centro as nombre,
               tipo_centro as tipo,
               direccion,
               municipio,
               activo
        from centro
        {where}
        order by centro_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"limit": limit, "offset": offset})
            return [_row_to_centro(r) for r in cur.fetchall()]


@router.get("/{centro_id}", response_model=CentroOut)
def get_centro(centro_id: int):
    sql = """
        select centro_id,
               nombre_centro as nombre,
               tipo_centro as tipo,
               direccion,
               municipio,
               activo
        from centro
        where centro_id = %(centro_id)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"centro_id": centro_id})
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Centro no encontrado")
            return _row_to_centro(row)


@router.post("", response_model=CentroOut, status_code=201)
def create_centro(payload: CentroCreate, _: str = Depends(require_write)):
    sql = """
        insert into centro (nombre_centro, tipo_centro, direccion, municipio, activo)
        values (%(nombre)s, %(tipo)s, %(direccion)s, %(municipio)s, %(activo)s)
        returning centro_id,
                  nombre_centro as nombre,
                  tipo_centro as tipo,
                  direccion,
                  municipio,
                  activo;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, payload.model_dump())
            row = cur.fetchone()
            conn.commit()
            return _row_to_centro(row)


@router.patch("/{centro_id}", response_model=CentroOut)
def update_centro(centro_id: int, payload: CentroUpdate, _: str = Depends(require_write)):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_centro(centro_id)

    set_parts = []
    params = {"centro_id": centro_id}
    for key, value in data.items():
        column = {"nombre": "nombre_centro", "tipo": "tipo_centro"}.get(key, key)
        set_parts.append(f"{column} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update centro
        set {set_sql}
        where centro_id = %(centro_id)s
        returning centro_id,
                  nombre_centro as nombre,
                  tipo_centro as tipo,
                  direccion,
                  municipio,
                  activo;
    """

    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Centro no encontrado")
            conn.commit()
            return _row_to_centro(row)


@router.delete("/{centro_id}", status_code=204)
def delete_centro(centro_id: int, hard: bool = False, _: str = Depends(require_write)):
    sql = (
        "delete from centro where centro_id = %(centro_id)s;"
        if hard
        else "update centro set activo = false where centro_id = %(centro_id)s;"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"centro_id": centro_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Centro no encontrado")
            conn.commit()


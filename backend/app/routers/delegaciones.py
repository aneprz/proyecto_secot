from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import require_admin, require_read
from ..db import get_connection
from ..models import DelegacionCreate, DelegacionOut, DelegacionUpdate

router = APIRouter(prefix="/delegaciones", tags=["delegaciones"], dependencies=[Depends(require_read)])


def _row_to_delegacion(row) -> DelegacionOut:
    return DelegacionOut(**row)


@router.get("", response_model=list[DelegacionOut])
def list_delegaciones(
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    where = "" if include_inactive else "where activo = true"
    sql = f"""
        select delegacion_id, codigo, nombre, activo
        from delegacion
        {where}
        order by delegacion_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"limit": limit, "offset": offset})
            return [_row_to_delegacion(r) for r in cur.fetchall()]


@router.get("/{delegacion_id}", response_model=DelegacionOut)
def get_delegacion(delegacion_id: int):
    sql = """
        select delegacion_id, codigo, nombre, activo
        from delegacion
        where delegacion_id = %(delegacion_id)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"delegacion_id": delegacion_id})
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Delegación no encontrada")
            return _row_to_delegacion(row)


@router.post("", response_model=DelegacionOut, status_code=201)
def create_delegacion(payload: DelegacionCreate, _: str = Depends(require_admin)):
    sql = """
        insert into delegacion (codigo, nombre, activo)
        values (%(codigo)s, %(nombre)s, %(activo)s)
        returning delegacion_id, codigo, nombre, activo;
    """
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload.model_dump())
                row = cur.fetchone()
                conn.commit()
                return _row_to_delegacion(row)
    except Exception as exc:
        message = str(exc)
        if "uq_delegacion_codigo" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Código de delegación ya existe")
        raise


@router.patch("/{delegacion_id}", response_model=DelegacionOut)
def update_delegacion(delegacion_id: int, payload: DelegacionUpdate, _: str = Depends(require_admin)):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_delegacion(delegacion_id)

    set_parts = []
    params = {"delegacion_id": delegacion_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update delegacion
        set {set_sql}
        where delegacion_id = %(delegacion_id)s
        returning delegacion_id, codigo, nombre, activo;
    """
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Delegación no encontrada")
                conn.commit()
                return _row_to_delegacion(row)
    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        if "uq_delegacion_codigo" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Código de delegación ya existe")
        raise


@router.delete("/{delegacion_id}", status_code=204)
def delete_delegacion(delegacion_id: int, hard: bool = False, _: str = Depends(require_admin)):
    sql = (
        "delete from delegacion where delegacion_id = %(delegacion_id)s;"
        if hard
        else "update delegacion set activo = false where delegacion_id = %(delegacion_id)s;"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"delegacion_id": delegacion_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Delegación no encontrada")
            conn.commit()

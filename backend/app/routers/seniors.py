from fastapi import APIRouter, HTTPException, Query
from psycopg.rows import dict_row

from ..db import get_connection
from ..models import SeniorCreate, SeniorOut, SeniorUpdate

router = APIRouter(prefix="/seniors", tags=["seniors"])


def _row_to_senior(row) -> SeniorOut:
    return SeniorOut(**row)


@router.get("", response_model=list[SeniorOut])
def list_seniors(
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    where = "" if include_inactive else "where activo = true"
    sql = f"""
        select senior_id, nombre, apellidos, email, movil, fecha_alta, activo
        from senior
        {where}
        order by senior_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"limit": limit, "offset": offset})
            return [_row_to_senior(r) for r in cur.fetchall()]


@router.get("/{senior_id}", response_model=SeniorOut)
def get_senior(senior_id: int):
    sql = """
        select senior_id, nombre, apellidos, email, movil, fecha_alta, activo
        from senior
        where senior_id = %(senior_id)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"senior_id": senior_id})
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Senior no encontrado")
            return _row_to_senior(row)


@router.post("", response_model=SeniorOut, status_code=201)
def create_senior(payload: SeniorCreate):
    sql = """
        insert into senior (nombre, apellidos, email, movil, fecha_alta, activo)
        values (%(nombre)s, %(apellidos)s, %(email)s, %(movil)s, %(fecha_alta)s, %(activo)s)
        returning senior_id, nombre, apellidos, email, movil, fecha_alta, activo;
    """
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload.model_dump())
                row = cur.fetchone()
                conn.commit()
                return _row_to_senior(row)
    except Exception as exc:
        message = str(exc)
        if "uq_senior_email" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Email ya existe")
        raise


@router.patch("/{senior_id}", response_model=SeniorOut)
def update_senior(senior_id: int, payload: SeniorUpdate):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_senior(senior_id)

    set_parts = []
    params = {"senior_id": senior_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update senior
        set {set_sql}
        where senior_id = %(senior_id)s
        returning senior_id, nombre, apellidos, email, movil, fecha_alta, activo;
    """

    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Senior no encontrado")
                conn.commit()
                return _row_to_senior(row)
    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        if "uq_senior_email" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Email ya existe")
        raise


@router.delete("/{senior_id}", status_code=204)
def delete_senior(senior_id: int, hard: bool = False):
    sql = (
        "delete from senior where senior_id = %(senior_id)s;"
        if hard
        else "update senior set activo = false where senior_id = %(senior_id)s;"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"senior_id": senior_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Senior no encontrado")
            conn.commit()


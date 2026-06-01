from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import require_read, require_write
from ..db import get_connection
from ..models import ActividadSeniorCreate, ActividadSeniorOut, ActividadSeniorUpdate

router = APIRouter(
    prefix="/actividades-seniors",
    tags=["actividad-senior"],
    dependencies=[Depends(require_read)],
)


def _row_to_actividad_senior(row) -> ActividadSeniorOut:
    return ActividadSeniorOut(**row)


@router.get("", response_model=list[ActividadSeniorOut])
def list_actividad_seniors(
    actividad_id: int | None = None,
    senior_id: int | None = None,
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    where_parts = []
    params = {"limit": limit, "offset": offset}

    if actividad_id is not None:
        where_parts.append("asr.actividad_id = %(actividad_id)s")
        params["actividad_id"] = actividad_id

    if senior_id is not None:
        where_parts.append("asr.senior_id = %(senior_id)s")
        params["senior_id"] = senior_id

    if not include_inactive:
        where_parts.append("asr.activo = true")

    where_clause = "where " + " and ".join(where_parts) if where_parts else ""

    sql = f"""
        select
            asr.actividad_senior_id,
            asr.actividad_id,
            asr.senior_id,
            asr.rol_en_actividad,
            asr.fecha_alta,
            asr.fecha_baja,
            asr.activo
        from actividad_senior asr
        {where_clause}
        order by asr.actividad_senior_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [_row_to_actividad_senior(r) for r in cur.fetchall()]


@router.get("/{actividad_senior_id}", response_model=ActividadSeniorOut)
def get_actividad_senior(actividad_senior_id: int):
    sql = """
        select
            actividad_senior_id,
            actividad_id,
            senior_id,
            rol_en_actividad,
            fecha_alta,
            fecha_baja,
            activo
        from actividad_senior
        where actividad_senior_id = %(id)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": actividad_senior_id})
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Relación no encontrada")
            return _row_to_actividad_senior(row)


@router.post(
    "",
    response_model=ActividadSeniorOut,
    status_code=201,
    dependencies=[Depends(require_write)],
)
def create_actividad_senior(payload: ActividadSeniorCreate):
    sql = """
        insert into actividad_senior (
            actividad_id,
            senior_id,
            rol_en_actividad,
            fecha_alta,
            fecha_baja,
            activo
        )
        values (
            %(actividad_id)s,
            %(senior_id)s,
            %(rol_en_actividad)s,
            coalesce(%(fecha_alta)s, current_date),
            %(fecha_baja)s,
            coalesce(%(activo)s, true)
        )
        returning
            actividad_senior_id,
            actividad_id,
            senior_id,
            rol_en_actividad,
            fecha_alta,
            fecha_baja,
            activo;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, payload.model_dump())
            row = cur.fetchone()
            conn.commit()
            return _row_to_actividad_senior(row)


@router.patch(
    "/{actividad_senior_id}",
    response_model=ActividadSeniorOut,
    dependencies=[Depends(require_write)],
)
def update_actividad_senior(actividad_senior_id: int, payload: ActividadSeniorUpdate):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_actividad_senior(actividad_senior_id)

    set_parts = []
    params = {"actividad_senior_id": actividad_senior_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update actividad_senior
        set {set_sql}
        where actividad_senior_id = %(actividad_senior_id)s
        returning
            actividad_senior_id,
            actividad_id,
            senior_id,
            rol_en_actividad,
            fecha_alta,
            fecha_baja,
            activo;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Relación no encontrada")
            conn.commit()
            return _row_to_actividad_senior(row)


@router.delete(
    "/{actividad_senior_id}",
    status_code=204,
    dependencies=[Depends(require_write)],
)
def delete_actividad_senior(actividad_senior_id: int, hard: bool = False):
    sql = (
        "delete from actividad_senior where actividad_senior_id = %(id)s;"
        if hard
        else (
            "update actividad_senior set activo = false, "
            "fecha_baja = coalesce(fecha_baja, current_date) "
            "where actividad_senior_id = %(id)s;"
        )
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": actividad_senior_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Relación no encontrada")
            conn.commit()

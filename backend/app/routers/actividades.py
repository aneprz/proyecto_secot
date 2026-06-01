from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import require_read, require_write
from ..db import get_connection
from ..models import ActividadCreate, ActividadOut, ActividadUpdate

router = APIRouter(
    prefix="/actividades", tags=["actividades"], dependencies=[Depends(require_read)]
)


def _row_to_actividad(row) -> ActividadOut:
    return ActividadOut(**row)


@router.get("", response_model=list[ActividadOut])
def list_actividades(
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    where = "" if include_inactive else "where activo = true"
    sql = f"""
        select
            actividad_id, grupo_id, centro_id, delegacion_id, titulo_actividad, descripcion, tipo_actividad,
            senior_responsable_actividad_id, estado_actividad, fecha_inicio_prevista, fecha_fin_prevista, activo
        from actividad
        {where}
        order by actividad_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"limit": limit, "offset": offset})
            return [_row_to_actividad(r) for r in cur.fetchall()]


@router.get("/{actividad_id}", response_model=ActividadOut)
def get_actividad(actividad_id: int):
    sql = """
        select
            actividad_id, grupo_id, centro_id, delegacion_id, titulo_actividad, descripcion, tipo_actividad,
            senior_responsable_actividad_id, estado_actividad, fecha_inicio_prevista, fecha_fin_prevista, activo
        from actividad
        where actividad_id = %(actividad_id)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"actividad_id": actividad_id})
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Actividad no encontrada")
            return _row_to_actividad(row)


@router.post("", response_model=ActividadOut, status_code=201)
def create_actividad(payload: ActividadCreate, _: str = Depends(require_write)):
    sql = """
        insert into actividad (
            grupo_id, centro_id, delegacion_id, titulo_actividad, descripcion, tipo_actividad,
            senior_responsable_actividad_id, estado_actividad, fecha_inicio_prevista, fecha_fin_prevista, activo
        )
        values (
            %(grupo_id)s, %(centro_id)s, %(delegacion_id)s, %(titulo_actividad)s, %(descripcion)s, %(tipo_actividad)s,
            %(senior_responsable_actividad_id)s, %(estado_actividad)s, %(fecha_inicio_prevista)s, %(fecha_fin_prevista)s, %(activo)s
        )
        returning
            actividad_id, grupo_id, centro_id, delegacion_id, titulo_actividad, descripcion, tipo_actividad,
            senior_responsable_actividad_id, estado_actividad, fecha_inicio_prevista, fecha_fin_prevista, activo;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, payload.model_dump())
            row = cur.fetchone()
            conn.commit()
            return _row_to_actividad(row)


@router.patch("/{actividad_id}", response_model=ActividadOut)
def update_actividad(
    actividad_id: int, payload: ActividadUpdate, _: str = Depends(require_write)
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_actividad(actividad_id)

    set_parts = []
    params = {"actividad_id": actividad_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update actividad
        set {set_sql}
        where actividad_id = %(actividad_id)s
        returning
            actividad_id, grupo_id, centro_id, delegacion_id, titulo_actividad, descripcion, tipo_actividad,
            senior_responsable_actividad_id, estado_actividad, fecha_inicio_prevista, fecha_fin_prevista, activo;
    """

    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Actividad no encontrada")
            conn.commit()
            return _row_to_actividad(row)


@router.delete("/{actividad_id}", status_code=204)
def delete_actividad(actividad_id: int, hard: bool = False, _: str = Depends(require_write)):
    sql = (
        "delete from actividad where actividad_id = %(actividad_id)s;"
        if hard
        else "update actividad set activo = false where actividad_id = %(actividad_id)s;"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"actividad_id": actividad_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Actividad no encontrada")
            conn.commit()


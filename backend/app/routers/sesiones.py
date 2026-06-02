from datetime import date, time

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import require_read, require_write
from ..db import get_connection
from ..models import SesionCreate, SesionOut, SesionUpdate

router = APIRouter(prefix="/sesiones", tags=["sesiones"], dependencies=[Depends(require_read)])


def _row_to_sesion(row) -> SesionOut:
    data = dict(row)
    if isinstance(data.get("hora_inicio"), time):
        data["hora_inicio"] = data["hora_inicio"].isoformat()
    if isinstance(data.get("hora_fin"), time):
        data["hora_fin"] = data["hora_fin"].isoformat()
    return SesionOut(**data)


@router.get("", response_model=list[SesionOut])
def list_sesiones(
    actividad_id: int | None = None,
    grupo_id: int | None = None,
    centro_id: int | None = None,
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    where_parts = []
    params = {"limit": limit, "offset": offset}

    if actividad_id is not None:
        where_parts.append("s.actividad_id = %(actividad_id)s")
        params["actividad_id"] = actividad_id
    if grupo_id is not None:
        where_parts.append("s.grupo_id = %(grupo_id)s")
        params["grupo_id"] = grupo_id
    if centro_id is not None:
        where_parts.append("s.centro_id = %(centro_id)s")
        params["centro_id"] = centro_id
    if not include_inactive:
        where_parts.append("s.activo = true")

    where_clause = "where " + " and ".join(where_parts) if where_parts else ""

    sql = f"""
        select
            s.sesion_id,
            s.actividad_id,
            s.grupo_id,
            s.centro_id,
            s.fecha,
            s.hora_inicio,
            s.hora_fin,
            s.duracion_horas,
            s.titulo_sesion,
            s.ubicacion,
            s.estado_sesion,
            s.observaciones,
            s.es_visible_calendario,
            s.activo
        from sesion s
        {where_clause}
        order by s.sesion_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [_row_to_sesion(r) for r in cur.fetchall()]


@router.get("/calendar", response_model=list[SesionOut])
def list_sesiones_calendar(
    start_date: date | None = None,
    end_date: date | None = None,
    delegacion_id: int | None = None,
    grupo_id: int | None = None,
    centro_id: int | None = None,
    include_inactive: bool = False,
):
    where_parts = ["s.es_visible_calendario = true"]
    params = {}

    if start_date is not None:
        where_parts.append("s.fecha >= %(start_date)s")
        params["start_date"] = start_date
    if end_date is not None:
        where_parts.append("s.fecha <= %(end_date)s")
        params["end_date"] = end_date
    if grupo_id is not None:
        where_parts.append("s.grupo_id = %(grupo_id)s")
        params["grupo_id"] = grupo_id
    if centro_id is not None:
        where_parts.append("s.centro_id = %(centro_id)s")
        params["centro_id"] = centro_id
    if delegacion_id is not None:
        where_parts.append(
            "(g.delegacion_id = %(delegacion_id)s OR c.delegacion_id = %(delegacion_id)s)"
        )
        params["delegacion_id"] = delegacion_id
    if not include_inactive:
        where_parts.append("s.activo = true")

    where_clause = "where " + " and ".join(where_parts) if where_parts else ""

    sql = f"""
        select
            s.sesion_id,
            s.actividad_id,
            s.grupo_id,
            s.centro_id,
            s.fecha,
            s.hora_inicio,
            s.hora_fin,
            s.duracion_horas,
            s.titulo_sesion,
            s.ubicacion,
            s.estado_sesion,
            s.observaciones,
            s.es_visible_calendario,
            s.activo
        from sesion s
        left join grupo g on g.grupo_id = s.grupo_id
        left join centro c on c.centro_id = s.centro_id
        {where_clause}
        order by s.fecha asc, s.hora_inicio asc;
    """

    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [_row_to_sesion(r) for r in cur.fetchall()]


@router.get("/{sesion_id}", response_model=SesionOut)
def get_sesion(sesion_id: int):
    sql = """
        select
            sesion_id, actividad_id, grupo_id, centro_id, fecha, hora_inicio, hora_fin,
            duracion_horas, titulo_sesion, ubicacion, estado_sesion, observaciones,
            es_visible_calendario, activo
        from sesion
        where sesion_id = %(sesion_id)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"sesion_id": sesion_id})
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
            return _row_to_sesion(row)


@router.post("", response_model=SesionOut, status_code=201)
def create_sesion(payload: SesionCreate, _: str = Depends(require_write)):
    sql = """
        insert into sesion (
            actividad_id, grupo_id, centro_id, fecha, hora_inicio, hora_fin,
            duracion_horas, titulo_sesion, ubicacion, estado_sesion, observaciones,
            es_visible_calendario, activo
        )
        values (
            %(actividad_id)s,
            %(grupo_id)s,
            %(centro_id)s,
            %(fecha)s,
            %(hora_inicio)s,
            %(hora_fin)s,
            %(duracion_horas)s,
            %(titulo_sesion)s,
            %(ubicacion)s,
            %(estado_sesion)s,
            %(observaciones)s,
            %(es_visible_calendario)s,
            %(activo)s
        )
        returning
            sesion_id, actividad_id, grupo_id, centro_id, fecha, hora_inicio, hora_fin,
            duracion_horas, titulo_sesion, ubicacion, estado_sesion, observaciones,
            es_visible_calendario, activo;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, payload.model_dump())
            row = cur.fetchone()
            conn.commit()
            return _row_to_sesion(row)


@router.patch("/{sesion_id}", response_model=SesionOut)
def update_sesion(sesion_id: int, payload: SesionUpdate, _: str = Depends(require_write)):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_sesion(sesion_id)

    set_parts = []
    params = {"sesion_id": sesion_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update sesion
        set {set_sql}
        where sesion_id = %(sesion_id)s
        returning
            sesion_id, actividad_id, grupo_id, centro_id, fecha, hora_inicio, hora_fin,
            duracion_horas, titulo_sesion, ubicacion, estado_sesion, observaciones,
            es_visible_calendario, activo;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
            conn.commit()
            return _row_to_sesion(row)


@router.delete("/{sesion_id}", status_code=204)
def delete_sesion(sesion_id: int, hard: bool = False, _: str = Depends(require_write)):
    sql = (
        "delete from sesion where sesion_id = %(sesion_id)s;"
        if hard
        else "update sesion set activo = false where sesion_id = %(sesion_id)s;"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"sesion_id": sesion_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
            conn.commit()

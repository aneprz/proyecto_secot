from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import require_read, require_write
from ..db import get_connection
from ..models import SeniorGrupoCreate, SeniorGrupoOut, SeniorGrupoUpdate

router = APIRouter(
    prefix="/grupos-seniors",
    tags=["grupo-senior"],
    dependencies=[Depends(require_read)],
)


def _row_to_grupo_senior(row) -> SeniorGrupoOut:
    return SeniorGrupoOut(**row)


@router.get("", response_model=list[SeniorGrupoOut])
def list_grupo_seniors(
    grupo_id: int | None = None,
    senior_id: int | None = None,
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Listar relaciones grupo-senior con filtros opcionales"""
    where_parts = []
    params = {"limit": limit, "offset": offset}

    if grupo_id is not None:
        where_parts.append("gs.grupo_id = %(grupo_id)s")
        params["grupo_id"] = grupo_id

    if senior_id is not None:
        where_parts.append("gs.senior_id = %(senior_id)s")
        params["senior_id"] = senior_id

    if not include_inactive:
        where_parts.append("gs.activo = true")

    where_clause = "where " + " and ".join(where_parts) if where_parts else ""

    sql = f"""
        select
            gs.senior_grupo_id,
            gs.senior_id,
            gs.grupo_id,
            gs.rol_en_grupo,
            gs.fecha_alta,
            gs.fecha_baja,
            gs.activo
        from senior_grupo gs
        {where_clause}
        order by gs.senior_grupo_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [_row_to_grupo_senior(r) for r in cur.fetchall()]


@router.get("/seniors/{grupo_id}", response_model=list[dict])
def get_seniors_by_grupo(grupo_id: int):
    """Obtener todos los seniors de un grupo"""
    sql = """
        select
            s.senior_id,
            s.nombre,
            s.apellido1,
            s.apellido2,
            s.email_personal,
            s.email_secot,
            s.movil,
            s.fecha_alta,
            s.activo,
            gs.rol_en_grupo,
            gs.fecha_alta as fecha_asignacion,
            gs.fecha_baja,
            gs.activo as relacion_activa
        from senior_grupo gs
        join senior s on gs.senior_id = s.senior_id
        where gs.grupo_id = %(grupo_id)s and s.activo = true and gs.activo = true
        order by s.senior_id asc;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"grupo_id": grupo_id})
            return [dict(r) for r in cur.fetchall()]


@router.get("/grupos/{senior_id}", response_model=list[dict])
def get_grupos_by_senior(senior_id: int):
    """Obtener todos los grupos de un senior"""
    sql = """
        select
            g.grupo_id,
            g.nombre_grupo,
            g.descripcion,
            g.color_hex,
            g.canal_teams,
            g.responsable_senior_id,
            g.activo,
            gs.rol_en_grupo,
            gs.fecha_alta as fecha_asignacion,
            gs.fecha_baja,
            gs.activo as relacion_activa
        from senior_grupo gs
        join grupo g on gs.grupo_id = g.grupo_id
        where gs.senior_id = %(senior_id)s and g.activo = true and gs.activo = true
        order by g.grupo_id asc;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"senior_id": senior_id})
            return [dict(r) for r in cur.fetchall()]


@router.post(
    "",
    response_model=SeniorGrupoOut,
    status_code=201,
    dependencies=[Depends(require_write)],
)
def create_grupo_senior(payload: SeniorGrupoCreate):
    """Asignar un senior a un grupo"""
    sql = """
        insert into senior_grupo (
            senior_id,
            grupo_id,
            rol_en_grupo,
            fecha_alta,
            fecha_baja,
            activo
        )
        values (
            %(senior_id)s,
            %(grupo_id)s,
            %(rol_en_grupo)s,
            coalesce(%(fecha_alta)s, current_date),
            %(fecha_baja)s,
            coalesce(%(activo)s, true)
        )
        returning
            senior_grupo_id,
            senior_id,
            grupo_id,
            rol_en_grupo,
            fecha_alta,
            fecha_baja,
            activo;
    """
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload.model_dump())
                row = cur.fetchone()
                conn.commit()
                return _row_to_grupo_senior(row)
    except Exception as exc:
        message = str(exc)
        if "uq_senior_grupo_unique" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Este senior ya está en el grupo")
        if "fk_senior_grupo_grupo" in message or "foreign key" in message.lower():
            raise HTTPException(status_code=404, detail="Grupo no encontrado")
        if "fk_senior_grupo_senior" in message or "foreign key" in message.lower():
            raise HTTPException(status_code=404, detail="Senior no encontrado")
        raise


@router.patch(
    "/{senior_grupo_id}",
    response_model=SeniorGrupoOut,
    dependencies=[Depends(require_write)],
)
def update_grupo_senior(senior_grupo_id: int, payload: SeniorGrupoUpdate):
    """Actualizar la relación senior-grupo"""
    data = payload.model_dump(exclude_unset=True)
    if not data:
        sql = """
            select
                senior_grupo_id,
                senior_id,
                grupo_id,
                rol_en_grupo,
                fecha_alta,
                fecha_baja,
                activo
            from senior_grupo
            where senior_grupo_id = %(id)s;
        """
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {"id": senior_grupo_id})
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Relación no encontrada")
                return _row_to_grupo_senior(row)

    set_parts = []
    params = {"senior_grupo_id": senior_grupo_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update senior_grupo
        set {set_sql}
        where senior_grupo_id = %(senior_grupo_id)s
        returning
            senior_grupo_id,
            senior_id,
            grupo_id,
            rol_en_grupo,
            fecha_alta,
            fecha_baja,
            activo;
    """
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Relación no encontrada")
                conn.commit()
                return _row_to_grupo_senior(row)
    except HTTPException:
        raise


@router.delete("/{senior_grupo_id}", status_code=204, dependencies=[Depends(require_write)])
def delete_grupo_senior(senior_grupo_id: int, hard: bool = False):
    """Desactivar (o borrar) una relación senior-grupo"""
    sql = (
        "delete from senior_grupo where senior_grupo_id = %(id)s;"
        if hard
        else (
            "update senior_grupo set activo = false, "
            "fecha_baja = coalesce(fecha_baja, current_date) "
            "where senior_grupo_id = %(id)s;"
        )
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": senior_grupo_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Relación no encontrada")
            conn.commit()

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import require_read, require_write
from ..db import get_connection
from ..models import GrupoSeniorCreate, GrupoSeniorOut, GrupoSeniorUpdate

router = APIRouter(
    prefix="/grupos-seniors",
    tags=["grupo-senior"],
    dependencies=[Depends(require_read)],
)


def _row_to_grupo_senior(row) -> GrupoSeniorOut:
    return GrupoSeniorOut(**row)


@router.get("", response_model=list[GrupoSeniorOut])
def list_grupo_seniors(
    grupo_id: int | None = None,
    senior_id: int | None = None,
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

    where_clause = "where " + " and ".join(where_parts) if where_parts else ""

    sql = f"""
        select gs.grupo_senior_id, gs.grupo_id, gs.senior_id, gs.rol_en_grupo, gs.fecha_alta
        from grupo_senior gs
        {where_clause}
        order by gs.grupo_senior_id asc
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
        select s.senior_id, s.nombre, s.apellidos, s.email, s.movil, s.fecha_alta, s.activo,
               gs.rol_en_grupo, gs.fecha_alta as fecha_asignacion
        from grupo_senior gs
        join senior s on gs.senior_id = s.senior_id
        where gs.grupo_id = %(grupo_id)s and s.activo = true
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
        select g.grupo_id, g.nombre_grupo as nombre, g.descripcion, g.activo,
               gs.rol_en_grupo, gs.fecha_alta as fecha_asignacion
        from grupo_senior gs
        join grupo g on gs.grupo_id = g.grupo_id
        where gs.senior_id = %(senior_id)s and g.activo = true
        order by g.grupo_id asc;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"senior_id": senior_id})
            return [dict(r) for r in cur.fetchall()]


@router.post(
    "",
    response_model=GrupoSeniorOut,
    status_code=201,
    dependencies=[Depends(require_write)],
)
def create_grupo_senior(payload: GrupoSeniorCreate):
    """Asignar un senior a un grupo"""
    sql = """
        insert into grupo_senior (grupo_id, senior_id, rol_en_grupo)
        values (%(grupo_id)s, %(senior_id)s, %(rol_en_grupo)s)
        returning grupo_senior_id, grupo_id, senior_id, rol_en_grupo, fecha_alta;
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
        if "uq_grupo_senior_unique" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Este senior ya está en el grupo")
        if "fk_grupo_senior_grupo" in message or "foreign key" in message.lower():
            raise HTTPException(status_code=404, detail="Grupo no encontrado")
        if "fk_grupo_senior_senior" in message or "foreign key" in message.lower():
            raise HTTPException(status_code=404, detail="Senior no encontrado")
        raise


@router.patch(
    "/{grupo_senior_id}",
    response_model=GrupoSeniorOut,
    dependencies=[Depends(require_write)],
)
def update_grupo_senior(grupo_senior_id: int, payload: GrupoSeniorUpdate):
    """Actualizar el rol de un senior en un grupo"""
    data = payload.model_dump(exclude_unset=True)
    if not data:
        sql = """
            select grupo_senior_id, grupo_id, senior_id, rol_en_grupo, fecha_alta
            from grupo_senior
            where grupo_senior_id = %(id)s;
        """
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {"id": grupo_senior_id})
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Relación no encontrada")
                return _row_to_grupo_senior(row)

    set_parts = []
    params = {"grupo_senior_id": grupo_senior_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update grupo_senior
        set {set_sql}
        where grupo_senior_id = %(grupo_senior_id)s
        returning grupo_senior_id, grupo_id, senior_id, rol_en_grupo, fecha_alta;
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


@router.delete("/{grupo_senior_id}", status_code=204, dependencies=[Depends(require_write)])
def delete_grupo_senior(grupo_senior_id: int):
    """Remover un senior de un grupo"""
    sql = "delete from grupo_senior where grupo_senior_id = %(id)s;"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": grupo_senior_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Relación no encontrada")
            conn.commit()

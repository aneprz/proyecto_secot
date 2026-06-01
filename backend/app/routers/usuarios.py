from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from ..auth import hash_password, require_admin
from ..db import get_connection
from ..models import UsuarioCreate, UsuarioOut, UsuarioUpdate

router = APIRouter(prefix="/usuarios", tags=["usuarios"], dependencies=[Depends(require_admin)])


def _row_to_usuario(row) -> UsuarioOut:
    return UsuarioOut(**row)


@router.get("", response_model=list[UsuarioOut])
def list_usuarios(
    include_inactive: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    where = "" if include_inactive else "where activo = true"
    sql = f"""
        select usuario_id, username, email, rol, senior_id, delegacion_id, activo, creado_en, ultimo_login_en
        from usuario
        {where}
        order by usuario_id asc
        limit %(limit)s offset %(offset)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"limit": limit, "offset": offset})
            return [_row_to_usuario(r) for r in cur.fetchall()]


@router.get("/{usuario_id}", response_model=UsuarioOut)
def get_usuario(usuario_id: int):
    sql = """
        select usuario_id, username, email, rol, senior_id, delegacion_id, activo, creado_en, ultimo_login_en
        from usuario
        where usuario_id = %(usuario_id)s;
    """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"usuario_id": usuario_id})
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            return _row_to_usuario(row)


@router.post("", response_model=UsuarioOut, status_code=201)
def create_usuario(payload: UsuarioCreate):
    data = payload.model_dump()
    plain_password = data.pop("password")
    data["password_hash"] = hash_password(plain_password)

    sql = """
        insert into usuario (username, email, password_hash, rol, senior_id, delegacion_id, activo)
        values (%(username)s, %(email)s, %(password_hash)s, %(rol)s, %(senior_id)s, %(delegacion_id)s, %(activo)s)
        returning usuario_id, username, email, rol, senior_id, delegacion_id, activo, creado_en, ultimo_login_en;
    """
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, data)
                row = cur.fetchone()
                conn.commit()
                return _row_to_usuario(row)
    except Exception as exc:
        message = str(exc)
        if (
            "uq_usuario_username" in message
            or "uq_usuario_email" in message
            or "duplicate key" in message
        ):
            raise HTTPException(status_code=409, detail="Username o email ya existe")
        raise


@router.patch("/{usuario_id}", response_model=UsuarioOut)
def update_usuario(usuario_id: int, payload: UsuarioUpdate):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_usuario(usuario_id)

    if "password" in data:
        password = data.pop("password")
        if password is not None:
            data["password_hash"] = hash_password(password)

    if not data:
        return get_usuario(usuario_id)

    set_parts = []
    params = {"usuario_id": usuario_id}
    for key, value in data.items():
        set_parts.append(f"{key} = %({key})s")
        params[key] = value

    set_sql = ", ".join(set_parts)
    sql = f"""
        update usuario
        set {set_sql}
        where usuario_id = %(usuario_id)s
        returning usuario_id, username, email, rol, senior_id, delegacion_id, activo, creado_en, ultimo_login_en;
    """
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Usuario no encontrado")
                conn.commit()
                return _row_to_usuario(row)
    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        if "uq_usuario_email" in message or "duplicate key" in message:
            raise HTTPException(status_code=409, detail="Email ya existe")
        raise


@router.delete("/{usuario_id}", status_code=204)
def delete_usuario(usuario_id: int, hard: bool = False):
    sql = (
        "delete from usuario where usuario_id = %(usuario_id)s;"
        if hard
        else "update usuario set activo = false where usuario_id = %(usuario_id)s;"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"usuario_id": usuario_id})
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            conn.commit()

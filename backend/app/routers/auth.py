from fastapi import APIRouter, HTTPException, status
from passlib.exc import UnknownHashError
from psycopg.rows import dict_row
from pydantic import BaseModel

from ..auth import create_access_token, verify_password
from ..db import get_connection
from ..settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _usuario_table_exists() -> bool:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("select to_regclass('usuario');")
                return cur.fetchone()[0] is not None
    except Exception:
        return False


def _count_usuarios() -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("select count(*) from usuario;")
            return int(cur.fetchone()[0])


def _login_admin(payload: LoginRequest) -> TokenResponse | None:
    if payload.username != settings.auth_username:
        return None

    if not settings.auth_password_hash:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth no configurado (falta AUTH_PASSWORD_HASH)",
        )

    try:
        if verify_password(payload.password, settings.auth_password_hash):
            token = create_access_token(subject=payload.username, extra_claims={"rol": "admin"})
            return TokenResponse(access_token=token)
    except UnknownHashError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth no configurado (AUTH_PASSWORD_HASH inválido)",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
    )


def _login_database(payload: LoginRequest) -> str | None:
    sql = """
            select
                u.usuario_id,
                u.username,
                u.password_hash,
                u.rol,
                u.delegacion_id,
                d.nombre as delegacion_nombre
            from usuario u
            left join delegacion d on u.delegacion_id = d.delegacion_id
            where u.username = %(username)s and u.activo = true;
        """
    with get_connection(row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"username": payload.username})
            row = cur.fetchone()
            try:
                valid = bool(row) and verify_password(payload.password, row["password_hash"])
            except UnknownHashError:
                valid = False
            if not valid:
                return None

            cur.execute(
                "update usuario set ultimo_login_en = now() where usuario_id = %(id)s;",
                {"id": row["usuario_id"]},
            )
            conn.commit()
            rol = row["rol"] or "read"
            if rol == "user":
                rol = "write"
            extra = {"rol": rol}
            if row.get("delegacion_id") is not None:
                extra["delegacion_id"] = int(row["delegacion_id"])
            if row.get("delegacion_nombre"):
                extra["delegacion_nombre"] = row["delegacion_nombre"]
            return create_access_token(subject=row["username"], extra_claims=extra)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    if payload.username == settings.auth_username:
        return _login_admin(payload)

    if _usuario_table_exists():
        token = _login_database(payload)
        if token is not None:
            return TokenResponse(access_token=token)

        if _count_usuarios() > 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
            )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

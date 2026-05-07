from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from psycopg.rows import dict_row
from passlib.exc import UnknownHashError

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


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    # Bootstrap admin por env (siempre permitido cuando está configurado).
    # Esto evita que un `password_hash` inválido en BD bloquee el acceso (p.ej. datos legacy).
    if payload.username == settings.auth_username:
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

    # Auth por BD (tabla `usuario`). Mantiene fallback a env para bootstrap/admin.
    if _usuario_table_exists():
        sql = """
            select usuario_id, username, password_hash, rol
            from usuario
            where username = %(username)s and activo = true;
        """
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {"username": payload.username})
                row = cur.fetchone()
                try:
                    valid = bool(row) and verify_password(payload.password, row["password_hash"])
                except UnknownHashError:
                    valid = False
                if valid:
                    cur.execute(
                        "update usuario set ultimo_login_en = now() where usuario_id = %(id)s;",
                        {"id": row["usuario_id"]},
                    )
                    conn.commit()
                    token = create_access_token(subject=row["username"], extra_claims={"rol": row["rol"]})
                    return TokenResponse(access_token=token)

        # Bootstrap: permite login por env SOLO si la tabla existe pero está vacía.
        # Así puedes entrar una vez, crear el primer usuario (admin) en BD y a partir de ahí
        # el login queda exclusivamente controlado por la tabla `usuario`.
        if _count_usuarios() > 0:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=True)

ALGORITHM = "HS256"

# Roles y sus permisos
ROLE_HIERARCHY = {
    "read": 1,  # Solo lectura
    "write": 2,  # Lectura y escritura
    "admin": 3,  # Administrador completo
}


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def create_access_token(subject: str, *, extra_claims: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.auth_access_token_expire_minutes)
    payload = {"sub": subject, "iat": int(now.timestamp()), "exp": int(expires.timestamp())}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.auth_secret_key, algorithm=ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.auth_secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_username(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    payload = _decode_token(credentials.credentials)
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return str(username)


def _get_user_role(username: str) -> str:
    """Obtener el rol del usuario desde BD o settings de bootstrap"""
    if settings.auth_password_hash and username == settings.auth_username:
        return "admin"

    from psycopg.rows import dict_row

    from .db import get_connection

    sql = "select rol from usuario where username = %(username)s and activo = true;"
    try:
        with get_connection(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {"username": username})
                row = cur.fetchone()
                if row:
                    role = row.get("rol") or "read"
                    # Compatibilidad con datos legacy (p.ej. "user").
                    return role if role in ROLE_HIERARCHY else "read"
    except Exception:
        pass
    return "read"


def require_auth(username: str = Depends(get_current_username)) -> str:
    """Cualquier usuario autenticado"""
    return username


def require_read(username: str = Depends(get_current_username)) -> str:
    """Requiere al menos rol 'read'"""
    role = _get_user_role(username)
    if ROLE_HIERARCHY.get(role, 0) < ROLE_HIERARCHY["read"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes para lectura",
        )
    return username


def require_write(username: str = Depends(get_current_username)) -> str:
    """Requiere al menos rol 'write'"""
    role = _get_user_role(username)
    if ROLE_HIERARCHY.get(role, 0) < ROLE_HIERARCHY["write"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes para escritura",
        )
    return username


def require_admin(username: str = Depends(get_current_username)) -> str:
    """Requiere rol 'admin'"""
    role = _get_user_role(username)
    if ROLE_HIERARCHY.get(role, 0) < ROLE_HIERARCHY["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere permisos de administrador",
        )
    return username

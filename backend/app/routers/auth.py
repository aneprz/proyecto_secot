from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ..auth import create_access_token, verify_password
from ..settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    if payload.username != settings.auth_username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if not settings.auth_password_hash:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth no configurado (falta AUTH_PASSWORD_HASH)",
        )

    if not verify_password(payload.password, settings.auth_password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    token = create_access_token(subject=payload.username)
    return TokenResponse(access_token=token)


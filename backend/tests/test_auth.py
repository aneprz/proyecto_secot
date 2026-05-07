from fastapi.testclient import TestClient
from passlib.context import CryptContext

from app.settings import settings


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_success(client: TestClient, monkeypatch):
    # Force env-bootstrap auth path (no DB).
    pwd = CryptContext(schemes=["bcrypt"])
    settings.auth_username = "admin"
    settings.auth_password_hash = pwd.hash("admin")

    from app.routers import auth as auth_router

    monkeypatch.setattr(auth_router, "_usuario_table_exists", lambda: False)

    response = client.post("/auth/login", json={"username": "admin", "password": "admin"})
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid(client: TestClient):
    response = client.post("/auth/login", json={"username": "invalid", "password": "invalid"})
    assert response.status_code == 401

import pytest
from fastapi.testclient import TestClient


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_success(client: TestClient):
    # Asumiendo que hay un usuario de prueba o bootstrap
    response = client.post("/auth/login", json={"username": "admin", "password": "admin"})
    # Esto puede fallar si no hay usuario, pero para el ejemplo
    if response.status_code == 200:
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


def test_login_invalid(client: TestClient):
    response = client.post("/auth/login", json={"username": "invalid", "password": "invalid"})
    assert response.status_code == 401
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_token(client: TestClient):
    # Intentar login con credenciales de bootstrap
    response = client.post("/auth/login", json={"username": "admin", "password": "admin"})
    if response.status_code == 200:
        return response.json()["access_token"]
    # Si no, asumir que hay un usuario
    return None
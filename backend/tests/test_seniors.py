import pytest
from fastapi.testclient import TestClient


def test_list_seniors(client: TestClient, auth_token: str):
    headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
    response = client.get("/seniors", headers=headers)
    if auth_token:
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    else:
        assert response.status_code == 401


def test_create_senior(client: TestClient, auth_token: str):
    if not auth_token:
        pytest.skip("No auth token available")
    headers = {"Authorization": f"Bearer {auth_token}"}
    data = {
        "nombre": "Test Senior",
        "apellidos": "Apellido Test",
        "email": "test@example.com",
        "activo": True
    }
    response = client.post("/seniors", json=data, headers=headers)
    assert response.status_code == 201
    result = response.json()
    assert result["nombre"] == data["nombre"]
    assert "senior_id" in result
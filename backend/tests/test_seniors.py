from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pytest
from fastapi.testclient import TestClient


@dataclass
class _SeniorRow:
    senior_id: int
    nombre: str
    apellidos: str
    email: str | None = None
    movil: str | None = None
    fecha_alta: date | None = None
    activo: bool = True


@dataclass
class _FakeDb:
    next_id: int = 1
    seniors: dict[int, _SeniorRow] = field(default_factory=dict)


class _FakeCursor:
    def __init__(self, db: _FakeDb):
        self._db = db
        self._result_one = None
        self._result_all = []
        self.rowcount = 0

    def execute(self, sql: str, params: dict | None = None):
        params = params or {}
        normalized = " ".join(sql.split()).lower()

        if (
            normalized.startswith("select")
            and "from senior" in normalized
            and "where senior_id" not in normalized
        ):
            # list_seniors
            rows = []
            for row in sorted(self._db.seniors.values(), key=lambda r: r.senior_id):
                if "where activo = true" in normalized and not row.activo:
                    continue
                rows.append(row.__dict__.copy())
            self._result_all = rows
            self._result_one = None
            self.rowcount = len(rows)
            return

        if (
            normalized.startswith("select")
            and "from senior" in normalized
            and "where senior_id" in normalized
        ):
            senior_id = int(params["senior_id"])
            row = self._db.seniors.get(senior_id)
            self._result_one = row.__dict__.copy() if row else None
            self._result_all = []
            self.rowcount = 1 if row else 0
            return

        if normalized.startswith("insert into senior"):
            senior_id = self._db.next_id
            self._db.next_id += 1
            row = _SeniorRow(
                senior_id=senior_id,
                nombre=params["nombre"],
                apellidos=params["apellidos"],
                email=params.get("email"),
                movil=params.get("movil"),
                fecha_alta=params.get("fecha_alta"),
                activo=bool(params.get("activo", True)),
            )
            self._db.seniors[senior_id] = row
            self._result_one = row.__dict__.copy()
            self._result_all = []
            self.rowcount = 1
            return

        if normalized.startswith("update senior set") and "returning" in normalized:
            senior_id = int(params["senior_id"])
            row = self._db.seniors.get(senior_id)
            if not row:
                self._result_one = None
                self.rowcount = 0
                return
            for key, value in params.items():
                if key == "senior_id":
                    continue
                setattr(row, key, value)
            self._result_one = row.__dict__.copy()
            self.rowcount = 1
            return

        if normalized.startswith("delete from senior"):
            senior_id = int(params["senior_id"])
            if senior_id in self._db.seniors:
                del self._db.seniors[senior_id]
                self.rowcount = 1
            else:
                self.rowcount = 0
            self._result_one = None
            self._result_all = []
            return

        if normalized.startswith("update senior set activo = false"):
            senior_id = int(params["senior_id"])
            row = self._db.seniors.get(senior_id)
            if row:
                row.activo = False
                self.rowcount = 1
            else:
                self.rowcount = 0
            self._result_one = None
            self._result_all = []
            return

        raise AssertionError(f"SQL no esperado en test: {sql!r}")

    def fetchone(self):
        return self._result_one

    def fetchall(self):
        return self._result_all

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class _FakeConn:
    def __init__(self, db: _FakeDb):
        self._db = db

    def cursor(self):
        return _FakeCursor(self._db)

    def commit(self):
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def _fake_get_connection_factory(db: _FakeDb):
    def _fake_get_connection(*, row_factory=None):
        return _FakeConn(db)

    return _fake_get_connection


@pytest.fixture
def fake_db(monkeypatch):
    from app.routers import seniors as seniors_router

    db = _FakeDb()
    monkeypatch.setattr(seniors_router, "get_connection", _fake_get_connection_factory(db))
    return db


def test_seniors_crud(client: TestClient, auth_token: str, fake_db: _FakeDb):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Create
    payload = {
        "nombre": "Test",
        "apellidos": "Senior",
        "email": "test@example.com",
        "movil": "600000000",
        "fecha_alta": "2026-01-01",
        "activo": True,
    }
    res = client.post("/seniors", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    created = res.json()
    assert created["nombre"] == "Test"
    senior_id = created["senior_id"]

    # Read
    res = client.get(f"/seniors/{senior_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["email"] == "test@example.com"

    # Update
    res = client.patch(f"/seniors/{senior_id}", json={"movil": "600000001"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["movil"] == "600000001"

    # List
    res = client.get("/seniors", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 1

    # Hard delete
    res = client.delete(f"/seniors/{senior_id}?hard=true", headers=headers)
    assert res.status_code == 204, res.text

    # After hard delete, GET returns 404
    res = client.get(f"/seniors/{senior_id}", headers=headers)
    assert res.status_code == 404, res.text

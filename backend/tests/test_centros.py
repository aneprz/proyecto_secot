from __future__ import annotations

from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient


@dataclass
class _CentroRow:
    centro_id: int
    nombre: str
    tipo: str | None = None
    direccion: str | None = None
    municipio: str | None = None
    activo: bool = True


@dataclass
class _FakeDb:
    next_id: int = 1
    centros: dict[int, _CentroRow] = field(default_factory=dict)


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
            and "from centro" in normalized
            and "where centro_id" not in normalized
        ):
            rows = []
            for row in sorted(self._db.centros.values(), key=lambda r: r.centro_id):
                if "where activo = true" in normalized and not row.activo:
                    continue
                rows.append(row.__dict__.copy())
            self._result_all = rows
            self._result_one = None
            self.rowcount = len(rows)
            return

        if normalized.startswith("select") and "from centro" in normalized and "where centro_id" in normalized:
            centro_id = int(params["centro_id"])
            row = self._db.centros.get(centro_id)
            self._result_one = row.__dict__.copy() if row else None
            self._result_all = []
            self.rowcount = 1 if row else 0
            return

        if normalized.startswith("insert into centro"):
            centro_id = self._db.next_id
            self._db.next_id += 1
            row = _CentroRow(
                centro_id=centro_id,
                nombre=params["nombre"],
                tipo=params.get("tipo"),
                direccion=params.get("direccion"),
                municipio=params.get("municipio"),
                activo=bool(params.get("activo", True)),
            )
            self._db.centros[centro_id] = row
            self._result_one = row.__dict__.copy()
            self._result_all = []
            self.rowcount = 1
            return

        if normalized.startswith("update centro set") and "returning" in normalized:
            centro_id = int(params["centro_id"])
            row = self._db.centros.get(centro_id)
            if not row:
                self._result_one = None
                self.rowcount = 0
                return
            for key, value in params.items():
                if key == "centro_id":
                    continue
                setattr(row, key, value)
            self._result_one = row.__dict__.copy()
            self.rowcount = 1
            return

        if normalized.startswith("delete from centro"):
            centro_id = int(params["centro_id"])
            if centro_id in self._db.centros:
                del self._db.centros[centro_id]
                self.rowcount = 1
            else:
                self.rowcount = 0
            self._result_one = None
            self._result_all = []
            return

        if normalized.startswith("update centro set activo = false"):
            centro_id = int(params["centro_id"])
            row = self._db.centros.get(centro_id)
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
    from app.routers import centros as centros_router

    db = _FakeDb()
    monkeypatch.setattr(centros_router, "get_connection", _fake_get_connection_factory(db))
    return db


def test_centros_crud(client: TestClient, auth_token: str, fake_db: _FakeDb):
    headers = {"Authorization": f"Bearer {auth_token}"}

    payload = {
        "nombre": "Centro 1",
        "tipo": "Residencia",
        "direccion": "Calle 1",
        "municipio": "Bilbao",
        "activo": True,
    }
    res = client.post("/centros", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    centro_id = res.json()["centro_id"]

    res = client.get(f"/centros/{centro_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["municipio"] == "Bilbao"

    res = client.patch(f"/centros/{centro_id}", json={"municipio": "Getxo"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["municipio"] == "Getxo"

    res = client.get("/centros", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 1

    res = client.delete(f"/centros/{centro_id}", headers=headers)
    assert res.status_code == 204, res.text

    res = client.get("/centros", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 0


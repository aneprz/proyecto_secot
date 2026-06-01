from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pytest
from fastapi.testclient import TestClient


@dataclass
class _ActividadSeniorRow:
    actividad_senior_id: int
    actividad_id: int
    senior_id: int
    rol_en_actividad: str | None = None
    fecha_alta: date | None = None
    fecha_baja: date | None = None
    activo: bool = True


@dataclass
class _FakeDb:
    next_id: int = 1
    rows: dict[int, _ActividadSeniorRow] = field(default_factory=dict)


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
            and "from actividad_senior" in normalized
            and "where actividad_senior_id" not in normalized
        ):
            rows = []
            for row in sorted(self._db.rows.values(), key=lambda r: r.actividad_senior_id):
                if "asr.activo = true" in normalized and not row.activo:
                    continue
                if "asr.actividad_id" in normalized and params.get("actividad_id") is not None:
                    if row.actividad_id != int(params["actividad_id"]):
                        continue
                if "asr.senior_id" in normalized and params.get("senior_id") is not None:
                    if row.senior_id != int(params["senior_id"]):
                        continue
                rows.append(
                    {
                        "actividad_senior_id": row.actividad_senior_id,
                        "actividad_id": row.actividad_id,
                        "senior_id": row.senior_id,
                        "rol_en_actividad": row.rol_en_actividad,
                        "fecha_alta": row.fecha_alta,
                        "fecha_baja": row.fecha_baja,
                        "activo": row.activo,
                    }
                )
            self._result_all = rows
            self._result_one = None
            self.rowcount = len(rows)
            return

        if (
            normalized.startswith("select")
            and "from actividad_senior" in normalized
            and "where actividad_senior_id" in normalized
        ):
            row_id = int(params["id"])
            row = self._db.rows.get(row_id)
            self._result_one = (
                {
                    "actividad_senior_id": row.actividad_senior_id,
                    "actividad_id": row.actividad_id,
                    "senior_id": row.senior_id,
                    "rol_en_actividad": row.rol_en_actividad,
                    "fecha_alta": row.fecha_alta,
                    "fecha_baja": row.fecha_baja,
                    "activo": row.activo,
                }
                if row
                else None
            )
            self._result_all = []
            self.rowcount = 1 if row else 0
            return

        if normalized.startswith("insert into actividad_senior"):
            row_id = self._db.next_id
            self._db.next_id += 1
            row = _ActividadSeniorRow(
                actividad_senior_id=row_id,
                actividad_id=int(params["actividad_id"]),
                senior_id=int(params["senior_id"]),
                rol_en_actividad=params.get("rol_en_actividad"),
                fecha_alta=params.get("fecha_alta"),
                fecha_baja=params.get("fecha_baja"),
                activo=bool(params.get("activo", True)),
            )
            self._db.rows[row_id] = row
            self._result_one = {
                "actividad_senior_id": row.actividad_senior_id,
                "actividad_id": row.actividad_id,
                "senior_id": row.senior_id,
                "rol_en_actividad": row.rol_en_actividad,
                "fecha_alta": row.fecha_alta,
                "fecha_baja": row.fecha_baja,
                "activo": row.activo,
            }
            self._result_all = []
            self.rowcount = 1
            return

        if normalized.startswith("update actividad_senior set") and "returning" in normalized:
            row_id = int(params["actividad_senior_id"])
            row = self._db.rows.get(row_id)
            if not row:
                self._result_one = None
                self.rowcount = 0
                return
            for key, value in params.items():
                if key == "actividad_senior_id":
                    continue
                setattr(row, key, value)
            self._result_one = {
                "actividad_senior_id": row.actividad_senior_id,
                "actividad_id": row.actividad_id,
                "senior_id": row.senior_id,
                "rol_en_actividad": row.rol_en_actividad,
                "fecha_alta": row.fecha_alta,
                "fecha_baja": row.fecha_baja,
                "activo": row.activo,
            }
            self.rowcount = 1
            return

        if normalized.startswith("update actividad_senior set activo = false"):
            row_id = int(params["id"])
            row = self._db.rows.get(row_id)
            if not row:
                self.rowcount = 0
                return
            row.activo = False
            if row.fecha_baja is None:
                row.fecha_baja = date.today()
            self.rowcount = 1
            return

        if normalized.startswith("delete from actividad_senior"):
            row_id = int(params["id"])
            if row_id not in self._db.rows:
                self.rowcount = 0
                return
            del self._db.rows[row_id]
            self.rowcount = 1
            return

        raise AssertionError(f"SQL no soportado en fake DB: {sql}")

    def fetchone(self):
        return self._result_one

    def fetchall(self):
        return list(self._result_all)

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
    from app.routers import actividad_seniors as router_module

    db = _FakeDb()
    monkeypatch.setattr(router_module, "get_connection", _fake_get_connection_factory(db))
    return db


def test_actividad_seniors_crud(client: TestClient, auth_token: str, fake_db: _FakeDb):
    headers = {"Authorization": f"Bearer {auth_token}"}

    payload = {
        "actividad_id": 10,
        "senior_id": 20,
        "rol_en_actividad": "Ponente",
        "activo": True,
    }
    res = client.post("/actividades-seniors", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    row_id = res.json()["actividad_senior_id"]

    res = client.get(f"/actividades-seniors/{row_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["rol_en_actividad"] == "Ponente"

    res = client.get("/actividades-seniors?actividad_id=10", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 1

    res = client.patch(
        f"/actividades-seniors/{row_id}",
        json={"rol_en_actividad": "Coordinador"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["rol_en_actividad"] == "Coordinador"

    res = client.delete(f"/actividades-seniors/{row_id}", headers=headers)
    assert res.status_code == 204, res.text

    res = client.get("/actividades-seniors", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 0

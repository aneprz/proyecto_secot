from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pytest
from fastapi.testclient import TestClient


@dataclass
class _ActividadRow:
    actividad_id: int
    grupo_id: int
    centro_id: int
    titulo_actividad: str
    descripcion: str | None = None
    tipo_actividad: str | None = None
    senior_responsable_actividad_id: int | None = None
    estado_actividad: str | None = None
    fecha_inicio_prevista: date | None = None
    fecha_fin_prevista: date | None = None
    activo: bool = True


@dataclass
class _FakeDb:
    next_id: int = 1
    actividades: dict[int, _ActividadRow] = field(default_factory=dict)


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
            and "from actividad" in normalized
            and "where actividad_id" not in normalized
        ):
            rows = []
            for row in sorted(self._db.actividades.values(), key=lambda r: r.actividad_id):
                if "where activo = true" in normalized and not row.activo:
                    continue
                rows.append(
                    {
                        "actividad_id": row.actividad_id,
                        "grupo_id": row.grupo_id,
                        "centro_id": row.centro_id,
                        "titulo_actividad": row.titulo_actividad,
                        "descripcion": row.descripcion,
                        "tipo_actividad": row.tipo_actividad,
                        "senior_responsable_actividad_id": row.senior_responsable_actividad_id,
                        "estado_actividad": row.estado_actividad,
                        "fecha_inicio_prevista": row.fecha_inicio_prevista,
                        "fecha_fin_prevista": row.fecha_fin_prevista,
                        "activo": row.activo,
                    }
                )
            self._result_all = rows
            self._result_one = None
            self.rowcount = len(rows)
            return

        if (
            normalized.startswith("select")
            and "from actividad" in normalized
            and "where actividad_id" in normalized
        ):
            actividad_id = int(params["actividad_id"])
            row = self._db.actividades.get(actividad_id)
            self._result_one = (
                {
                    "actividad_id": row.actividad_id,
                    "grupo_id": row.grupo_id,
                    "centro_id": row.centro_id,
                    "titulo_actividad": row.titulo_actividad,
                    "descripcion": row.descripcion,
                    "tipo_actividad": row.tipo_actividad,
                    "senior_responsable_actividad_id": row.senior_responsable_actividad_id,
                    "estado_actividad": row.estado_actividad,
                    "fecha_inicio_prevista": row.fecha_inicio_prevista,
                    "fecha_fin_prevista": row.fecha_fin_prevista,
                    "activo": row.activo,
                }
                if row
                else None
            )
            self._result_all = []
            self.rowcount = 1 if row else 0
            return

        if normalized.startswith("insert into actividad"):
            actividad_id = self._db.next_id
            self._db.next_id += 1
            row = _ActividadRow(
                actividad_id=actividad_id,
                grupo_id=int(params["grupo_id"]),
                centro_id=int(params["centro_id"]),
                titulo_actividad=params["titulo_actividad"],
                descripcion=params.get("descripcion"),
                tipo_actividad=params.get("tipo_actividad"),
                senior_responsable_actividad_id=params.get("senior_responsable_actividad_id"),
                estado_actividad=params.get("estado_actividad"),
                fecha_inicio_prevista=params.get("fecha_inicio_prevista"),
                fecha_fin_prevista=params.get("fecha_fin_prevista"),
                activo=bool(params.get("activo", True)),
            )
            self._db.actividades[actividad_id] = row
            self._result_one = {
                "actividad_id": row.actividad_id,
                "grupo_id": row.grupo_id,
                "centro_id": row.centro_id,
                "titulo_actividad": row.titulo_actividad,
                "descripcion": row.descripcion,
                "tipo_actividad": row.tipo_actividad,
                "senior_responsable_actividad_id": row.senior_responsable_actividad_id,
                "estado_actividad": row.estado_actividad,
                "fecha_inicio_prevista": row.fecha_inicio_prevista,
                "fecha_fin_prevista": row.fecha_fin_prevista,
                "activo": row.activo,
            }
            self._result_all = []
            self.rowcount = 1
            return

        if normalized.startswith("update actividad set") and "returning" in normalized:
            actividad_id = int(params["actividad_id"])
            row = self._db.actividades.get(actividad_id)
            if not row:
                self._result_one = None
                self.rowcount = 0
                return
            for key, value in params.items():
                if key == "actividad_id":
                    continue
                setattr(row, key, value)
            self._result_one = {
                "actividad_id": row.actividad_id,
                "grupo_id": row.grupo_id,
                "centro_id": row.centro_id,
                "titulo_actividad": row.titulo_actividad,
                "descripcion": row.descripcion,
                "tipo_actividad": row.tipo_actividad,
                "senior_responsable_actividad_id": row.senior_responsable_actividad_id,
                "estado_actividad": row.estado_actividad,
                "fecha_inicio_prevista": row.fecha_inicio_prevista,
                "fecha_fin_prevista": row.fecha_fin_prevista,
                "activo": row.activo,
            }
            self.rowcount = 1
            return

        if normalized.startswith("update actividad set activo = false"):
            actividad_id = int(params["actividad_id"])
            row = self._db.actividades.get(actividad_id)
            if not row:
                self.rowcount = 0
                return
            row.activo = False
            self.rowcount = 1
            return

        if normalized.startswith("delete from actividad"):
            actividad_id = int(params["actividad_id"])
            if actividad_id not in self._db.actividades:
                self.rowcount = 0
                return
            del self._db.actividades[actividad_id]
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
    from app.routers import actividades as actividades_router

    db = _FakeDb()
    monkeypatch.setattr(
        actividades_router, "get_connection", _fake_get_connection_factory(db)
    )
    return db


def test_actividades_crud(client: TestClient, auth_token: str, fake_db: _FakeDb):
    headers = {"Authorization": f"Bearer {auth_token}"}

    payload = {
        "grupo_id": 1,
        "centro_id": 2,
        "titulo_actividad": "Taller",
        "descripcion": "Descripción",
        "tipo_actividad": "Formación",
        "estado_actividad": "Planificada",
        "activo": True,
    }
    res = client.post("/actividades", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    actividad_id = res.json()["actividad_id"]

    res = client.get(f"/actividades/{actividad_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["titulo_actividad"] == "Taller"
    assert res.json()["descripcion"] == "Descripción"

    res = client.patch(
        f"/actividades/{actividad_id}",
        json={"descripcion": "X", "fecha_inicio_prevista": "2026-01-01"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["descripcion"] == "X"
    assert res.json()["fecha_inicio_prevista"] == "2026-01-01"

    res = client.get("/actividades", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 1

    res = client.delete(f"/actividades/{actividad_id}", headers=headers)
    assert res.status_code == 204, res.text

    res = client.get("/actividades", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 0


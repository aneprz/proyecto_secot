from __future__ import annotations

from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient


@dataclass
class _GrupoRow:
    grupo_id: int
    nombre_grupo: str
    descripcion: str | None = None
    color_hex: str | None = None
    canal_teams: str | None = None
    responsable_senior_id: int | None = None
    activo: bool = True


@dataclass
class _FakeDb:
    next_id: int = 1
    grupos: dict[int, _GrupoRow] = field(default_factory=dict)


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
            and "from grupo" in normalized
            and "where grupo_id" not in normalized
        ):
            rows = []
            for row in sorted(self._db.grupos.values(), key=lambda r: r.grupo_id):
                if "where activo = true" in normalized and not row.activo:
                    continue
                rows.append(
                    {
                        "grupo_id": row.grupo_id,
                        "nombre_grupo": row.nombre_grupo,
                        "descripcion": row.descripcion,
                        "color_hex": row.color_hex,
                        "canal_teams": row.canal_teams,
                        "responsable_senior_id": row.responsable_senior_id,
                        "activo": row.activo,
                    }
                )
            self._result_all = rows
            self._result_one = None
            self.rowcount = len(rows)
            return

        if (
            normalized.startswith("select")
            and "from grupo" in normalized
            and "where grupo_id" in normalized
        ):
            grupo_id = int(params["grupo_id"])
            row = self._db.grupos.get(grupo_id)
            self._result_one = (
                {
                    "grupo_id": row.grupo_id,
                    "nombre_grupo": row.nombre_grupo,
                    "descripcion": row.descripcion,
                    "color_hex": row.color_hex,
                    "canal_teams": row.canal_teams,
                    "responsable_senior_id": row.responsable_senior_id,
                    "activo": row.activo,
                }
                if row
                else None
            )
            self._result_all = []
            self.rowcount = 1 if row else 0
            return

        if normalized.startswith("insert into grupo"):
            grupo_id = self._db.next_id
            self._db.next_id += 1
            row = _GrupoRow(
                grupo_id=grupo_id,
                nombre_grupo=params["nombre_grupo"],
                descripcion=params.get("descripcion"),
                color_hex=params.get("color_hex"),
                canal_teams=params.get("canal_teams"),
                responsable_senior_id=params.get("responsable_senior_id"),
                activo=bool(params.get("activo", True)),
            )
            self._db.grupos[grupo_id] = row
            self._result_one = {
                "grupo_id": row.grupo_id,
                "nombre_grupo": row.nombre_grupo,
                "descripcion": row.descripcion,
                "color_hex": row.color_hex,
                "canal_teams": row.canal_teams,
                "responsable_senior_id": row.responsable_senior_id,
                "activo": row.activo,
            }
            self._result_all = []
            self.rowcount = 1
            return

        if normalized.startswith("update grupo set") and "returning" in normalized:
            grupo_id = int(params["grupo_id"])
            row = self._db.grupos.get(grupo_id)
            if not row:
                self._result_one = None
                self.rowcount = 0
                return
            for key, value in params.items():
                if key == "grupo_id":
                    continue
                setattr(row, key, value)
            self._result_one = {
                "grupo_id": row.grupo_id,
                "nombre_grupo": row.nombre_grupo,
                "descripcion": row.descripcion,
                "color_hex": row.color_hex,
                "canal_teams": row.canal_teams,
                "responsable_senior_id": row.responsable_senior_id,
                "activo": row.activo,
            }
            self.rowcount = 1
            return

        if normalized.startswith("delete from grupo"):
            grupo_id = int(params["grupo_id"])
            if grupo_id in self._db.grupos:
                del self._db.grupos[grupo_id]
                self.rowcount = 1
            else:
                self.rowcount = 0
            self._result_one = None
            self._result_all = []
            return

        if normalized.startswith("update grupo set activo = false"):
            grupo_id = int(params["grupo_id"])
            row = self._db.grupos.get(grupo_id)
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
    from app.routers import grupos as grupos_router

    db = _FakeDb()
    monkeypatch.setattr(grupos_router, "get_connection", _fake_get_connection_factory(db))
    return db


def test_grupos_crud(client: TestClient, auth_token: str, fake_db: _FakeDb):
    headers = {"Authorization": f"Bearer {auth_token}"}

    payload = {"nombre_grupo": "Grupo A", "descripcion": "Desc", "activo": True}
    res = client.post("/grupos", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    grupo_id = res.json()["grupo_id"]

    res = client.get(f"/grupos/{grupo_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["nombre_grupo"] == "Grupo A"

    res = client.patch(f"/grupos/{grupo_id}", json={"descripcion": "X"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["descripcion"] == "X"

    res = client.get("/grupos", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 1

    res = client.delete(f"/grupos/{grupo_id}", headers=headers)
    assert res.status_code == 204, res.text

    # Inactivo no aparece por defecto
    res = client.get("/grupos", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 0

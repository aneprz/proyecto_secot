from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pytest
from fastapi.testclient import TestClient


@dataclass
class _SesionRow:
    sesion_id: int
    actividad_id: int
    grupo_id: int
    centro_id: int
    fecha: date
    hora_inicio: str | None = None
    hora_fin: str | None = None
    duracion_horas: float | None = None
    titulo_sesion: str | None = None
    ubicacion: str | None = None
    estado_sesion: str | None = None
    observaciones: str | None = None
    es_visible_calendario: bool = True
    activo: bool = True


@dataclass
class _FakeDb:
    next_id: int = 1
    sesiones: dict[int, _SesionRow] = field(default_factory=dict)


class _FakeCursor:
    def __init__(self, db: _FakeDb):
        self._db = db
        self._result_one = None
        self._result_all = []
        self.rowcount = 0

    def execute(self, sql: str, params: dict | None = None):
        params = params or {}
        normalized = " ".join(sql.split()).lower()

        if normalized.startswith("select") and "from sesion s" in normalized and "where sesion_id" not in normalized:
            rows = []
            for row in sorted(self._db.sesiones.values(), key=lambda r: r.sesion_id):
                if "s.activo = true" in normalized and not row.activo:
                    continue
                if "s.actividad_id" in normalized and params.get("actividad_id") is not None:
                    if row.actividad_id != int(params["actividad_id"]):
                        continue
                if "s.grupo_id" in normalized and params.get("grupo_id") is not None:
                    if row.grupo_id != int(params["grupo_id"]):
                        continue
                if "s.centro_id" in normalized and params.get("centro_id") is not None:
                    if row.centro_id != int(params["centro_id"]):
                        continue
                rows.append(
                    {
                        "sesion_id": row.sesion_id,
                        "actividad_id": row.actividad_id,
                        "grupo_id": row.grupo_id,
                        "centro_id": row.centro_id,
                        "fecha": row.fecha,
                        "hora_inicio": row.hora_inicio,
                        "hora_fin": row.hora_fin,
                        "duracion_horas": row.duracion_horas,
                        "titulo_sesion": row.titulo_sesion,
                        "ubicacion": row.ubicacion,
                        "estado_sesion": row.estado_sesion,
                        "observaciones": row.observaciones,
                        "es_visible_calendario": row.es_visible_calendario,
                        "activo": row.activo,
                    }
                )
            self._result_all = rows
            self._result_one = None
            self.rowcount = len(rows)
            return

        if normalized.startswith("select") and "from sesion" in normalized and "where sesion_id" in normalized:
            sesion_id = int(params["sesion_id"])
            row = self._db.sesiones.get(sesion_id)
            self._result_one = (
                {
                    "sesion_id": row.sesion_id,
                    "actividad_id": row.actividad_id,
                    "grupo_id": row.grupo_id,
                    "centro_id": row.centro_id,
                    "fecha": row.fecha,
                    "hora_inicio": row.hora_inicio,
                    "hora_fin": row.hora_fin,
                    "duracion_horas": row.duracion_horas,
                    "titulo_sesion": row.titulo_sesion,
                    "ubicacion": row.ubicacion,
                    "estado_sesion": row.estado_sesion,
                    "observaciones": row.observaciones,
                    "es_visible_calendario": row.es_visible_calendario,
                    "activo": row.activo,
                }
                if row
                else None
            )
            self._result_all = []
            self.rowcount = 1 if row else 0
            return

        if normalized.startswith("insert into sesion"):
            sesion_id = self._db.next_id
            self._db.next_id += 1
            row = _SesionRow(
                sesion_id=sesion_id,
                actividad_id=int(params["actividad_id"]),
                grupo_id=int(params["grupo_id"]),
                centro_id=int(params["centro_id"]),
                fecha=params["fecha"],
                hora_inicio=params.get("hora_inicio"),
                hora_fin=params.get("hora_fin"),
                duracion_horas=params.get("duracion_horas"),
                titulo_sesion=params.get("titulo_sesion"),
                ubicacion=params.get("ubicacion"),
                estado_sesion=params.get("estado_sesion"),
                observaciones=params.get("observaciones"),
                es_visible_calendario=bool(params.get("es_visible_calendario", True)),
                activo=bool(params.get("activo", True)),
            )
            self._db.sesiones[sesion_id] = row
            self._result_one = {
                "sesion_id": row.sesion_id,
                "actividad_id": row.actividad_id,
                "grupo_id": row.grupo_id,
                "centro_id": row.centro_id,
                "fecha": row.fecha,
                "hora_inicio": row.hora_inicio,
                "hora_fin": row.hora_fin,
                "duracion_horas": row.duracion_horas,
                "titulo_sesion": row.titulo_sesion,
                "ubicacion": row.ubicacion,
                "estado_sesion": row.estado_sesion,
                "observaciones": row.observaciones,
                "es_visible_calendario": row.es_visible_calendario,
                "activo": row.activo,
            }
            self._result_all = []
            self.rowcount = 1
            return

        if normalized.startswith("update sesion set") and "returning" in normalized:
            sesion_id = int(params["sesion_id"])
            row = self._db.sesiones.get(sesion_id)
            if not row:
                self._result_one = None
                self.rowcount = 0
                return
            for key, value in params.items():
                if key == "sesion_id":
                    continue
                setattr(row, key, value)
            self._result_one = {
                "sesion_id": row.sesion_id,
                "actividad_id": row.actividad_id,
                "grupo_id": row.grupo_id,
                "centro_id": row.centro_id,
                "fecha": row.fecha,
                "hora_inicio": row.hora_inicio,
                "hora_fin": row.hora_fin,
                "duracion_horas": row.duracion_horas,
                "titulo_sesion": row.titulo_sesion,
                "ubicacion": row.ubicacion,
                "estado_sesion": row.estado_sesion,
                "observaciones": row.observaciones,
                "es_visible_calendario": row.es_visible_calendario,
                "activo": row.activo,
            }
            self.rowcount = 1
            return

        if normalized.startswith("update sesion set activo = false"):
            sesion_id = int(params["sesion_id"])
            row = self._db.sesiones.get(sesion_id)
            if not row:
                self.rowcount = 0
                return
            row.activo = False
            self.rowcount = 1
            return

        if normalized.startswith("delete from sesion"):
            sesion_id = int(params["sesion_id"])
            if sesion_id not in self._db.sesiones:
                self.rowcount = 0
                return
            del self._db.sesiones[sesion_id]
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
    from app.routers import sesiones as sesiones_router

    db = _FakeDb()
    monkeypatch.setattr(sesiones_router, "get_connection", _fake_get_connection_factory(db))
    return db


def test_sesiones_crud(client: TestClient, auth_token: str, fake_db: _FakeDb):
    headers = {"Authorization": f"Bearer {auth_token}"}

    payload = {
        "actividad_id": 1,
        "grupo_id": 2,
        "centro_id": 3,
        "fecha": "2026-01-02",
        "hora_inicio": "10:00:00",
        "hora_fin": "12:00:00",
        "duracion_horas": 2.0,
        "titulo_sesion": "Sesión 1",
        "ubicacion": "Sala A",
        "estado_sesion": "Planificada",
        "observaciones": "Obs",
        "es_visible_calendario": True,
        "activo": True,
    }
    res = client.post("/sesiones", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    sesion_id = res.json()["sesion_id"]

    res = client.get(f"/sesiones/{sesion_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["titulo_sesion"] == "Sesión 1"

    res = client.patch(f"/sesiones/{sesion_id}", json={"ubicacion": "Sala B"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["ubicacion"] == "Sala B"

    res = client.get("/sesiones?actividad_id=1", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 1

    res = client.delete(f"/sesiones/{sesion_id}", headers=headers)
    assert res.status_code == 204, res.text

    res = client.get("/sesiones", headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()) == 0


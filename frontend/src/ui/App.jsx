import React, { useEffect, useMemo, useState } from "react";

import { getAccessToken, login, logout } from "../api/auth.js";
import {
  createSenior,
  deleteSenior,
  listSeniors,
  updateSenior,
} from "../api/seniors.js";

export default function App() {
  const [token, setToken] = useState(() => getAccessToken());
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);

  const emptyForm = useMemo(
    () => ({
      nombre: "",
      apellidos: "",
      email: "",
      movil: "",
      fecha_alta: "",
      activo: true,
    }),
    []
  );
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await listSeniors({ includeInactive });
      setItems(data);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive, token]);

  async function onLoginSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ username: loginUsername.trim(), password: loginPassword });
      setToken(getAccessToken());
      setLoginPassword("");
    } catch (e2) {
      setError(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  }

  function onLogout() {
    logout();
    setToken("");
    setItems([]);
    setEditingId(null);
    setForm(emptyForm);
  }

  function onChange(e) {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(item) {
    setEditingId(item.senior_id);
    setForm({
      nombre: item.nombre ?? "",
      apellidos: item.apellidos ?? "",
      email: item.email ?? "",
      movil: item.movil ?? "",
      fecha_alta: item.fecha_alta ?? "",
      activo: Boolean(item.activo),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.trim() || null,
        movil: form.movil.trim() || null,
        fecha_alta: form.fecha_alta || null,
        activo: Boolean(form.activo),
      };
      if (editingId) {
        await updateSenior(editingId, payload);
      } else {
        await createSenior(payload);
      }
      cancelEdit();
      await refresh();
    } catch (e2) {
      setError(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(item) {
    if (!confirm(`¿Desactivar senior #${item.senior_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteSenior(item.senior_id);
      await refresh();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
        <h1>SECOT Bizkaia</h1>
        <h2>Login</h2>
        <form
          onSubmit={onLoginSubmit}
          style={{ display: "grid", gap: 10, maxWidth: 420 }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <label>Usuario</label>
            <input
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label>Contraseña</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            Entrar
          </button>
        </form>

        {error ? (
          <pre
            style={{
              background: "#fee",
              color: "#600",
              padding: 12,
              borderRadius: 8,
              marginTop: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </pre>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
      <h1>SECOT Bizkaia</h1>
      <p>
        CRUD Senior (API FastAPI). Configura <code>frontend/.env</code> con{" "}
        <code>VITE_API_URL</code>.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={refresh} disabled={loading}>
          Recargar
        </button>
        <button onClick={onLogout} disabled={loading}>
          Salir
        </button>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Incluir inactivos
        </label>
        {loading ? <span>Cargando…</span> : null}
      </div>

      {error ? (
        <pre
          style={{
            background: "#fee",
            color: "#600",
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </pre>
      ) : null}

      <h2 style={{ marginTop: 24 }}>{editingId ? "Editar" : "Nuevo"} senior</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Nombre</label>
          <input name="nombre" value={form.nombre} onChange={onChange} required />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Apellidos</label>
          <input
            name="apellidos"
            value={form.apellidos}
            onChange={onChange}
            required
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Email</label>
          <input name="email" value={form.email} onChange={onChange} />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Móvil</label>
          <input name="movil" value={form.movil} onChange={onChange} />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Fecha alta</label>
          <input
            type="date"
            name="fecha_alta"
            value={form.fecha_alta}
            onChange={onChange}
          />
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            name="activo"
            checked={form.activo}
            onChange={onChange}
          />
          Activo
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={loading}>
            {editingId ? "Guardar" : "Crear"}
          </button>
          {editingId ? (
            <button type="button" onClick={cancelEdit} disabled={loading}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <h2 style={{ marginTop: 28 }}>Seniors</h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 10,
          maxWidth: 980,
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: "8px 6px" }}>ID</th>
            <th style={{ padding: "8px 6px" }}>Nombre</th>
            <th style={{ padding: "8px 6px" }}>Apellidos</th>
            <th style={{ padding: "8px 6px" }}>Email</th>
            <th style={{ padding: "8px 6px" }}>Activo</th>
            <th style={{ padding: "8px 6px" }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.senior_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 6px" }}>{it.senior_id}</td>
              <td style={{ padding: "8px 6px" }}>{it.nombre}</td>
              <td style={{ padding: "8px 6px" }}>{it.apellidos}</td>
              <td style={{ padding: "8px 6px" }}>{it.email || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.activo ? "Sí" : "No"}</td>
              <td style={{ padding: "8px 6px", display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(it)} disabled={loading}>
                  Editar
                </button>
                <button onClick={() => onDelete(it)} disabled={loading}>
                  Desactivar
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: 10, color: "#666" }}>
                Sin datos
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

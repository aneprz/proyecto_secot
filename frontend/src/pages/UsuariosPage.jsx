import React, { useEffect, useMemo, useState } from "react";
import {
  createUsuario,
  deleteUsuario,
  listUsuarios,
  updateUsuario,
} from "../api/usuarios.js";
import { listSeniors } from "../api/seniors.js";

export default function UsuariosPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [seniors, setSeniors] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);

  const emptyForm = useMemo(
    () => ({
      username: "",
      email: "",
      rol: "write",
      senior_id: "",
      password: "",
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
      const data = await listUsuarios({ includeInactive });
      setItems(data);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [includeInactive]);

  useEffect(() => {
    async function refreshSeniors() {
      try {
        const seniorsData = await listSeniors({ includeInactive: false });
        setSeniors(seniorsData);
      } catch (e) {
        console.error("Error cargando seniors:", e);
      }
    }
    refreshSeniors();
  }, []);

  const seniorById = useMemo(() => {
    const map = new Map();
    for (const senior of seniors) {
      map.set(senior.senior_id, senior);
    }
    return map;
  }, [seniors]);

  function renderSeniorLabel(seniorId) {
    if (seniorId === null || seniorId === undefined || seniorId === "") return "";
    const senior = seniorById.get(Number(seniorId));
    if (!senior) return `#${seniorId}`;
    return `#${seniorId} — ${senior.nombre} ${senior.apellido1 || ""} ${senior.apellido2 || ""}`.trim();
  }

  function onChange(e) {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) || "" : value,
    }));
  }

  function startEdit(item) {
    setEditingId(item.usuario_id);
    setForm({
      username: item.username ?? "",
      email: item.email ?? "",
      rol: item.rol === "user" ? "write" : item.rol ?? "write",
      senior_id: item.senior_id ?? "",
      password: "", // No mostrar contraseña existente
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
        username: form.username.trim(),
        email: form.email.trim() || null,
        rol: form.rol,
        senior_id: form.senior_id ? Number(form.senior_id) : null,
        activo: Boolean(form.activo),
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      if (editingId) {
        await updateUsuario(editingId, payload);
      } else {
        if (!form.password.trim()) {
          throw new Error("Contraseña requerida para nuevo usuario");
        }
        payload.password = form.password.trim();
        await createUsuario(payload);
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
    if (!confirm(`¿Desactivar usuario #${item.usuario_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteUsuario(item.usuario_id);
      await refresh();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
      <h1>SECOT Bizkaia - Usuarios (Admin)</h1>
      <button onClick={onBack}>Volver al Menú</button>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <button onClick={refresh} disabled={loading}>
          Recargar
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

      <h2 style={{ marginTop: 24 }}>{editingId ? "Editar" : "Nuevo"} usuario</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Username</label>
          <input name="username" value={form.username} onChange={onChange} required />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Email</label>
          <input name="email" value={form.email} onChange={onChange} />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Rol</label>
          <select name="rol" value={form.rol} onChange={onChange}>
            <option value="read">Lectura</option>
            <option value="write">Normal</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Senior asociado (opcional)</label>
          <select name="senior_id" value={form.senior_id} onChange={onChange}>
            <option value="">-- Ninguno --</option>
            {seniors.map((senior) => (
              <option key={senior.senior_id} value={String(senior.senior_id)}>
                #{senior.senior_id} — {senior.nombre} {senior.apellido1 || ""} {senior.apellido2 || ""}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Contraseña {editingId ? "(dejar vacío para no cambiar)" : ""}</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required={!editingId}
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

      <h2 style={{ marginTop: 28 }}>Usuarios</h2>
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
            <th style={{ padding: "8px 6px" }}>Username</th>
            <th style={{ padding: "8px 6px" }}>Email</th>
            <th style={{ padding: "8px 6px" }}>Rol</th>
            <th style={{ padding: "8px 6px" }}>Senior ID</th>
            <th style={{ padding: "8px 6px" }}>Activo</th>
            <th style={{ padding: "8px 6px" }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.usuario_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 6px" }}>{it.usuario_id}</td>
              <td style={{ padding: "8px 6px" }}>{it.username}</td>
              <td style={{ padding: "8px 6px" }}>{it.email || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.rol}</td>
              <td style={{ padding: "8px 6px" }}>{it.senior_id ? renderSeniorLabel(it.senior_id) : ""}</td>
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
              <td colSpan={7} style={{ padding: 10, color: "#666" }}>
                Sin datos
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
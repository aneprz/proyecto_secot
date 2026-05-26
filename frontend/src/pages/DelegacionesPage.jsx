import React, { useEffect, useMemo, useState } from "react";
import {
  createDelegacion,
  deleteDelegacion,
  listDelegaciones,
  updateDelegacion,
} from "../api/delegaciones.js";

export default function DelegacionesPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const emptyForm = useMemo(
    () => ({
      codigo: "",
      nombre: "",
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
      const data = await listDelegaciones({ includeInactive });
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

  function onChange(e) {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(item) {
    setEditingId(item.delegacion_id);
    setForm({
      codigo: item.codigo ?? "",
      nombre: item.nombre ?? "",
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
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        activo: Boolean(form.activo),
      };
      if (editingId) {
        await updateDelegacion(editingId, payload);
      } else {
        await createDelegacion(payload);
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
    if (!confirm(`¿Desactivar delegación #${item.delegacion_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteDelegacion(item.delegacion_id);
      await refresh();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
      <h1>SECOT Bizkaia - Delegaciones (Admin)</h1>
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

      <h2 style={{ marginTop: 24 }}>{editingId ? "Editar" : "Nueva"} delegación</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Código</label>
          <input name="codigo" value={form.codigo} onChange={onChange} required />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Nombre</label>
          <input name="nombre" value={form.nombre} onChange={onChange} required />
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="activo" checked={form.activo} onChange={onChange} />
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

      <h2 style={{ marginTop: 28 }}>Delegaciones</h2>
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
            <th style={{ padding: "8px 6px" }}>Código</th>
            <th style={{ padding: "8px 6px" }}>Nombre</th>
            <th style={{ padding: "8px 6px" }}>Activo</th>
            <th style={{ padding: "8px 6px" }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.delegacion_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 6px" }}>{item.delegacion_id}</td>
              <td style={{ padding: "8px 6px" }}>{item.codigo}</td>
              <td style={{ padding: "8px 6px" }}>{item.nombre}</td>
              <td style={{ padding: "8px 6px" }}>{item.activo ? "Sí" : "No"}</td>
              <td style={{ padding: "8px 6px", display: "flex", gap: 8 }}>
                <button type="button" onClick={() => startEdit(item)} disabled={loading}>
                  Editar
                </button>
                <button type="button" onClick={() => onDelete(item)} disabled={loading}>
                  Desactivar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

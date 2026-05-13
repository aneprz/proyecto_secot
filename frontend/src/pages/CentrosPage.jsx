import React, { useEffect, useMemo, useState } from "react";
import { createCentro, deleteCentro, listCentros, updateCentro } from "../api/centros.js";

export default function CentrosPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);

  const emptyForm = useMemo(
    () => ({
      nombre: "",
      tipo: "",
      direccion: "",
      municipio: "",
      activo: true,
    }),
    [],
  );
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await listCentros({ includeInactive });
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
    setEditingId(item.centro_id);
    setForm({
      nombre: item.nombre ?? "",
      tipo: item.tipo ?? "",
      direccion: item.direccion ?? "",
      municipio: item.municipio ?? "",
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
        tipo: form.tipo.trim() || null,
        direccion: form.direccion.trim() || null,
        municipio: form.municipio.trim() || null,
        activo: Boolean(form.activo),
      };
      if (editingId) {
        await updateCentro(editingId, payload);
      } else {
        await createCentro(payload);
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
    if (!confirm(`¿Desactivar centro #${item.centro_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteCentro(item.centro_id);
      await refresh();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
      <h1>SECOT Bizkaia - Centros</h1>
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

      <h2 style={{ marginTop: 24 }}>{editingId ? "Editar" : "Nuevo"} centro</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Nombre</label>
          <input name="nombre" value={form.nombre} onChange={onChange} required />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Tipo</label>
          <input name="tipo" value={form.tipo} onChange={onChange} />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Dirección</label>
          <input name="direccion" value={form.direccion} onChange={onChange} />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Municipio</label>
          <input name="municipio" value={form.municipio} onChange={onChange} />
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

      <h2 style={{ marginTop: 28 }}>Centros</h2>
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
            <th style={{ padding: "8px 6px" }}>Tipo</th>
            <th style={{ padding: "8px 6px" }}>Municipio</th>
            <th style={{ padding: "8px 6px" }}>Activo</th>
            <th style={{ padding: "8px 6px" }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.centro_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 6px" }}>{it.centro_id}</td>
              <td style={{ padding: "8px 6px" }}>{it.nombre}</td>
              <td style={{ padding: "8px 6px" }}>{it.tipo || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.municipio || ""}</td>
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


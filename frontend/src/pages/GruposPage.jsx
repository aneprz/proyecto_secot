import React, { useEffect, useMemo, useState } from "react";
import {
  createGrupo,
  deleteGrupo,
  listGrupos,
  updateGrupo,
} from "../api/grupos.js";

export default function GruposPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);

  const emptyForm = useMemo(
    () => ({
      nombre_grupo: "",
      descripcion: "",
      color_hex: "",
      canal_teams: "",
      responsable_senior_id: "",
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
      const data = await listGrupos({ includeInactive });
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
    setEditingId(item.grupo_id);
    setForm({
      nombre_grupo: item.nombre_grupo ?? "",
      descripcion: item.descripcion ?? "",
      color_hex: item.color_hex ?? "",
      canal_teams: item.canal_teams ?? "",
      responsable_senior_id:
        item.responsable_senior_id === null || item.responsable_senior_id === undefined
          ? ""
          : String(item.responsable_senior_id),
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
        nombre_grupo: form.nombre_grupo.trim(),
        descripcion: form.descripcion.trim() || null,
        color_hex: form.color_hex.trim() || null,
        canal_teams: form.canal_teams.trim() || null,
        responsable_senior_id: form.responsable_senior_id
          ? Number(form.responsable_senior_id)
          : null,
        activo: Boolean(form.activo),
      };
      if (editingId) {
        await updateGrupo(editingId, payload);
      } else {
        await createGrupo(payload);
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
    if (!confirm(`¿Desactivar grupo #${item.grupo_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteGrupo(item.grupo_id);
      await refresh();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
      <h1>SECOT Bizkaia - Grupos</h1>
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

      <h2 style={{ marginTop: 24 }}>{editingId ? "Editar" : "Nuevo"} grupo</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Nombre</label>
          <input
            name="nombre_grupo"
            value={form.nombre_grupo}
            onChange={onChange}
            required
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={onChange}
            rows={3}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>ColorHex</label>
          <input name="color_hex" value={form.color_hex} onChange={onChange} placeholder="#RRGGBB" />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>CanalTeams</label>
          <input name="canal_teams" value={form.canal_teams} onChange={onChange} />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>ResponsableSeniorId</label>
          <input
            name="responsable_senior_id"
            value={form.responsable_senior_id}
            onChange={onChange}
            inputMode="numeric"
            pattern="\\d*"
            placeholder="(opcional)"
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

      <h2 style={{ marginTop: 28 }}>Grupos</h2>
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
            <th style={{ padding: "8px 6px" }}>Descripción</th>
            <th style={{ padding: "8px 6px" }}>Color</th>
            <th style={{ padding: "8px 6px" }}>Canal Teams</th>
            <th style={{ padding: "8px 6px" }}>Resp. Senior</th>
            <th style={{ padding: "8px 6px" }}>Activo</th>
            <th style={{ padding: "8px 6px" }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.grupo_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 6px" }}>{it.grupo_id}</td>
              <td style={{ padding: "8px 6px" }}>{it.nombre_grupo}</td>
              <td style={{ padding: "8px 6px" }}>{it.descripcion || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.color_hex || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.canal_teams || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.responsable_senior_id ?? ""}</td>
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
              <td colSpan={8} style={{ padding: 10, color: "#666" }}>
                Sin datos
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

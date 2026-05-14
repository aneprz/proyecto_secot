import React, { useEffect, useMemo, useState } from "react";
import { createSesion, deleteSesion, listSesiones, updateSesion } from "../api/sesiones.js";
import { listActividades } from "../api/actividades.js";
import { listCentros } from "../api/centros.js";
import { listGrupos } from "../api/grupos.js";

export default function SesionesPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [actividades, setActividades] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [centros, setCentros] = useState([]);

  const emptyForm = useMemo(
    () => ({
      actividad_id: "",
      grupo_id: "",
      centro_id: "",
      fecha: "",
      hora_inicio: "",
      hora_fin: "",
      duracion_horas: "",
      titulo_sesion: "",
      ubicacion: "",
      estado_sesion: "",
      observaciones: "",
      es_visible_calendario: true,
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
      const [rows, actData, grpData, cenData] = await Promise.all([
        listSesiones({ includeInactive }),
        listActividades({ includeInactive: false }),
        listGrupos({ includeInactive: false }),
        listCentros({ includeInactive: false }),
      ]);
      setItems(rows);
      setActividades(actData);
      setGrupos(grpData);
      setCentros(cenData);
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
    setEditingId(item.sesion_id);
    setForm({
      actividad_id: String(item.actividad_id ?? ""),
      grupo_id: String(item.grupo_id ?? ""),
      centro_id: String(item.centro_id ?? ""),
      fecha: item.fecha ?? "",
      hora_inicio: item.hora_inicio ?? "",
      hora_fin: item.hora_fin ?? "",
      duracion_horas: item.duracion_horas === null || item.duracion_horas === undefined ? "" : String(item.duracion_horas),
      titulo_sesion: item.titulo_sesion ?? "",
      ubicacion: item.ubicacion ?? "",
      estado_sesion: item.estado_sesion ?? "",
      observaciones: item.observaciones ?? "",
      es_visible_calendario: Boolean(item.es_visible_calendario),
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
        actividad_id: Number(form.actividad_id),
        grupo_id: Number(form.grupo_id),
        centro_id: Number(form.centro_id),
        fecha: form.fecha,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
        duracion_horas: form.duracion_horas === "" ? null : Number(form.duracion_horas),
        titulo_sesion: form.titulo_sesion.trim() || null,
        ubicacion: form.ubicacion.trim() || null,
        estado_sesion: form.estado_sesion.trim() || null,
        observaciones: form.observaciones.trim() || null,
        es_visible_calendario: Boolean(form.es_visible_calendario),
        activo: Boolean(form.activo),
      };

      if (!payload.actividad_id || Number.isNaN(payload.actividad_id)) throw new Error("Selecciona una actividad");
      if (!payload.grupo_id || Number.isNaN(payload.grupo_id)) throw new Error("Selecciona un grupo");
      if (!payload.centro_id || Number.isNaN(payload.centro_id)) throw new Error("Selecciona un centro");
      if (!payload.fecha) throw new Error("La fecha es obligatoria");
      if (payload.duracion_horas !== null && Number.isNaN(payload.duracion_horas)) throw new Error("Duración inválida");

      if (editingId) await updateSesion(editingId, payload);
      else await createSesion(payload);

      cancelEdit();
      await refresh();
    } catch (e2) {
      setError(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(item) {
    if (!confirm(`¿Desactivar sesión #${item.sesion_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteSesion(item.sesion_id);
      await refresh();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const actividadById = useMemo(() => new Map(actividades.map((a) => [a.actividad_id, a])), [actividades]);
  const grupoById = useMemo(() => new Map(grupos.map((g) => [g.grupo_id, g])), [grupos]);
  const centroById = useMemo(() => new Map(centros.map((c) => [c.centro_id, c])), [centros]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          ← Volver
        </button>
        <h1 style={styles.title}>SECOT Bizkaia - Sesiones</h1>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>{editingId ? `Editar #${editingId}` : "Nueva sesión"}</h2>
        <form onSubmit={onSubmit} style={styles.form}>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label>Actividad</label>
              <select name="actividad_id" value={form.actividad_id} onChange={onChange} required>
                <option value="">-- Selecciona --</option>
                {actividades.map((a) => (
                  <option key={a.actividad_id} value={a.actividad_id}>
                    #{a.actividad_id} - {a.titulo_actividad}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label>Grupo</label>
              <select name="grupo_id" value={form.grupo_id} onChange={onChange} required>
                <option value="">-- Selecciona --</option>
                {grupos.map((g) => (
                  <option key={g.grupo_id} value={g.grupo_id}>
                    #{g.grupo_id} - {g.nombre_grupo}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label>Centro</label>
              <select name="centro_id" value={form.centro_id} onChange={onChange} required>
                <option value="">-- Selecciona --</option>
                {centros.map((c) => (
                  <option key={c.centro_id} value={c.centro_id}>
                    #{c.centro_id} - {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label>Fecha</label>
              <input type="date" name="fecha" value={form.fecha} onChange={onChange} required />
            </div>

            <div style={styles.field}>
              <label>Hora inicio</label>
              <input type="time" name="hora_inicio" value={form.hora_inicio} onChange={onChange} />
            </div>

            <div style={styles.field}>
              <label>Hora fin</label>
              <input type="time" name="hora_fin" value={form.hora_fin} onChange={onChange} />
            </div>

            <div style={styles.field}>
              <label>Duración (horas)</label>
              <input
                type="number"
                step="0.25"
                min="0"
                name="duracion_horas"
                value={form.duracion_horas}
                onChange={onChange}
                placeholder="Opcional"
              />
            </div>

            <div style={styles.field}>
              <label>Título sesión</label>
              <input name="titulo_sesion" value={form.titulo_sesion} onChange={onChange} maxLength={200} />
            </div>

            <div style={styles.field}>
              <label>Ubicación</label>
              <input name="ubicacion" value={form.ubicacion} onChange={onChange} maxLength={255} />
            </div>

            <div style={styles.field}>
              <label>Estado</label>
              <input name="estado_sesion" value={form.estado_sesion} onChange={onChange} maxLength={60} />
            </div>

            <div style={styles.fieldWide}>
              <label>Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={onChange} rows={3} />
            </div>

            <div style={styles.fieldCheck}>
              <label>
                <input
                  type="checkbox"
                  name="es_visible_calendario"
                  checked={form.es_visible_calendario}
                  onChange={onChange}
                />{" "}
                Visible en calendario
              </label>
            </div>

            <div style={styles.fieldCheck}>
              <label>
                <input type="checkbox" name="activo" checked={form.activo} onChange={onChange} /> Activo
              </label>
            </div>
          </div>

          <div style={styles.actions}>
            <button type="submit" disabled={loading} style={styles.primaryBtn}>
              {editingId ? "Guardar cambios" : "Crear"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} disabled={loading} style={styles.secondaryBtn}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        {error && <div style={styles.error}>Error: {error}</div>}
      </div>

      <div style={styles.card}>
        <div style={styles.listHeader}>
          <h2 style={styles.sectionTitle}>Sesiones</h2>
          <label style={styles.inlineLabel}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />{" "}
            Incluir inactivas
          </label>
        </div>

        {loading && <div style={styles.muted}>Cargando...</div>}
        {!loading && items.length === 0 && <div style={styles.muted}>No hay sesiones</div>}

        {items.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Actividad</th>
                  <th style={styles.th}>Grupo</th>
                  <th style={styles.th}>Centro</th>
                  <th style={styles.th}>Inicio</th>
                  <th style={styles.th}>Fin</th>
                  <th style={styles.th}>Dur.</th>
                  <th style={styles.th}>Título</th>
                  <th style={styles.th}>Ubicación</th>
                  <th style={styles.th}>Visible</th>
                  <th style={styles.th}>Activo</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const a = actividadById.get(it.actividad_id);
                  const g = grupoById.get(it.grupo_id);
                  const c = centroById.get(it.centro_id);
                  return (
                    <tr key={it.sesion_id}>
                      <td style={styles.td}>#{it.sesion_id}</td>
                      <td style={styles.td}>{it.fecha}</td>
                      <td style={styles.td}>
                        #{it.actividad_id} {a ? `- ${a.titulo_actividad}` : ""}
                      </td>
                      <td style={styles.td}>
                        #{it.grupo_id} {g ? `- ${g.nombre_grupo}` : ""}
                      </td>
                      <td style={styles.td}>
                        #{it.centro_id} {c ? `- ${c.nombre}` : ""}
                      </td>
                      <td style={styles.td}>{it.hora_inicio || ""}</td>
                      <td style={styles.td}>{it.hora_fin || ""}</td>
                      <td style={styles.td}>{it.duracion_horas ?? ""}</td>
                      <td style={styles.td}>{it.titulo_sesion || ""}</td>
                      <td style={styles.td}>{it.ubicacion || ""}</td>
                      <td style={styles.td}>{it.es_visible_calendario ? "Sí" : "No"}</td>
                      <td style={styles.td}>{it.activo ? "Sí" : "No"}</td>
                      <td style={styles.td}>
                        <button style={styles.linkBtn} onClick={() => startEdit(it)} disabled={loading}>
                          Editar
                        </button>
                        <button style={styles.dangerBtn} onClick={() => onDelete(it)} disabled={loading}>
                          Desactivar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  header: { display: "flex", alignItems: "center", gap: "1rem" },
  backBtn: {
    backgroundColor: "transparent",
    border: "1px solid #bdc3c7",
    padding: "0.5rem 0.75rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
  title: { margin: 0, color: "#2c3e50" },
  card: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "1.25rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  sectionTitle: { margin: 0, marginBottom: "0.75rem", color: "#2c3e50" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem",
  },
  field: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  fieldWide: { display: "flex", flexDirection: "column", gap: "0.25rem", gridColumn: "1 / -1" },
  fieldCheck: { display: "flex", alignItems: "center", gap: "0.5rem" },
  actions: { display: "flex", gap: "0.75rem", alignItems: "center" },
  primaryBtn: {
    backgroundColor: "#8e44ad",
    color: "#fff",
    border: "none",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    border: "1px solid #bdc3c7",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
  error: {
    marginTop: "0.75rem",
    padding: "0.75rem",
    backgroundColor: "#fdecea",
    border: "1px solid #f5c6cb",
    color: "#c0392b",
    borderRadius: "6px",
  },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" },
  inlineLabel: { color: "#2c3e50", fontSize: "0.95rem" },
  muted: { color: "#7f8c8d" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "0.75rem" },
  th: {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "1px solid #ecf0f1",
    color: "#2c3e50",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  td: { padding: "8px 6px", borderBottom: "1px solid #ecf0f1", whiteSpace: "nowrap" },
  linkBtn: {
    marginRight: "0.5rem",
    backgroundColor: "transparent",
    border: "1px solid #3498db",
    color: "#3498db",
    padding: "0.25rem 0.5rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
  dangerBtn: {
    backgroundColor: "transparent",
    border: "1px solid #e74c3c",
    color: "#e74c3c",
    padding: "0.25rem 0.5rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
};


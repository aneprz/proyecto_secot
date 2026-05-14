import React, { useEffect, useMemo, useState } from "react";
import {
  createActividad,
  deleteActividad,
  listActividades,
  updateActividad,
} from "../api/actividades.js";
import {
  createActividadSenior,
  deleteActividadSenior,
  listActividadSeniors,
  updateActividadSenior,
} from "../api/actividadSeniors.js";
import { listCentros } from "../api/centros.js";
import { listGrupos } from "../api/grupos.js";
import { listSeniors } from "../api/seniors.js";

export default function ActividadesPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [centros, setCentros] = useState([]);
  const [seniors, setSeniors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsIncludeInactive, setAssignmentsIncludeInactive] = useState(false);

  const emptyForm = useMemo(
    () => ({
      grupo_id: "",
      centro_id: "",
      titulo_actividad: "",
      descripcion: "",
      tipo_actividad: "",
      senior_responsable_actividad_id: "",
      estado_actividad: "",
      fecha_inicio_prevista: "",
      fecha_fin_prevista: "",
      activo: true,
    }),
    [],
  );

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const emptyAssignmentForm = useMemo(
    () => ({
      senior_id: "",
      rol_en_actividad: "",
      fecha_alta: "",
      fecha_baja: "",
      activo: true,
    }),
    [],
  );
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [actividadesData, gruposData, centrosData, seniorsData] = await Promise.all([
        listActividades({ includeInactive }),
        listGrupos({ includeInactive: false }),
        listCentros({ includeInactive: false }),
        listSeniors({ includeInactive: false }),
      ]);
      setItems(actividadesData);
      setGrupos(gruposData);
      setCentros(centrosData);
      setSeniors(seniorsData);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refreshAssignments(actividadId) {
    if (!actividadId) {
      setAssignments([]);
      return;
    }
    try {
      const rows = await listActividadSeniors({
        actividadId,
        includeInactive: assignmentsIncludeInactive,
      });
      setAssignments(rows);
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, [includeInactive]);

  useEffect(() => {
    if (!editingId) return;
    refreshAssignments(editingId);
  }, [editingId, assignmentsIncludeInactive]);

  function onChange(e) {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function onAssignmentChange(e) {
    const { name, type, value, checked } = e.target;
    setAssignmentForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(item) {
    setEditingId(item.actividad_id);
    setForm({
      grupo_id: String(item.grupo_id ?? ""),
      centro_id: String(item.centro_id ?? ""),
      titulo_actividad: item.titulo_actividad ?? "",
      descripcion: item.descripcion ?? "",
      tipo_actividad: item.tipo_actividad ?? "",
      senior_responsable_actividad_id:
        item.senior_responsable_actividad_id === null ||
        item.senior_responsable_actividad_id === undefined
          ? ""
          : String(item.senior_responsable_actividad_id),
      estado_actividad: item.estado_actividad ?? "",
      fecha_inicio_prevista: item.fecha_inicio_prevista ?? "",
      fecha_fin_prevista: item.fecha_fin_prevista ?? "",
      activo: Boolean(item.activo),
    });
    setEditingAssignmentId(null);
    setAssignmentForm(emptyAssignmentForm);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setAssignments([]);
    setEditingAssignmentId(null);
    setAssignmentForm(emptyAssignmentForm);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        grupo_id: Number(form.grupo_id),
        centro_id: Number(form.centro_id),
        titulo_actividad: form.titulo_actividad.trim(),
        descripcion: form.descripcion.trim() || null,
        tipo_actividad: form.tipo_actividad.trim() || null,
        senior_responsable_actividad_id: form.senior_responsable_actividad_id
          ? Number(form.senior_responsable_actividad_id)
          : null,
        estado_actividad: form.estado_actividad.trim() || null,
        fecha_inicio_prevista: form.fecha_inicio_prevista || null,
        fecha_fin_prevista: form.fecha_fin_prevista || null,
        activo: Boolean(form.activo),
      };

      if (!payload.grupo_id || Number.isNaN(payload.grupo_id)) {
        throw new Error("Selecciona un grupo");
      }
      if (!payload.centro_id || Number.isNaN(payload.centro_id)) {
        throw new Error("Selecciona un centro");
      }
      if (!payload.titulo_actividad) {
        throw new Error("El título es obligatorio");
      }

      if (editingId) {
        await updateActividad(editingId, payload);
      } else {
        await createActividad(payload);
      }
      cancelEdit();
      await refresh();
    } catch (e2) {
      setError(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  }

  function startEditAssignment(row) {
    setEditingAssignmentId(row.actividad_senior_id);
    setAssignmentForm({
      senior_id: String(row.senior_id ?? ""),
      rol_en_actividad: row.rol_en_actividad ?? "",
      fecha_alta: row.fecha_alta ?? "",
      fecha_baja: row.fecha_baja ?? "",
      activo: Boolean(row.activo),
    });
  }

  function cancelEditAssignment() {
    setEditingAssignmentId(null);
    setAssignmentForm(emptyAssignmentForm);
  }

  async function onSubmitAssignment(e) {
    e.preventDefault();
    if (!editingId) return;

    setLoading(true);
    setError("");
    try {
      const payload = {
        actividad_id: editingId,
        senior_id: Number(assignmentForm.senior_id),
        rol_en_actividad: assignmentForm.rol_en_actividad.trim() || null,
        fecha_alta: assignmentForm.fecha_alta || null,
        fecha_baja: assignmentForm.fecha_baja || null,
        activo: Boolean(assignmentForm.activo),
      };

      if (!payload.senior_id || Number.isNaN(payload.senior_id)) {
        throw new Error("Selecciona un senior");
      }

      if (editingAssignmentId) {
        await updateActividadSenior(editingAssignmentId, payload);
      } else {
        await createActividadSenior(payload);
      }
      cancelEditAssignment();
      await refreshAssignments(editingId);
    } catch (e2) {
      setError(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteAssignment(row) {
    if (!confirm(`¿Desactivar asignación #${row.actividad_senior_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteActividadSenior(row.actividad_senior_id);
      await refreshAssignments(editingId);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(item) {
    if (!confirm(`¿Desactivar actividad #${item.actividad_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteActividad(item.actividad_id);
      await refresh();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const grupoById = useMemo(() => {
    const map = new Map();
    for (const g of grupos) map.set(g.grupo_id, g);
    return map;
  }, [grupos]);

  const centroById = useMemo(() => {
    const map = new Map();
    for (const c of centros) map.set(c.centro_id, c);
    return map;
  }, [centros]);

  const seniorById = useMemo(() => {
    const map = new Map();
    for (const s of seniors) map.set(s.senior_id, s);
    return map;
  }, [seniors]);

  function renderSeniorLabel(s) {
    if (!s) return "";
    const parts = [s.nombre, s.apellido1, s.apellido2].filter(Boolean);
    return parts.join(" ");
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          ← Volver
        </button>
        <h1 style={styles.title}>SECOT Bizkaia - Actividades</h1>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>{editingId ? `Editar #${editingId}` : "Nueva actividad"}</h2>
        <form onSubmit={onSubmit} style={styles.form}>
          <div style={styles.grid}>
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

            <div style={styles.fieldWide}>
              <label>Título</label>
              <input
                name="titulo_actividad"
                value={form.titulo_actividad}
                onChange={onChange}
                maxLength={200}
                required
              />
            </div>

            <div style={styles.fieldWide}>
              <label>Descripción</label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={onChange}
                rows={3}
                placeholder="Opcional"
              />
            </div>

            <div style={styles.field}>
              <label>Tipo</label>
              <input name="tipo_actividad" value={form.tipo_actividad} onChange={onChange} maxLength={80} />
            </div>

            <div style={styles.field}>
              <label>Estado</label>
              <input
                name="estado_actividad"
                value={form.estado_actividad}
                onChange={onChange}
                maxLength={60}
              />
            </div>

            <div style={styles.field}>
              <label>Senior responsable</label>
              <select
                name="senior_responsable_actividad_id"
                value={form.senior_responsable_actividad_id}
                onChange={onChange}
              >
                <option value="">-- Ninguno --</option>
                {seniors.map((s) => (
                  <option key={s.senior_id} value={s.senior_id}>
                    #{s.senior_id} - {renderSeniorLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label>Inicio previsto</label>
              <input
                type="date"
                name="fecha_inicio_prevista"
                value={form.fecha_inicio_prevista}
                onChange={onChange}
              />
            </div>

            <div style={styles.field}>
              <label>Fin previsto</label>
              <input
                type="date"
                name="fecha_fin_prevista"
                value={form.fecha_fin_prevista}
                onChange={onChange}
              />
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

      {editingId && (
        <div style={styles.card}>
          <div style={styles.listHeader}>
            <h2 style={styles.sectionTitle}>Seniors en la actividad</h2>
            <label style={styles.inlineLabel}>
              <input
                type="checkbox"
                checked={assignmentsIncludeInactive}
                onChange={(e) => setAssignmentsIncludeInactive(e.target.checked)}
              />{" "}
              Incluir inactivas
            </label>
          </div>

          <form onSubmit={onSubmitAssignment} style={styles.form}>
            <div style={styles.grid}>
              <div style={styles.field}>
                <label>Senior</label>
                <select
                  name="senior_id"
                  value={assignmentForm.senior_id}
                  onChange={onAssignmentChange}
                  required
                >
                  <option value="">-- Selecciona --</option>
                  {seniors.map((s) => (
                    <option key={s.senior_id} value={s.senior_id}>
                      #{s.senior_id} - {renderSeniorLabel(s)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label>Rol</label>
                <input
                  name="rol_en_actividad"
                  value={assignmentForm.rol_en_actividad}
                  onChange={onAssignmentChange}
                  maxLength={80}
                  placeholder="Opcional"
                />
              </div>

              <div style={styles.field}>
                <label>Fecha alta</label>
                <input
                  type="date"
                  name="fecha_alta"
                  value={assignmentForm.fecha_alta}
                  onChange={onAssignmentChange}
                />
              </div>

              <div style={styles.field}>
                <label>Fecha baja</label>
                <input
                  type="date"
                  name="fecha_baja"
                  value={assignmentForm.fecha_baja}
                  onChange={onAssignmentChange}
                />
              </div>

              <div style={styles.fieldCheck}>
                <label>
                  <input
                    type="checkbox"
                    name="activo"
                    checked={assignmentForm.activo}
                    onChange={onAssignmentChange}
                  />{" "}
                  Activo
                </label>
              </div>
            </div>

            <div style={styles.actions}>
              <button type="submit" disabled={loading} style={styles.primaryBtn}>
                {editingAssignmentId ? "Guardar asignación" : "Añadir senior"}
              </button>
              {editingAssignmentId && (
                <button
                  type="button"
                  onClick={cancelEditAssignment}
                  disabled={loading}
                  style={styles.secondaryBtn}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {!loading && assignments.length === 0 && <div style={styles.muted}>No hay seniors asignados</div>}
          {assignments.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Senior</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Alta</th>
                    <th style={styles.th}>Baja</th>
                    <th style={styles.th}>Activo</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row) => {
                    const s = seniorById.get(row.senior_id);
                    return (
                      <tr key={row.actividad_senior_id}>
                        <td style={styles.td}>#{row.actividad_senior_id}</td>
                        <td style={styles.td}>
                          #{row.senior_id} {s ? `- ${renderSeniorLabel(s)}` : ""}
                        </td>
                        <td style={styles.td}>{row.rol_en_actividad || ""}</td>
                        <td style={styles.td}>{row.fecha_alta || ""}</td>
                        <td style={styles.td}>{row.fecha_baja || ""}</td>
                        <td style={styles.td}>{row.activo ? "Sí" : "No"}</td>
                        <td style={styles.td}>
                          <button
                            style={styles.linkBtn}
                            onClick={() => startEditAssignment(row)}
                            disabled={loading}
                          >
                            Editar
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => onDeleteAssignment(row)}
                            disabled={loading}
                          >
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
      )}

      <div style={styles.card}>
        <div style={styles.listHeader}>
          <h2 style={styles.sectionTitle}>Actividades</h2>
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
        {!loading && items.length === 0 && <div style={styles.muted}>No hay actividades</div>}

        {items.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Grupo</th>
                  <th style={styles.th}>Centro</th>
                  <th style={styles.th}>Título</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Resp.</th>
                  <th style={styles.th}>Inicio</th>
                  <th style={styles.th}>Fin</th>
                  <th style={styles.th}>Activo</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const g = grupoById.get(it.grupo_id);
                  const c = centroById.get(it.centro_id);
                  const s = it.senior_responsable_actividad_id
                    ? seniorById.get(it.senior_responsable_actividad_id)
                    : null;
                  return (
                    <tr key={it.actividad_id}>
                      <td style={styles.td}>#{it.actividad_id}</td>
                      <td style={styles.td}>
                        #{it.grupo_id} {g ? `- ${g.nombre_grupo}` : ""}
                      </td>
                      <td style={styles.td}>
                        #{it.centro_id} {c ? `- ${c.nombre}` : ""}
                      </td>
                      <td style={styles.td}>{it.titulo_actividad}</td>
                      <td style={styles.td}>{it.tipo_actividad || ""}</td>
                      <td style={styles.td}>{it.estado_actividad || ""}</td>
                      <td style={styles.td}>
                        {it.senior_responsable_actividad_id
                          ? `#${it.senior_responsable_actividad_id}${s ? ` - ${renderSeniorLabel(s)}` : ""}`
                          : ""}
                      </td>
                      <td style={styles.td}>{it.fecha_inicio_prevista || ""}</td>
                      <td style={styles.td}>{it.fecha_fin_prevista || ""}</td>
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
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  backBtn: {
    backgroundColor: "transparent",
    border: "1px solid #bdc3c7",
    padding: "0.5rem 0.75rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
  title: {
    margin: 0,
    color: "#2c3e50",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "1.25rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  sectionTitle: {
    margin: 0,
    marginBottom: "0.75rem",
    color: "#2c3e50",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  fieldWide: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    gridColumn: "1 / -1",
  },
  fieldCheck: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
  },
  primaryBtn: {
    backgroundColor: "#2ecc71",
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
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },
  inlineLabel: {
    color: "#2c3e50",
    fontSize: "0.95rem",
  },
  muted: {
    color: "#7f8c8d",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "0.75rem",
  },
  th: {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "1px solid #ecf0f1",
    color: "#2c3e50",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "8px 6px",
    borderBottom: "1px solid #ecf0f1",
    whiteSpace: "nowrap",
  },
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

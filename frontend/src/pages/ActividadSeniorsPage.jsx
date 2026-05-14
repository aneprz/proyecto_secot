import React, { useEffect, useMemo, useState } from "react";
import {
  createActividadSenior,
  deleteActividadSenior,
  listActividadSeniors,
  updateActividadSenior,
} from "../api/actividadSeniors.js";
import { listActividades } from "../api/actividades.js";
import { listSeniors } from "../api/seniors.js";

export default function ActividadSeniorsPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [actividades, setActividades] = useState([]);
  const [seniors, setSeniors] = useState([]);

  const emptyForm = useMemo(
    () => ({
      actividad_id: "",
      senior_id: "",
      rol_en_actividad: "",
      fecha_alta: "",
      fecha_baja: "",
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
      const [rows, actividadesData, seniorsData] = await Promise.all([
        listActividadSeniors({ includeInactive }),
        listActividades({ includeInactive: false }),
        listSeniors({ includeInactive: false }),
      ]);
      setItems(rows);
      setActividades(actividadesData);
      setSeniors(seniorsData);
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
    setEditingId(item.actividad_senior_id);
    setForm({
      actividad_id: String(item.actividad_id ?? ""),
      senior_id: String(item.senior_id ?? ""),
      rol_en_actividad: item.rol_en_actividad ?? "",
      fecha_alta: item.fecha_alta ?? "",
      fecha_baja: item.fecha_baja ?? "",
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
        senior_id: Number(form.senior_id),
        rol_en_actividad: form.rol_en_actividad.trim() || null,
        fecha_alta: form.fecha_alta || null,
        fecha_baja: form.fecha_baja || null,
        activo: Boolean(form.activo),
      };

      if (!payload.actividad_id || Number.isNaN(payload.actividad_id)) {
        throw new Error("Selecciona una actividad");
      }
      if (!payload.senior_id || Number.isNaN(payload.senior_id)) {
        throw new Error("Selecciona un senior");
      }

      if (editingId) {
        await updateActividadSenior(editingId, payload);
      } else {
        await createActividadSenior(payload);
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
    if (!confirm(`¿Desactivar relación #${item.actividad_senior_id}?`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteActividadSenior(item.actividad_senior_id);
      await refresh();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const actividadById = useMemo(() => {
    const map = new Map();
    for (const a of actividades) map.set(a.actividad_id, a);
    return map;
  }, [actividades]);

  const seniorById = useMemo(() => {
    const map = new Map();
    for (const s of seniors) map.set(s.senior_id, s);
    return map;
  }, [seniors]);

  function seniorLabel(s) {
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
        <h1 style={styles.title}>SECOT Bizkaia - Actividad/Senior</h1>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>{editingId ? `Editar #${editingId}` : "Nueva asignación"}</h2>
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
              <label>Senior</label>
              <select name="senior_id" value={form.senior_id} onChange={onChange} required>
                <option value="">-- Selecciona --</option>
                {seniors.map((s) => (
                  <option key={s.senior_id} value={s.senior_id}>
                    #{s.senior_id} - {seniorLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label>Rol en actividad</label>
              <input
                name="rol_en_actividad"
                value={form.rol_en_actividad}
                onChange={onChange}
                maxLength={80}
                placeholder="Opcional"
              />
            </div>

            <div style={styles.field}>
              <label>Fecha alta</label>
              <input type="date" name="fecha_alta" value={form.fecha_alta} onChange={onChange} />
            </div>

            <div style={styles.field}>
              <label>Fecha baja</label>
              <input type="date" name="fecha_baja" value={form.fecha_baja} onChange={onChange} />
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
          <h2 style={styles.sectionTitle}>Asignaciones</h2>
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
        {!loading && items.length === 0 && <div style={styles.muted}>No hay asignaciones</div>}

        {items.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Actividad</th>
                  <th style={styles.th}>Senior</th>
                  <th style={styles.th}>Rol</th>
                  <th style={styles.th}>Alta</th>
                  <th style={styles.th}>Baja</th>
                  <th style={styles.th}>Activo</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const a = actividadById.get(it.actividad_id);
                  const s = seniorById.get(it.senior_id);
                  return (
                    <tr key={it.actividad_senior_id}>
                      <td style={styles.td}>#{it.actividad_senior_id}</td>
                      <td style={styles.td}>
                        #{it.actividad_id} {a ? `- ${a.titulo_actividad}` : ""}
                      </td>
                      <td style={styles.td}>
                        #{it.senior_id} {s ? `- ${seniorLabel(s)}` : ""}
                      </td>
                      <td style={styles.td}>{it.rol_en_actividad || ""}</td>
                      <td style={styles.td}>{it.fecha_alta || ""}</td>
                      <td style={styles.td}>{it.fecha_baja || ""}</td>
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
    backgroundColor: "#f39c12",
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


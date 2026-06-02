import React, { useEffect, useMemo, useState } from "react";
import { listCalendarSesiones } from "../api/sesiones.js";
import { listDelegaciones } from "../api/delegaciones.js";
import { listGrupos } from "../api/grupos.js";
import { listCentros } from "../api/centros.js";

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekDays() {
  return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
}

function buildCalendarGrid(startDate, endDate) {
  const grid = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() - current.getDay());

  while (current <= endDate || current.getDay() !== 0) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    grid.push(week);
  }

  return grid;
}

function getTextColor(backgroundHex) {
  if (!backgroundHex) return "#000";
  const hex = backgroundHex.replace("#", "");
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? "#000" : "#fff";
}

export default function CalendarPage({ onBack }) {
  const today = new Date();
  const [startDate, setStartDate] = useState(formatDate(firstDayOfMonth(today)));
  const [endDate, setEndDate] = useState(formatDate(lastDayOfMonth(today)));
  const [delegacionId, setDelegacionId] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [centroId, setCentroId] = useState("");
  const [delegaciones, setDelegaciones] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [centros, setCentros] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHelpers() {
      try {
        const [delegs, grpData, cenData] = await Promise.all([
          listDelegaciones({ includeInactive: false }),
          listGrupos({ includeInactive: false }),
          listCentros({ includeInactive: false }),
        ]);
        setDelegaciones(delegs);
        setGrupos(grpData);
        setCentros(cenData);
      } catch (e) {
        setError(e?.message || String(e));
      }
    }
    loadHelpers();
  }, []);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError("");
      try {
        const rows = await listCalendarSesiones({
          startDate,
          endDate,
          delegacionId: delegacionId || undefined,
          grupoId: grupoId || undefined,
          centroId: centroId || undefined,
        });
        setEvents(rows);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [startDate, endDate, delegacionId, grupoId, centroId]);

  const groupsById = useMemo(() => new Map(grupos.map((g) => [g.grupo_id, g])), [grupos]);
  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const key = event.fecha;
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    });
    return map;
  }, [events]);

  const grid = useMemo(() => buildCalendarGrid(new Date(startDate), new Date(endDate)), [startDate, endDate]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          ← Volver
        </button>
        <h1 style={styles.title}>Calendario de sesiones</h1>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Filtros</h2>
        <div style={styles.filters}>
          <div style={styles.field}>
            <label>Desde</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div style={styles.field}>
            <label>Hasta</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div style={styles.field}>
            <label>Delegación</label>
            <select value={delegacionId} onChange={(e) => setDelegacionId(e.target.value)}>
              <option value="">Todas</option>
              {delegaciones.map((d) => (
                <option key={d.delegacion_id} value={d.delegacion_id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label>Grupo</label>
            <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
              <option value="">Todos</option>
              {grupos.map((g) => (
                <option key={g.grupo_id} value={g.grupo_id}>
                  {g.nombre_grupo}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label>Centro</label>
            <select value={centroId} onChange={(e) => setCentroId(e.target.value)}>
              <option value="">Todos</option>
              {centros.map((c) => (
                <option key={c.centro_id} value={c.centro_id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.listHeader}>
          <h2 style={styles.sectionTitle}>Vista de calendario</h2>
          <div style={styles.subInfo}>
            {loading ? "Cargando sesiones..." : `${events.length} sesión(es) encontradas`}
          </div>
        </div>

        {error && <div style={styles.error}>Error: {error}</div>}

        <div style={styles.calendarTable}>
          <div style={styles.calendarHeader}>
            {getWeekDays().map((day) => (
              <div key={day} style={styles.calendarHeaderCell}>
                {day}
              </div>
            ))}
          </div>

          {grid.map((week, rowIndex) => (
            <div key={rowIndex} style={styles.calendarRow}>
              {week.map((date) => {
                const dateKey = formatDate(date);
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isOutside = date < new Date(startDate) || date > new Date(endDate);
                return (
                  <div
                    key={dateKey}
                    style={{
                      ...styles.calendarCell,
                      backgroundColor: isOutside ? "#f8f9fa" : "#fff",
                      opacity: isOutside ? 0.5 : 1,
                    }}
                  >
                    <div style={styles.calendarCellHeader}>
                      <span>{date.getDate()}</span>
                    </div>
                    {dayEvents.length === 0 && <div style={styles.noEvents}>-</div>}
                    {dayEvents.map((event) => {
                      const group = groupsById.get(event.grupo_id);
                      const color = group?.color_hex || "#5d6d7e";
                      return (
                        <div
                          key={event.sesion_id}
                          style={{
                            ...styles.eventChip,
                            backgroundColor: color,
                            color: getTextColor(color),
                            borderColor: color,
                          }}
                        >
                          <div style={styles.eventTitle}>{event.titulo_sesion || `Sesión #${event.sesion_id}`}</div>
                          <div style={styles.eventMeta}>
                            {event.hora_inicio ? event.hora_inicio : "hora?"}
                            {event.hora_fin ? ` - ${event.hora_fin}` : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
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
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
  },
  field: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" },
  subInfo: { color: "#7f8c8d", fontSize: "0.95rem" },
  calendarTable: { display: "grid", gap: "0.5rem" },
  calendarHeader: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.5rem" },
  calendarHeaderCell: {
    padding: "0.8rem 0.5rem",
    backgroundColor: "#ecf0f1",
    textAlign: "center",
    fontWeight: 700,
    borderRadius: "8px",
    color: "#2c3e50",
  },
  calendarRow: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.5rem" },
  calendarCell: {
    minHeight: "140px",
    borderRadius: "10px",
    border: "1px solid #ecf0f1",
    padding: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  calendarCellHeader: { display: "flex", justifyContent: "flex-end", color: "#2c3e50", fontWeight: 700 },
  noEvents: { color: "#7f8c8d", fontSize: "0.9rem", marginTop: "0.4rem" },
  eventChip: {
    borderRadius: "8px",
    padding: "0.5rem",
    border: "1px solid transparent",
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  eventTitle: { fontSize: "0.95rem", fontWeight: 700 },
  eventMeta: { fontSize: "0.8rem", opacity: 0.9 },
  error: {
    marginTop: "0.75rem",
    padding: "0.75rem",
    backgroundColor: "#fdecea",
    border: "1px solid #f5c6cb",
    color: "#c0392b",
    borderRadius: "6px",
  },
};

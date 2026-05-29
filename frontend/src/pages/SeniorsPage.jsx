import React, { useEffect, useMemo, useState } from "react";
import {
  createSenior,
  deleteSenior,
  listSeniors,
  updateSenior,
} from "../api/seniors.js";
import { listDelegaciones } from "../api/delegaciones.js";

export default function SeniorsPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);

  const emptyForm = useMemo(
    () => ({
      nombre: "",
      apellido1: "",
      apellido2: "",
      email_personal: "",
      email_secot: "",
      movil: "+34 ",
      delegacion_id: "",
      fecha_alta: "",
      activo: true,
    }),
    []
  );
  const [delegaciones, setDelegaciones] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await listSeniors({ includeInactive });
      setItems(data);
      const delegs = await listDelegaciones({ includeInactive: false });
      setDelegaciones(delegs);
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
    const nextValue =
      name === "movil"
        ? value.replace(/[^\d+\s\-()]/g, "")
        : value;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : nextValue,
    }));
  }

  function startEdit(item) {
    setEditingId(item.senior_id);
    setForm({
      nombre: item.nombre ?? "",
      apellido1: item.apellido1 ?? "",
      apellido2: item.apellido2 ?? "",
      email_personal: item.email_personal ?? "",
      email_secot: item.email_secot ?? "",
      movil: item.movil ?? "+34 ",
      delegacion_id: item.delegacion_id ?? "",
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
      const movilValue = form.movil.trim();
      if (movilValue) {
        const cleaned = movilValue.replace(/[^\d]/g, "");
        if (cleaned.length < 7 || cleaned.length > 15) {
          throw new Error("El móvil debe contener entre 7 y 15 dígitos válidos.");
        }
      }

      const payload = {
        nombre: form.nombre.trim(),
        apellido1: form.apellido1.trim(),
        apellido2: form.apellido2.trim(),
        email_personal: form.email_personal.trim() || null,
        email_secot: form.email_secot.trim() || null,
        movil: movilValue || null,
        delegacion_id: form.delegacion_id ? Number(form.delegacion_id) : null,
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

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
      <h1>SECOT Bizkaia - Seniors</h1>
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

      <h2 style={{ marginTop: 24 }}>{editingId ? "Editar" : "Nuevo"} senior</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Nombre</label>
          <input name="nombre" value={form.nombre} onChange={onChange} required />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Apellido 1</label>
          <input
            name="apellido1"
            value={form.apellido1}
            onChange={onChange}
            required
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Apellido 2</label>
          <input
            name="apellido2"
            value={form.apellido2}
            onChange={onChange}
            required
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Email personal</label>
          <input
            name="email_personal"
            value={form.email_personal}
            onChange={onChange}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Email SECOT</label>
          <input
            name="email_secot"
            value={form.email_secot}
            onChange={onChange}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Móvil</label>
          <input
            type="tel"
            name="movil"
            value={form.movil}
            onChange={onChange}
            pattern="^\+?[0-9\s\-()]{7,30}$"
            title="Solo números, espacios, guiones, paréntesis y un prefijo + opcional"
            placeholder="Ej: +34 612 345 678"
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Delegación</label>
          <select name="delegacion_id" value={form.delegacion_id} onChange={onChange}>
            <option value="">-- Ninguna --</option>
            {delegaciones.map((d) => (
              <option key={d.delegacion_id} value={String(d.delegacion_id)}>
                {d.nombre}
              </option>
            ))}
          </select>
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
            <th style={{ padding: "8px 6px" }}>Apellido 1</th>
            <th style={{ padding: "8px 6px" }}>Apellido 2</th>
            <th style={{ padding: "8px 6px" }}>Email personal</th>
            <th style={{ padding: "8px 6px" }}>Email SECOT</th>
            <th style={{ padding: "8px 6px" }}>Móvil</th>
            <th style={{ padding: "8px 6px" }}>Fecha alta</th>
            <th style={{ padding: "8px 6px" }}>Activo</th>
            <th style={{ padding: "8px 6px" }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.senior_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 6px" }}>{it.senior_id}</td>
              <td style={{ padding: "8px 6px" }}>{it.nombre}</td>
              <td style={{ padding: "8px 6px" }}>{it.apellido1}</td>
              <td style={{ padding: "8px 6px" }}>{it.apellido2}</td>
              <td style={{ padding: "8px 6px" }}>{it.email_personal || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.email_secot || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.movil || ""}</td>
              <td style={{ padding: "8px 6px" }}>{it.fecha_alta || ""}</td>
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
              <td colSpan={10} style={{ padding: 10, color: "#666" }}>
                Sin datos
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


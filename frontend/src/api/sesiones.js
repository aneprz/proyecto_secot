import { getAccessToken } from "./auth.js";

const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

async function request(path, options = {}) {
  const token = getAccessToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${apiUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data ? data.detail : text;
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return data;
}

export function listSesiones({ actividadId, grupoId, centroId, includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (actividadId !== undefined && actividadId !== null && actividadId !== "")
    qs.set("actividad_id", String(actividadId));
  if (grupoId !== undefined && grupoId !== null && grupoId !== "") qs.set("grupo_id", String(grupoId));
  if (centroId !== undefined && centroId !== null && centroId !== "")
    qs.set("centro_id", String(centroId));
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/sesiones${suffix}`, { method: "GET" });
}

export function createSesion(payload) {
  return request(`/sesiones`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateSesion(sesionId, payload) {
  return request(`/sesiones/${sesionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSesion(sesionId) {
  return request(`/sesiones/${sesionId}`, { method: "DELETE" });
}


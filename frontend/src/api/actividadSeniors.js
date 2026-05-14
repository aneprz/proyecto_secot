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

export function listActividadSeniors({ actividadId, seniorId, includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (actividadId !== undefined && actividadId !== null && actividadId !== "")
    qs.set("actividad_id", String(actividadId));
  if (seniorId !== undefined && seniorId !== null && seniorId !== "")
    qs.set("senior_id", String(seniorId));
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/actividades-seniors${suffix}`, { method: "GET" });
}

export function createActividadSenior(payload) {
  return request(`/actividades-seniors`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateActividadSenior(id, payload) {
  return request(`/actividades-seniors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteActividadSenior(id) {
  return request(`/actividades-seniors/${id}`, { method: "DELETE" });
}


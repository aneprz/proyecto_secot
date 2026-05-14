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

export function listActividades({ includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/actividades${suffix}`, { method: "GET" });
}

export function createActividad(payload) {
  return request(`/actividades`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateActividad(actividadId, payload) {
  return request(`/actividades/${actividadId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteActividad(actividadId) {
  return request(`/actividades/${actividadId}`, { method: "DELETE" });
}


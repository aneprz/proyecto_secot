import { getAccessToken } from "./auth.js";

const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

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
    const detail = data && typeof data === "object" && "detail" in data ? data.detail : text;
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return data;
}

export function listCentros({ includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/centros${suffix}`, { method: "GET" });
}

export function createCentro(payload) {
  return request(`/centros`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateCentro(centroId, payload) {
  return request(`/centros/${centroId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteCentro(centroId) {
  return request(`/centros/${centroId}`, { method: "DELETE" });
}


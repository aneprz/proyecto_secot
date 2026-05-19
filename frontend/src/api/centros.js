import { request } from "./request.js";

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


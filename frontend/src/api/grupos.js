import { request } from "./request.js";

export function listGrupos({ includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/grupos${suffix}`, { method: "GET" });
}

export function createGrupo(payload) {
  return request(`/grupos`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateGrupo(grupoId, payload) {
  return request(`/grupos/${grupoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteGrupo(grupoId) {
  return request(`/grupos/${grupoId}`, { method: "DELETE" });
}
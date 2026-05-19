import { request } from "./request.js";

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


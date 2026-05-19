import { request } from "./request.js";

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


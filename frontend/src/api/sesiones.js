import { request } from "./request.js";

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

export function listCalendarSesiones({ startDate, endDate, delegacionId, grupoId, centroId, includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (startDate) qs.set("start_date", String(startDate));
  if (endDate) qs.set("end_date", String(endDate));
  if (delegacionId !== undefined && delegacionId !== null && delegacionId !== "") qs.set("delegacion_id", String(delegacionId));
  if (grupoId !== undefined && grupoId !== null && grupoId !== "") qs.set("grupo_id", String(grupoId));
  if (centroId !== undefined && centroId !== null && centroId !== "") qs.set("centro_id", String(centroId));
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/sesiones/calendar${suffix}`, { method: "GET" });
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


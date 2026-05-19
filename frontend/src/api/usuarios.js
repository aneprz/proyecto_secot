import { request } from "./request.js";

export function listUsuarios({ includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/usuarios${suffix}`, { method: "GET" });
}

export function createUsuario(payload) {
  return request(`/usuarios`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateUsuario(usuarioId, payload) {
  return request(`/usuarios/${usuarioId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUsuario(usuarioId) {
  return request(`/usuarios/${usuarioId}`, { method: "DELETE" });
}
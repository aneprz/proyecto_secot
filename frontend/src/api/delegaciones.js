import { request } from "./request.js";

export function listDelegaciones({ includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/delegaciones${suffix}`, { method: "GET" });
}

export function createDelegacion(payload) {
  return request(`/delegaciones`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateDelegacion(delegacionId, payload) {
  return request(`/delegaciones/${delegacionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDelegacion(delegacionId) {
  return request(`/delegaciones/${delegacionId}`, { method: "DELETE" });
}

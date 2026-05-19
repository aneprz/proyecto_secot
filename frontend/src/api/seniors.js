import { request } from "./request.js";

export function listSeniors({ includeInactive = false } = {}) {
  const qs = new URLSearchParams();
  if (includeInactive) qs.set("include_inactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/seniors${suffix}`, { method: "GET" });
}

export function createSenior(payload) {
  return request(`/seniors`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateSenior(seniorId, payload) {
  return request(`/seniors/${seniorId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSenior(seniorId) {
  return request(`/seniors/${seniorId}`, { method: "DELETE" });
}

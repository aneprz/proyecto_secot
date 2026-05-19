import { request } from "./request.js";

export function listGrupoSeniors(grupoId = null, seniorId = null) {
  const params = new URLSearchParams();
  if (grupoId) params.append("grupo_id", String(grupoId));
  if (seniorId) params.append("senior_id", String(seniorId));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/grupos-seniors${suffix}`, { method: "GET" });
}

export function getSeniorsByGrupo(grupoId) {
  return request(`/grupos-seniors/seniors/${grupoId}`, { method: "GET" });
}

export function getGruposBySenior(seniorId) {
  return request(`/grupos-seniors/grupos/${seniorId}`, { method: "GET" });
}

export function createGrupoSenior({ grupoId, seniorId, rolEnGrupo = "miembro" }) {
  return request(`/grupos-seniors`, {
    method: "POST",
    body: JSON.stringify({
      grupo_id: grupoId,
      senior_id: seniorId,
      rol_en_grupo: rolEnGrupo,
      activo: true,
    }),
  });
}

export function updateGrupoSenior(seniorGrupoId, { rolEnGrupo, fechaBaja = null, activo = null }) {
  return request(`/grupos-seniors/${seniorGrupoId}`, {
    method: "PATCH",
    body: JSON.stringify({
      rol_en_grupo: rolEnGrupo,
      fecha_baja: fechaBaja,
      activo,
    }),
  });
}

export function deleteGrupoSenior(seniorGrupoId, { hard = false } = {}) {
  const suffix = hard ? "?hard=true" : "";
  return request(`/grupos-seniors/${seniorGrupoId}${suffix}`, { method: "DELETE" });
}

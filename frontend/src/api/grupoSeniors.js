import { getAccessToken } from "./auth.js";

const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

function authHeader() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listGrupoSeniors(grupoId = null, seniorId = null) {
  const params = new URLSearchParams();
  if (grupoId) params.append("grupo_id", grupoId);
  if (seniorId) params.append("senior_id", seniorId);

  const res = await fetch(`${apiUrl}/grupos-seniors?${params.toString()}`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getSeniorsByGrupo(grupoId) {
  const res = await fetch(`${apiUrl}/grupos-seniors/seniors/${grupoId}`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getGruposBySenior(seniorId) {
  const res = await fetch(`${apiUrl}/grupos-seniors/grupos/${seniorId}`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createGrupoSenior({ grupoId, seniorId, rolEnGrupo = "miembro" }) {
  const res = await fetch(`${apiUrl}/grupos-seniors`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      grupo_id: grupoId,
      senior_id: seniorId,
      rol_en_grupo: rolEnGrupo,
      activo: true,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return data;
}

export async function updateGrupoSenior(seniorGrupoId, { rolEnGrupo, fechaBaja = null, activo = null }) {
  const res = await fetch(`${apiUrl}/grupos-seniors/${seniorGrupoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      rol_en_grupo: rolEnGrupo,
      fecha_baja: fechaBaja,
      activo,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return data;
}

export async function deleteGrupoSenior(seniorGrupoId, { hard = false } = {}) {
  const suffix = hard ? "?hard=true" : "";
  const res = await fetch(`${apiUrl}/grupos-seniors/${seniorGrupoId}${suffix}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

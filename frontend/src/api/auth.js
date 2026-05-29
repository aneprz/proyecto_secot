import { request } from "./request.js";

const TOKEN_KEY = "secot_access_token";
const USER_KEY = "secot_user";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAccessToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export function getCurrentUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function setCurrentUser(user) {
  if (!user) localStorage.removeItem(USER_KEY);
  else localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function decodeToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export function logout() {
  setAccessToken("");
  setCurrentUser(null);
}

export async function login({ username, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (!data?.access_token) throw new Error("Respuesta inválida (sin access_token)");

  setAccessToken(data.access_token);
  const payload = decodeToken(data.access_token);
  const user = {
    username: payload?.sub || username,
    rol: payload?.rol || "read",
    delegacion_id: payload?.delegacion_id ?? null,
    delegacion_nombre: payload?.delegacion_nombre || null,
  };
  setCurrentUser(user);
  return data;
}


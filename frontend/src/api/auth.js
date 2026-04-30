const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

const TOKEN_KEY = "secot_access_token";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAccessToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  setAccessToken("");
}

export async function login({ username, password }) {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data ? data.detail : text;
    throw new Error(detail || `HTTP ${res.status}`);
  }

  if (!data?.access_token) throw new Error("Respuesta inválida (sin access_token)");
  setAccessToken(data.access_token);
  return data;
}


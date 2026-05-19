const TOKEN_KEY = "secot_access_token";
const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function normalizeDetail(detail) {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function getFriendlyError(detail, status) {
  const normalized = normalizeDetail(detail).toLowerCase();

  if (status === 401) {
    return "No estás autorizado. Inicia sesión de nuevo para continuar.";
  }
  if (status === 403) {
    return "No tienes permisos suficientes para esta acción.";
  }
  if (status === 404) {
    return "No se encontró el recurso solicitado.";
  }
  if (status === 409) {
    if (normalized.includes("username") || normalized.includes("email")) {
      return "El nombre de usuario o el correo ya están en uso. Elige otros.";
    }
    return "Ya existe un recurso con esos valores.";
  }
  if (status === 422) {
    if (normalized.includes("password") && normalized.includes("8")) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }
    if (normalized.includes("username") && normalized.includes("3")) {
      return "El nombre de usuario debe tener al menos 3 caracteres.";
    }
    if (normalized.includes("email") && normalized.includes("valid")) {
      return "El correo electrónico no es válido.";
    }
    if (normalized.includes("required")) {
      return "Faltan datos obligatorios. Revisa el formulario.";
    }
    return "Datos inválidos. Revisa los campos y vuelve a intentarlo.";
  }

  if (normalized.includes("token inválido") || normalized.includes("token expirado") || normalized.includes("token invalido")) {
    return "Tu sesión expiró o el token no es válido. Inicia sesión de nuevo.";
  }

  return detail || `Error de red: HTTP ${status}`;
}

async function request(path, options = {}) {
  const token = getAccessToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  let res;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (err) {
    throw new Error(
      "No se pudo conectar con el servidor. Revisa la URL de la API y que el backend permite este origen (CORS)."
    );
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = data && typeof data === "object" && "detail" in data ? data.detail : text;
    throw new Error(getFriendlyError(detail, res.status));
  }

  return data;
}

export { request };

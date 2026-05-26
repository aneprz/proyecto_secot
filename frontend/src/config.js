export const APP_VERSION = "1.4.0";
export const API_BASE_URL = "http://localhost:8000";

export const ROLES = {
  READ: "read",
  WRITE: "write",
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  read: "Lectura",
  write: "Escritura",
  admin: "Administrador",
};

export const ROLE_PERMISSIONS = {
  read: ["GET"],
  write: ["GET", "POST", "PATCH"],
  admin: ["GET", "POST", "PATCH", "DELETE"],
};

export function hasPermission(userRole, method) {
  const allowedMethods = ROLE_PERMISSIONS[userRole] || [];
  return allowedMethods.includes(method);
}

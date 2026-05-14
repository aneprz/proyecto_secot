import React from "react";
import { getCurrentUser } from "../api/auth.js";
import { ROLE_PERMISSIONS } from "../config.js";

export default function MenuPage({ onNavigate }) {
  const user = getCurrentUser();
  const userRole = user?.rol || "read";

  const canAccess = (action) => {
    const methods = ROLE_PERMISSIONS[userRole] || [];
    return methods.includes("GET");
  };

  const canWrite = (action) => {
    const methods = ROLE_PERMISSIONS[userRole] || [];
    return methods.includes("POST") || methods.includes("PATCH");
  };

  const canAdmin = () => {
    const methods = ROLE_PERMISSIONS[userRole] || [];
    return methods.includes("DELETE") && userRole === "admin";
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.mainTitle}>Menú Principal</h1>
        <p style={styles.subtitle}>Selecciona una opción para continuar</p>

        <div style={styles.menuGrid}>
          {/* Seniors */}
          <div
            style={{
              ...styles.menuCard,
              borderTop: "4px solid #3498db",
              ...(canAccess("GET") ? {} : styles.disabled),
            }}
            onClick={() => canAccess("GET") && onNavigate("seniors")}
          >
            <div style={styles.cardIcon}>👨‍🦳</div>
            <h3 style={styles.cardTitle}>Seniors</h3>
            <p style={styles.cardDesc}>
              {canWrite() ? "Gestionar seniors (ver, crear, editar)" : "Ver seniors"}
            </p>
            <div style={styles.badge}>
              {canWrite() ? "✏️ Escritura" : "👁️ Lectura"}
            </div>
          </div>

          {/* Grupos */}
          <div
            style={{
              ...styles.menuCard,
              borderTop: "4px solid #2ecc71",
              ...(canAccess("GET") ? {} : styles.disabled),
            }}
            onClick={() => canAccess("GET") && onNavigate("grupos")}
          >
            <div style={styles.cardIcon}>👥</div>
            <h3 style={styles.cardTitle}>Grupos</h3>
            <p style={styles.cardDesc}>
              {canWrite() ? "Gestionar grupos (ver, crear, editar)" : "Ver grupos"}
            </p>
            <div style={styles.badge}>
              {canWrite() ? "✏️ Escritura" : "👁️ Lectura"}
            </div>
          </div>

          {/* Centros */}
          <div
            style={{
              ...styles.menuCard,
              borderTop: "4px solid #9b59b6",
              ...(canAccess("GET") ? {} : styles.disabled),
            }}
            onClick={() => canAccess("GET") && onNavigate("centros")}
          >
            <div style={styles.cardIcon}>🏫</div>
            <h3 style={styles.cardTitle}>Centros</h3>
            <p style={styles.cardDesc}>
              {canWrite() ? "Gestionar centros (ver, crear, editar)" : "Ver centros"}
            </p>
            <div style={styles.badge}>
              {canWrite() ? "✏️ Escritura" : "👁️ Lectura"}
            </div>
          </div>

          {/* Actividades */}
          <div
            style={{
              ...styles.menuCard,
              borderTop: "4px solid #f39c12",
              ...(canAccess("GET") ? {} : styles.disabled),
            }}
            onClick={() => canAccess("GET") && onNavigate("actividades")}
          >
            <div style={styles.cardIcon}>📌</div>
            <h3 style={styles.cardTitle}>Actividades</h3>
            <p style={styles.cardDesc}>
              {canWrite() ? "Gestionar actividades (ver, crear, editar)" : "Ver actividades"}
            </p>
            <div style={styles.badge}>
              {canWrite() ? "✏️ Escritura" : "👁️ Lectura"}
            </div>
          </div>

          {/* Actividad/Senior */}
          <div
            style={{
              ...styles.menuCard,
              borderTop: "4px solid #16a085",
              ...(canAccess("GET") ? {} : styles.disabled),
            }}
            onClick={() => canAccess("GET") && onNavigate("actividad_seniors")}
          >
            <div style={styles.cardIcon}>🧩</div>
            <h3 style={styles.cardTitle}>Actividad/Senior</h3>
            <p style={styles.cardDesc}>
              {canWrite() ? "Asignar seniors a actividades" : "Ver asignaciones"}
            </p>
            <div style={styles.badge}>
              {canWrite() ? "✏️ Escritura" : "👁️ Lectura"}
            </div>
          </div>

          {/* Sesiones */}
          <div
            style={{
              ...styles.menuCard,
              borderTop: "4px solid #8e44ad",
              ...(canAccess("GET") ? {} : styles.disabled),
            }}
            onClick={() => canAccess("GET") && onNavigate("sesiones")}
          >
            <div style={styles.cardIcon}>🗓️</div>
            <h3 style={styles.cardTitle}>Sesiones</h3>
            <p style={styles.cardDesc}>
              {canWrite() ? "Gestionar sesiones (ver, crear, editar)" : "Ver sesiones"}
            </p>
            <div style={styles.badge}>
              {canWrite() ? "✏️ Escritura" : "👁️ Lectura"}
            </div>
          </div>

          {/* Usuarios (Solo Admin) */}
          {canAdmin() && (
            <div
              style={{
                ...styles.menuCard,
                borderTop: "4px solid #e74c3c",
              }}
              onClick={() => onNavigate("usuarios")}
            >
              <div style={styles.cardIcon}>🔐</div>
              <h3 style={styles.cardTitle}>Usuarios</h3>
              <p style={styles.cardDesc}>Gestionar usuarios y permisos</p>
              <div style={styles.badge}>🔒 Admin</div>
            </div>
          )}
        </div>

        <div style={styles.info}>
          <p style={styles.infoText}>
            👤 Usuario: <strong>{user?.username}</strong>
          </p>
          <p style={styles.infoText}>
            🔑 Rol: <strong>{user?.rol.toUpperCase()}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    minHeight: "calc(100vh - 80px)",
    padding: "2rem",
    backgroundColor: "#ecf0f1",
  },
  content: {
    maxWidth: "1000px",
    width: "100%",
  },
  mainTitle: {
    fontSize: "2.5rem",
    color: "#2c3e50",
    marginBottom: "0.5rem",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: "2rem",
  },
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  },
  menuCard: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    border: "1px solid #ecf0f1",
  },
  menuCardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    backgroundColor: "#f8f9fa",
  },
  cardIcon: {
    fontSize: "2.5rem",
    marginBottom: "0.5rem",
    textAlign: "center",
  },
  cardTitle: {
    fontSize: "1.3rem",
    color: "#2c3e50",
    margin: "0.5rem 0",
    fontWeight: "600",
  },
  cardDesc: {
    fontSize: "0.9rem",
    color: "#7f8c8d",
    margin: "0.5rem 0 1rem 0",
  },
  badge: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    backgroundColor: "#ecf0f1",
    borderRadius: "12px",
    fontSize: "0.8rem",
    color: "#2c3e50",
    fontWeight: "600",
  },
  info: {
    backgroundColor: "white",
    padding: "1rem",
    borderRadius: "8px",
    borderLeft: "4px solid #3498db",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  infoText: {
    margin: "0.25rem 0",
    color: "#2c3e50",
    fontSize: "0.95rem",
  },
};

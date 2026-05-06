import React from "react";
import { APP_VERSION, ROLE_LABELS } from "../config.js";
import { getCurrentUser, logout } from "../api/auth.js";

export default function Header({ onLogout }) {
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.title}>SECOT Bizkaia</h1>
      </div>
      <div style={styles.right}>
        <div style={styles.userInfo}>
          {user && (
            <>
              <span style={styles.username}>{user.username}</span>
              <span style={styles.role}>({ROLE_LABELS[user.rol] || user.rol})</span>
            </>
          )}
          <span style={styles.version}>v{APP_VERSION}</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    backgroundColor: "#2c3e50",
    color: "white",
    borderBottom: "2px solid #3498db",
  },
  left: {
    display: "flex",
    alignItems: "center",
  },
  title: {
    margin: 0,
    fontSize: "1.8rem",
    fontWeight: "bold",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "2rem",
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.25rem",
  },
  username: {
    fontSize: "1rem",
    fontWeight: "600",
  },
  role: {
    fontSize: "0.85rem",
    color: "#bdc3c7",
  },
  version: {
    fontSize: "0.75rem",
    color: "#95a5a6",
    marginTop: "0.5rem",
  },
  logoutBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#e74c3c",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "600",
    transition: "background-color 0.3s",
  },
};

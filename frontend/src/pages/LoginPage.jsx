import React, { useState } from "react";
import { login } from "../api/auth.js";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ username: username.trim(), password });
      onLogin();
    } catch (e2) {
      setError(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
      <h1>SECOT</h1>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Usuario</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          Entrar
        </button>
      </form>

      {error ? (
        <pre
          style={{
            background: "#fee",
            color: "#600",
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </pre>
      ) : null}
    </div>
  );
}
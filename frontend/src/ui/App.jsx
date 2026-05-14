import React, { useState } from "react";
import { getAccessToken, logout, getCurrentUser } from "../api/auth.js";
import Header from "./Header.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import MenuPage from "../pages/MenuPage.jsx";
import SeniorsPage from "../pages/SeniorsPage.jsx";
import GruposPage from "../pages/GruposPage.jsx";
import CentrosPage from "../pages/CentrosPage.jsx";
import UsuariosPage from "../pages/UsuariosPage.jsx";
import ActividadesPage from "../pages/ActividadesPage.jsx";
import SesionesPage from "../pages/SesionesPage.jsx";

export default function App() {
  const [token, setToken] = useState(() => getAccessToken());
  const [currentPage, setCurrentPage] = useState("menu");

  function handleLogin() {
    setToken(getAccessToken());
    setCurrentPage("menu");
  }

  function handleLogout() {
    logout();
    setToken("");
    setCurrentPage("menu");
  }

  function navigateTo(page) {
    setCurrentPage(page);
  }

  function goBack() {
    setCurrentPage("menu");
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={styles.container}>
      <Header onLogout={handleLogout} />
      <main style={styles.main}>
        {currentPage === "seniors" && <SeniorsPage onBack={goBack} />}
        {currentPage === "grupos" && <GruposPage onBack={goBack} />}
        {currentPage === "centros" && <CentrosPage onBack={goBack} />}
        {currentPage === "actividades" && <ActividadesPage onBack={goBack} />}
        {currentPage === "sesiones" && <SesionesPage onBack={goBack} />}
        {currentPage === "usuarios" && <UsuariosPage onBack={goBack} />}
        {currentPage === "menu" && <MenuPage onNavigate={navigateTo} />}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#ecf0f1",
  },
  main: {
    flex: 1,
    padding: "2rem",
  },
};

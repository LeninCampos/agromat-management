// src/layout/AppLayout.jsx
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      // En móvil: abrir/cerrar sidebar
      setIsSidebarOpen((prev) => !prev);
    } else {
      // En desktop: colapsar/expandir sidebar
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-container">
      {/* Overlay (solo se ve en móvil cuando el menú está abierto) */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside
        className={`sidebar-container ${isSidebarOpen ? "open" : ""} ${
          isSidebarCollapsed ? "collapsed" : ""
        }`}
      >
        <Sidebar isCollapsed={isSidebarCollapsed} />
      </aside>

      {/* Contenido principal */}
      <div className="main-content">
        <Topbar onToggleSidebar={toggleSidebar} />

        <main
          style={{
            flex: 1,
            padding: "1.75rem 1.75rem 2rem",
            overflowX: "hidden",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
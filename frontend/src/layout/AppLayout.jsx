// frontend/src/layout/AppLayout.jsx
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";
import "../App.css"; // Aseguramos que cargue los estilos nuevos

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      setIsSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-container">
      {/* Overlay para móvil */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
      />

      {/* Sidebar (Ahora controlada por el CSS para ser altura 100%) */}
      <aside
        className={`sidebar-container ${isSidebarOpen ? "open" : ""} ${
          isSidebarCollapsed ? "collapsed" : ""
        }`}
      >
        <Sidebar isCollapsed={isSidebarCollapsed} />
      </aside>

      {/* Columna principal */}
      <div className="main-content">
        {/* Topbar fija arriba */}
        <Topbar onToggleSidebar={toggleSidebar} />

        {/* AQUÍ está el cambio: main tiene su propio scroll independiente */}
        <main className="content-scroll-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
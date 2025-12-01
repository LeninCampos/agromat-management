import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Overlay oscuro para móvil */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar con clase condicional */}
      <div className={`sidebar-container ${isSidebarOpen ? "open" : ""}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Contenido Principal */}
      <div className="main-content">
        <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main style={{ padding: 16, background: "#ffffff", overflowX: "hidden" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
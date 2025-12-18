// frontend/src/layout/Topbar.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext"; // Importamos el contexto

function getPageTitle(pathname) {
  if (pathname.startsWith("/app/productos")) return "Productos";
  if (pathname.startsWith("/app/clientes")) return "Clientes";
  if (pathname.startsWith("/app/proveedores")) return "Proveedores";
  if (pathname.startsWith("/app/pedidos")) return "Pedidos";
  if (pathname.startsWith("/app/envios")) return "Despachos";
  if (pathname.startsWith("/app/empleados")) return "Empleados";
  if (pathname.startsWith("/app/zonas")) return "Zonas";
  if (pathname.startsWith("/app/suministros")) return "Entradas";
  if (pathname.startsWith("/app/dashboard")) return "Dashboard general";
  return "Panel de Administración";
}

export default function Topbar({ onToggleSidebar = () => { } }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth(); // Usamos el hook del contexto

  // Obtenemos los datos del usuario desde el contexto
  // Aseguramos que existan valores por defecto por seguridad
  const userName = user?.nombre || user?.nombre_empleado || "Usuario";
  const userRole = (user?.rol || "Invitado").toUpperCase();

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    logout(); // Usamos la función logout del contexto
    navigate("/login", { replace: true });
  };

  return (
    <header
      style={{
        height: "60px",
        minHeight: "60px",
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        zIndex: 40, // Aseguramos que la sombra quede sobre el contenido
        position: "sticky",
        top: 0,
      }}
    >
      {/* IZQUIERDA: Hamburguesa + texto */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0, flex: 1 }}>
        <button
          className="mobile-menu-btn"
          type="button"
          aria-label="Abrir menú de navegación"
          onClick={onToggleSidebar}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            color: "#374151"
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: "0.9rem", color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Bienvenido,
            <span style={{ color: "#111827", fontWeight: 600 }}>
              {" "}
              {userName}
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {pageTitle}
          </div>
        </div>
      </div>

      {/* DERECHA: rol + botón salir */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        <span
          style={{
            fontSize: "0.7rem",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#ecfdf3",
            color: "#16a34a",
            border: "1px solid #bbf7d0",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {userRole}
        </span>

        <button
          onClick={handleLogout}
          style={{
            padding: "6px 12px",
            borderRadius: "999px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "0.8rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#fee2e2";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#fef2f2";
          }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}
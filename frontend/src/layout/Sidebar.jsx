// src/layout/Sidebar.jsx
import { NavLink } from "react-router-dom";
import {
  Package,
  Users,
  ShoppingBag,
  Truck,
  Building2,
  UserCog,
  MapPin,
  LayoutDashboard,
  Archive,
} from "lucide-react";
import agromatLogo from "../assets/agromat-logo.png";

export default function Sidebar({ isCollapsed = false }) {
  const links = [
    { name: "Dashboard", icon: <LayoutDashboard size={18} />, to: "/app/dashboard" },
    { name: "Proveedores", icon: <Building2 size={18} />, to: "/app/proveedores" },
    { name: "Inventario", icon: <Package size={18} />, to: "/app/productos" },
    { name: "Entradas", icon: <Archive size={18} />, to: "/app/suministros" },
    { name: "Clientes", icon: <Users size={18} />, to: "/app/clientes" },
    { name: "Pedidos", icon: <ShoppingBag size={18} />, to: "/app/pedidos" },
    { name: "Despachos", icon: <Truck size={18} />, to: "/app/envios" },
    { name: "Empleados", icon: <UserCog size={18} />, to: "/app/empleados" },
    { name: "Zonas", icon: <MapPin size={18} />, to: "/app/zonas" },
  ];

  return (
    <aside
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(circle at top left, #1d2438 0, #020617 55%, #020617 100%)",
        color: "#e5e7eb",
        borderRight: "1px solid rgba(15,23,42,0.9)",
        display: "flex",
        flexDirection: "column",
        padding: isCollapsed ? "1.5rem 0.75rem" : "1.5rem",
        overflowY: "auto",
        overflowX: "hidden",
        transition: "padding 0.3s ease",
      }}
    >
      {/* Logo y título */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "2rem",
          justifyContent: isCollapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            minWidth: "40px",
            borderRadius: "50%",
            background: "rgba(15,23,42,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(148,163,184,0.25)",
          }}
        >
          <img
            src={agromatLogo}
            alt="Agromat"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        {!isCollapsed && (
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Agromat
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#9ca3af",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Panel administrativo
            </div>
          </div>
        )}
      </div>

      {/* Título de sección */}
      {!isCollapsed && (
        <div
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "#6b7280",
            marginBottom: "0.85rem",
            fontWeight: 600,
          }}
        >
          Navegación
        </div>
      )}

      {/* Links de navegación */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          flex: 1,
        }}
      >
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.to}
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " sidebar-link-active" : "")
            }
            style={{
              justifyContent: isCollapsed ? "center" : "flex-start",
              padding: isCollapsed ? "0.55rem" : "0.55rem 0.9rem",
            }}
            title={isCollapsed ? link.name : ""}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                minWidth: "22px",
              }}
            >
              {link.icon}
            </div>
            {!isCollapsed && (
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {link.name}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div
          style={{
            marginTop: "auto",
            paddingTop: "1rem",
            borderTop: "1px dashed rgba(51,65,85,0.9)",
            fontSize: "0.7rem",
            color: "#6b7280",
          }}
        >
          <div style={{ marginBottom: "0.25rem" }}>
            © {new Date().getFullYear()} Agromat
          </div>
          <div>Inventario inteligente</div>
        </div>
      )}
    </aside>
  );
}
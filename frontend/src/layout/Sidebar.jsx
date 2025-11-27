// frontend/src/layout/Sidebar.jsx
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
} from "lucide-react";
import agromatLogo from "../assets/agromat-logo.png";

export default function Sidebar() {
  const links = [
    { name: "Dashboard", icon: <LayoutDashboard size={18} />, to: "/app/dashboard" },
    { name: "Proveedores", icon: <Building2 size={18} />, to: "/app/proveedores" },
    { name: "Productos", icon: <Package size={18} />, to: "/app/productos" },
    { name: "Suministros", icon: <Archive size={18} />, to: "/app/suministros" },
    { name: "Clientes", icon: <Users size={18} />, to: "/app/clientes" },
    { name: "Pedidos", icon: <ShoppingBag size={18} />, to: "/app/pedidos" },
    { name: "Envíos", icon: <Truck size={18} />, to: "/app/envios" },
    { name: "Empleados", icon: <UserCog size={18} />, to: "/app/empleados" },
    { name: "Zonas", icon: <MapPin size={18} />, to: "/app/zonas" },
  ];

  return (
    <aside
      style={{
        width: "240px",
        height: "100vh",
        background: "radial-gradient(circle at top left, #1d2438 0, #020617 55%, #020617 100%)",
        color: "#e5e7eb",
        borderRight: "1px solid rgba(15,23,42,0.9)",
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 1rem 1.5rem",
        position: "sticky",
        top: 0,
      }}
    >
      {/* HEADER / LOGO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.75rem",
          padding: "0.25rem 0.5rem",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "999px",
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
        <div>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              letterSpacing: "0.03em",
            }}
          >
            Agromat
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#9ca3af",
            }}
          >
            Panel administrativo
          </div>
        </div>
      </div>

      {/* LABEL NAVEGACIÓN */}
      <div
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#6b7280",
          marginBottom: "0.75rem",
          paddingLeft: "0.4rem",
        }}
      >
        Navegación
      </div>

      {/* LINKS */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
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
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
              }}
            >
              {link.icon}
            </div>
            <span>{link.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* FOOTER */}
      <div
        style={{
          marginTop: "1.75rem",
          paddingTop: "0.75rem",
          borderTop: "1px dashed rgba(51,65,85,0.9)",
          fontSize: "0.7rem",
          color: "#6b7280",
        }}
      >
        <div style={{ marginBottom: "0.15rem" }}>
          © {new Date().getFullYear()} Agromat
        </div>
        <div>Inventario inteligente</div>
      </div>
    </aside>
  );
}

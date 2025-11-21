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

export default function Sidebar() {
  const links = [
    { name: "Dashboard", icon: <LayoutDashboard size={18} />, to: "/app/dashboard" },
    { name: "Productos", icon: <Package size={18} />, to: "/app/productos" },
    { name: "Clientes", icon: <Users size={18} />, to: "/app/clientes" },
    { name: "Pedidos", icon: <ShoppingBag size={18} />, to: "/app/pedidos" },
    { name: "Envíos", icon: <Truck size={18} />, to: "/app/envios" },
    { name: "Proveedores", icon: <Building2 size={18} />, to: "/app/proveedores" },
    { name: "Empleados", icon: <UserCog size={18} />, to: "/app/empleados" },
    { name: "Zonas", icon: <MapPin size={18} />, to: "/app/zonas" },
  ];

  return (
    <aside
      style={{
        width: "250px",
        height: "100vh",
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1px solid rgba(229,231,235,0.5)",
        boxShadow: "2px 0 12px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 1rem",
        position: "sticky",
        top: 0,
      }}
    >
      {/* LOGO */}
      <div
        style={{
          marginBottom: "2rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: "700",
            color: "#4F46E5",
            letterSpacing: "-0.5px",
            marginBottom: "0.25rem",
          }}
        >
          Agromat
        </h1>
        <span
          style={{
            fontSize: "0.85rem",
            color: "#9ca3af",
          }}
        >
          Panel administrativo
        </span>
      </div>

      {/* LINKS */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          flex: 1,
        }}
      >
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: isActive ? "600" : "500",
              color: isActive ? "#4F46E5" : "#374151",
              background: isActive
                ? "linear-gradient(90deg, rgba(79,70,229,0.1), rgba(79,70,229,0.05))"
                : "transparent",
              boxShadow: isActive ? "inset 0 0 6px rgba(79,70,229,0.1)" : "none",
              transition: "all 0.25s ease",
            })}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(90deg, rgba(79,70,229,0.08), rgba(79,70,229,0.03))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
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
          marginTop: "auto",
          borderTop: "1px solid rgba(229,231,235,0.5)",
          paddingTop: "1rem",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "#9ca3af",
        }}
      >
        © 2025 Agromat
      </div>
    </aside>
  );
}

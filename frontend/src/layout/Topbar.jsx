// frontend/src/layout/Topbar.jsx
import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function getInitials(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getPageTitle(pathname) {
  if (pathname.startsWith("/app/productos")) return "Productos";
  if (pathname.startsWith("/app/clientes")) return "Clientes";
  if (pathname.startsWith("/app/proveedores")) return "Proveedores";
  if (pathname.startsWith("/app/pedidos")) return "Pedidos";
  if (pathname.startsWith("/app/envios")) return "Despachos";
  if (pathname.startsWith("/app/empleados")) return "Empleados";
  if (pathname.startsWith("/app/zonas")) return "Zonas";
  if (pathname.startsWith("/app/suministros")) return "Entradas";
  return "Dashboard general";
}

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { name, role } = useMemo(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      return { name: "Admin", role: "ADMIN" };
    }
    try {
      const u = JSON.parse(raw);

      const displayName =
        u.nombre_empleado ||
        u.nombre ||
        u.nombre_usuario ||
        u.username ||
        "Admin";

      const displayRole =
        u.rol || u.role || (u.es_admin ? "ADMIN" : "USUARIO");

      return { name: displayName, role: (displayRole || "").toUpperCase() };
    } catch {
      return { name: "Admin", role: "ADMIN" };
    }
  }, []);

  const initials = getInitials(name);
  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <header
      style={{
        height: "56px",
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
      }}
    >
      {/* IZQUIERDA: saludo y ruta actual */}
      <div>
        <div
          style={{
            fontSize: "0.9rem",
            color: "#6b7280",
            marginBottom: "0.15rem",
          }}
        >
          Bienvenido, <span style={{ color: "#111827", fontWeight: 600 }}>{name}</span>
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
          }}
        >
          {pageTitle}
        </div>
      </div>

      {/* DERECHA: perfil + logout */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {/* Badge rol */}
        <span
          style={{
            fontSize: "0.7rem",
            padding: "2px 10px",
            borderRadius: "999px",
            background: "#ecfdf3",
            color: "#16a34a",
            border: "1px solid #bbf7d0",
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}
        >
          {role}
        </span>

        {/* Nombre + iniciales */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              background:
                "linear-gradient(135deg, #2563eb, #4f46e5, #22c55e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f9fafb",
              fontWeight: 600,
              fontSize: "0.8rem",
              boxShadow: "0 0 0 2px #e5e7eb",
            }}
          >
            {initials}
          </div>
          <span
            style={{
              fontSize: "0.85rem",
              color: "#111827",
              fontWeight: 500,
            }}
          >
            {name}
          </span>
        </div>

        {/* Botón logout */}
        <button
          onClick={handleLogout}
          style={{
            marginLeft: "0.75rem",
            padding: "6px 14px",
            borderRadius: "999px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "0.8rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <span>⟶</span>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

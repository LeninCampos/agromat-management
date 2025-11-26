// frontend/src/layout/Topbar.jsx
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function Topbar() {
  const navigate = useNavigate();

  // Intento leer datos si algún día los guardan, si no, uso defaults
  const userName = localStorage.getItem("userName") || "Admin Nuevo";
  const userRole = localStorage.getItem("userRole") || "admin";

  const handleLogout = () => {
    // Limpia lo típico de auth
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");

    navigate("/login");
  };

  return (
    <header
      style={{
        height: "64px",
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.75rem",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Lado izquierdo: título / espacio para breadcrumbs si luego quieres */}
      <div
        style={{
          fontSize: "0.9rem",
          color: "#6b7280",
        }}
      >
        Bienvenido,
        <span
          style={{
            fontWeight: 600,
            color: "#111827",
            marginLeft: "0.35rem",
          }}
        >
          {userName}
        </span>
      </div>

      {/* Lado derecho: usuario + logout */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {/* Avatar simple con iniciales */}
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "999px",
            background:
              "linear-gradient(135deg, rgba(79,70,229,1), rgba(34,197,94,1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "0.85rem",
            fontWeight: 600,
            boxShadow: "0 4px 10px rgba(15,23,42,0.25)",
          }}
        >
          {userName
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>

        {/* Nombre + rol */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "2px",
          }}
        >
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "#111827",
            }}
          >
            {userName}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(22,163,74,0.08)",
              color: "#16a34a",
              border: "1px solid rgba(34,197,94,0.35)",
            }}
          >
            {userRole}
          </span>
        </div>

        {/* Botón logout */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "7px 11px",
            borderRadius: "999px",
            border: "1px solid rgba(239,68,68,0.3)",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "0.8rem",
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <LogOut size={14} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}

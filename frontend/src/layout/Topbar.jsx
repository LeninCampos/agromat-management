import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        height: 56,
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 16px",
        gap: "16px",
      }}
    >
      {user && (
        <div style={{ textAlign: "right", fontSize: 14, color: "#374151" }}>
          <strong>{user.nombre}</strong>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{user.rol}</div>
        </div>
      )}

      <button
        onClick={handleLogout}
        style={{
          background: "#ef4444",
          color: "white",
          padding: "6px 12px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

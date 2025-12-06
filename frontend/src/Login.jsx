// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// 👈 usamos el axios configurado
import api from "./api/axios";

// si así te funcionaba antes, déjalo igual
import agromatLogo from "./assets/agromat-logo.png";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // 👇 YA NO localhost, solo la ruta relativa
      const { data } = await api.post("/auth/login", {
        correo,
        password,
      });

      if (!data.token) throw new Error("Token no recibido");

      // Guardar token
      localStorage.setItem("token", data.token);

      // Guardar usuario si el backend manda datos
      const rawUser = data.empleado || data.usuario || data.user || null;
      if (rawUser) {
        localStorage.setItem("user", JSON.stringify(rawUser));
      }

      Swal.fire({
        icon: "success",
        title: "Bienvenido",
        text: "Inicio de sesión exitoso",
        timer: 1200,
        showConfirmButton: false,
      });

      navigate("/app/dashboard", { replace: true });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Credenciales incorrectas",
        text: "Verifica tu correo o contraseña",
      });

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background:
          "radial-gradient(circle at top, #4f46e5 0, #312e81 32%, #020617 86%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Niebla de color */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.2,
          background:
            "radial-gradient(circle at top left, #a855f7 0, transparent 55%), radial-gradient(circle at bottom right, #22c55e 0, transparent 55%)",
          pointerEvents: "none",
        }}
      />

      {/* CARD */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          background: "rgba(248,250,252,0.98)",
          borderRadius: "24px",
          padding: "1.8rem 1.8rem 1.6rem",
          boxShadow:
            "0 26px 60px rgba(15,23,42,0.45), 0 0 0 1px rgba(148,163,184,0.22)",
          border: "1px solid rgba(226,232,240,0.85)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Badge versión */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "16px",
            fontSize: "0.7rem",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#eef2ff",
            color: "#4f46e5",
            fontWeight: 500,
          }}
        >
          v1.0
        </div>

        {/* Logo + título */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "1.4rem",
          }}
        >
          <div
            style={{
              width: "180px",
              height: "85px",
              borderRadius: "20px",
              margin: "0 auto 1rem",
              background:
                "conic-gradient(from 140deg, #4f46e5, #22c55e, #a855f7, #4f46e5)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "16px",
                background: "#ffffff",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={agromatLogo}
                alt="Agromat"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
              color: "#0f172a",
              letterSpacing: "0.02em",
            }}
          >
            Iniciar sesión
          </h2>
          <p
            style={{
              fontSize: "0.86rem",
              marginTop: "0.25rem",
              color: "#6b7280",
            }}
          >
            Panel administrativo de{" "}
            <span style={{ fontWeight: 600 }}>Agromat</span>
          </p>
        </div>

        {/* Chips descriptivos */}
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: "1.1rem",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "#eef2ff",
              color: "#4338ca",
              fontWeight: 500,
            }}
          >
            Inventario inteligente
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "#ecfdf3",
              color: "#15803d",
              fontWeight: 500,
            }}
          >
            Productos Agronomos
          </span>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#4b5563",
                marginBottom: "0.25rem",
              }}
            >
              Correo
            </label>
            <input
              type="email"
              placeholder="admin@agromat.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "0.65rem 0.8rem",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
                outline: "none",
                background: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#4b5563",
                marginBottom: "0.25rem",
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "0.65rem 0.8rem",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
                outline: "none",
                background: "#f9fafb",
              }}
            />
          </div>

          {/* ✅ 3.3 y 3.4 Modificados */}
          <div
            style={{
              marginTop: "0.15rem",
              marginBottom: "1.1rem",
              display: "flex",
              justifyContent: "center", // Centrado al quedar un solo elemento
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: "#9ca3af",
              }}
            >
              Uso interno — Agromat
            </span>
            {/* Se eliminó el enlace de problemas para entrar */}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "999px",
              border: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              background:
                "linear-gradient(135deg, #4F46E5, #6366F1, #8B5CF6)",
              color: "#ffffff",
              boxShadow: "0 14px 30px rgba(79,70,229,0.45)",
              cursor: loading ? "default" : "pointer",
              transition: "transform 0.1s ease, box-shadow 0.1s ease",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(1px)";
              e.currentTarget.style.boxShadow =
                "0 8px 20px rgba(79,70,229,0.35)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 14px 30px rgba(79,70,229,0.45)";
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1rem",
            textAlign: "center",
            fontSize: "0.7rem",
            color: "#9ca3af",
          }}
        >
          © {new Date().getFullYear()} Agromat · Inventario inteligente
        </div>
      </div>
    </div>
  );
}
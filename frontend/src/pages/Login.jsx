// src/pages/Login.jsx
import { useState } from "react";
import Swal from "sweetalert2";
import { loginRequest } from "../api/auth"; // 👈 Asegura que esto exista

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await loginRequest({ correo, password });

      // 👇 GUARDAR TOKEN CORRECTAMENTE
      localStorage.setItem("token", data.token);

      Swal.fire("Bienvenido", "Inicio de sesión correcto", "success");

      // 👇 REDIRECCIONAR AL PANEL
      window.location.href = "/app/productos";

    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Credenciales incorrectas", "error");
    }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh", background: "#f3f4f6" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)"
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Ingresar</h2>

        <label>Correo:</label>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          style={{ width: "100%", marginBottom: "12px", padding: "10px" }}
        />

        <label>Contraseña:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", marginBottom: "12px", padding: "10px" }}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            background: "#4F46E5",
            color: "white",
            padding: "10px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

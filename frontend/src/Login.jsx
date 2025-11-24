import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await axios.post("http://localhost:4000/api/auth/login", {
        correo,
        password,
      });

      if (!data.token) {
        throw new Error("Token no recibido");
      }

      localStorage.setItem("token", data.token);

      Swal.fire({
        icon: "success",
        title: "Bienvenido",
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
      setPassword("");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Iniciar Sesión</h2>
        <p style={styles.subtitle}>Panel administrativo Agromat</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          <label style={styles.label}>
            Correo:
            <input
              type="email"
              style={styles.input}
              placeholder="example@agromat.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </label>

          <label style={styles.label}>
            Contraseña:
            <input
              type="password"
              style={styles.input}
              placeholder="•••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" style={styles.button}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #eef2ff, #f9fafb 40%, #f3f4ff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "2.2rem 2.4rem",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
    border: "1px solid rgba(148, 163, 184, 0.25)",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 700,
    textAlign: "center",
    margin: 0,
    color: "#111827",
  },
  subtitle: {
    fontSize: "0.9rem",
    textAlign: "center",
    marginTop: "0.4rem",
    marginBottom: "1.6rem",
    color: "#6b7280",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
  },
  label: {
    fontSize: "0.85rem",
    color: "#4b5563",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  input: {
    padding: "0.65rem 0.8rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    outline: "none",
    transition: "all 0.15s ease",
  },
  button: {
    marginTop: "0.5rem",
    width: "100%",
    padding: "0.7rem 1rem",
    borderRadius: "999px",
    border: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
    background: "linear-gradient(135deg, #4F46E5, #6366F1, #8B5CF6)",
    color: "#ffffff",
    boxShadow: "0 10px 25px rgba(79, 70, 229, 0.35)",
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
  },
};

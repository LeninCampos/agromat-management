// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { getProductos } from "../api/productos";
import { getClientes } from "../api/clientes";
import { getPedidos } from "../api/pedidos";
import { getEnvios } from "../api/envios";

export default function Dashboard() {
  const [stats, setStats] = useState({
    productos: 0,
    clientes: 0,
    pedidos: 0,
    envios: 0,
  });

  const [ultimosPedidos, setUltimosPedidos] = useState([]);

  const loadData = async () => {
    try {
      const [prodRes, cliRes, pedRes, envRes] = await Promise.all([
        getProductos(),
        getClientes(),
        getPedidos(),
        getEnvios(),
      ]);

      setStats({
        productos: prodRes.data.length,
        clientes: cliRes.data.length,
        pedidos: pedRes.data.length,
        envios: envRes.data.length,
      });

      setUltimosPedidos(pedRes.data.slice(-5).reverse());
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ padding: "1.5rem" }}>

      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.2rem" }}>
        📊 Dashboard general
      </h2>

      {/* KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <Card title="Productos" value={stats.productos} icon="📦" color="#4F46E5" />
        <Card title="Clientes" value={stats.clientes} icon="👥" color="#0EA5E9" />
        <Card title="Pedidos" value={stats.pedidos} icon="🧾" color="#10B981" />
        <Card title="Envíos" value={stats.envios} icon="🚚" color="#F59E0B" />
      </div>

      {/* ÚLTIMOS PEDIDOS */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.2rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
          📅 Últimos pedidos
        </h3>

        {ultimosPedidos.length === 0 ? (
          <p>No hay pedidos registrados.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb", color: "#555" }}>
              <tr>
                <th style={{ padding: "10px" }}>ID</th>
                <th style={{ padding: "10px" }}>Fecha</th>
                <th style={{ padding: "10px" }}>Status</th>
                <th style={{ padding: "10px" }}>Cliente</th>
                <th style={{ padding: "10px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ultimosPedidos.map((p) => (
                <tr key={p.id_pedido} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{p.id_pedido}</td>
                  <td style={{ padding: "10px" }}>{p.fecha_pedido}</td>
                  <td style={{ padding: "10px" }}>{p.status}</td>
                  <td style={{ padding: "10px" }}>#{p.id_cliente}</td>
                  <td style={{ padding: "10px" }}>
                    ${Number(p.total ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

/* Card component */
function Card({ title, value, icon, color }) {
  return (
    <div
      style={{
        background: "white",
        padding: "1.2rem",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          background: color,
          color: "white",
          width: "55px",
          height: "55px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>

      <div>
        <p style={{ margin: 0, color: "#555", fontSize: "0.9rem" }}>{title}</p>
        <h3 style={{ margin: 0, fontSize: "1.6rem" }}>{value}</h3>
      </div>
    </div>
  );
}

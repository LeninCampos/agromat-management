import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [ultimosPedidos, setUltimosPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);

      const [prodRes, cliRes, pedRes, envRes] = await Promise.all([
        getProductos(),
        getClientes(),
        getPedidos(),
        getEnvios(),
      ]);

      const prodData = prodRes.data || [];
      const cliData = cliRes.data || [];
      const pedData = pedRes.data || [];
      const envData = envRes.data || [];

      setProductos(prodData);
      setPedidos(pedData);
      setEnvios(envData);

      setStats({
        productos: prodData.length,
        clientes: cliData.length,
        pedidos: pedData.length,
        envios: envData.length,
      });

      setUltimosPedidos(pedData.slice(-5).reverse());
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ minHeight: "100%" }}>
      {/* CONTENEDOR CENTRAL */}
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.75rem",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: 600,
                margin: 0,
                color: "#111827",
              }}
            >
              Dashboard general
            </h2>
            <p
              style={{
                margin: "0.35rem 0 0",
                fontSize: "0.9rem",
                color: "#6b7280",
              }}
            >
              Vista general del inventario, clientes y operaciones de Agromat
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: "0.55rem 1.2rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "0.9rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: loading ? "default" : "pointer",
              boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "0.95rem" }}>{loading ? "⏳" : "⟳"}</span>
            {loading ? "Actualizando..." : "Actualizar datos"}
          </button>
        </header>

        {/* TARJETAS DE RESUMEN */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.75rem",
          }}
        >
          <StatCard
            title="Inventario"
            value={stats.productos}
            icon="📦"
            tag="Registrados en inventario"
            color="#2563eb"
            onClick={() => navigate("/app/productos")}
          />
          <StatCard
            title="Clientes"
            value={stats.clientes}
            icon="👥"
            tag="Cuentas activas"
            color="#22c55e"
            onClick={() => navigate("/app/clientes")}
          />
          <StatCard
            title="Pedidos"
            value={stats.pedidos}
            icon="🧾"
            tag="Historial de ventas"
            color="#0EA5E9"
            onClick={() => navigate("/app/pedidos")}
          />
          <StatCard
            title="Despachos"
            value={stats.envios}
            icon="🚚"
            tag="Órdenes despachadas"
            color="#F59E0B"
            onClick={() => navigate("/app/envios")}
          />
        </section>

        {/* SECCIÓN: ÚLTIMOS PEDIDOS + ACTIVIDAD */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.2rem",
          }}
        >
          {/* ÚLTIMOS PEDIDOS */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "1.1rem 1.2rem",
              boxShadow: "0 2px 10px rgba(15,23,42,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.8rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "#111827",
                }}
              >
                📅 Últimos pedidos
              </h3>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#4b5563",
                  padding: "0.15rem 0.6rem",
                  borderRadius: "999px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #dbeafe",
                }}
              >
                {ultimosPedidos.length} recientes
              </span>
            </div>

            {ultimosPedidos.length === 0 ? (
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#6b7280",
                  marginTop: "0.4rem",
                }}
              >
                No hay pedidos registrados.
              </p>
            ) : (
              <div
                style={{
                  maxHeight: "260px",
                  overflowY: "auto",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#f9fafb",
                        color: "#6b7280",
                      }}
                    >
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left" }}>
                        ID
                      </th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left" }}>
                        Fecha
                      </th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left" }}>
                        Status
                      </th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left" }}>
                        Cliente
                      </th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosPedidos.map((p, idx) => (
                      <tr
                        key={p.id_pedido}
                        style={{
                          borderTop: "1px solid #e5e7eb",
                          backgroundColor:
                            idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}
                      >
                        <td style={{ padding: "0.55rem 0.75rem", color: "#111827" }}>
                          #{p.id_pedido}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "#374151" }}>
                          {p.fecha_pedido}
                        </td>
                        <td
                          style={{
                            padding: "0.55rem 0.75rem",
                            color: (p.status || "")
                              .toUpperCase()
                              .includes("COMPLET")
                              ? "#16a34a"
                              : (p.status || "")
                                  .toUpperCase()
                                  .includes("CANCEL")
                              ? "#dc2626"
                              : "#111827",
                          }}
                        >
                          {p.status}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "#374151" }}>
                          #{p.id_cliente}
                        </td>
                        <td
                          style={{
                            padding: "0.55rem 0.75rem",
                            textAlign: "right",
                            color: "#111827",
                          }}
                        >
                          ${Number(p.total ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ACTIVIDAD RECIENTE */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "1rem 1.1rem",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
              alignSelf: "flex-start",
              minHeight: "260px",
            }}
          >
            <h4
              style={{
                margin: 0,
                marginBottom: "0.6rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              ⚡ Actividad reciente
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                fontSize: "0.82rem",
                color: "#4b5563",
              }}
            >
              <li style={{ marginBottom: "0.4rem" }}>
                • {stats.productos} producto(s) registrados en inventario.
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                • {stats.clientes} cliente(s) activos en el sistema.
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                • {stats.pedidos} pedido(s) registrados en el histórico.
              </li>
              <li>• {stats.envios} despacho(s) registrados hasta ahora.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, tag, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        padding: "1rem 1.1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.9rem",
        boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
        border: "1px solid #e5e7eb",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.08s ease, box-shadow 0.08s ease",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow =
            "0 4px 14px rgba(15,23,42,0.12)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 2px 10px rgba(15,23,42,0.06)";
        }
      }}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          backgroundColor: color,
          color: "#f9fafb",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </p>
        <div
          style={{
            marginTop: "0.15rem",
            display: "flex",
            alignItems: "baseline",
            gap: "0.35rem",
          }}
        >
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {value}
          </span>
        </div>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.8rem",
            color: "#6b7280",
          }}
        >
          {tag}
        </p>
      </div>
    </div>
  );
}

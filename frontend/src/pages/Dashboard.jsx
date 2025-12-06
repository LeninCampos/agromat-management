import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProductos } from "../api/productos";
import { getClientes } from "../api/clientes";
import { getPedidos } from "../api/pedidos";
import { getEnvios } from "../api/envios";
// ✅ Importamos la API de suministros para el punto 3.6
import { getSuministros } from "../api/suministros";

export default function Dashboard() {
  const [stats, setStats] = useState({
    productos: 0,
    totalUnidades: 0, // ✅ 3.5 Total de stock
    clientes: 0,
    pedidos: 0,
    envios: 0,
  });
  
  // ✅ 3.7 Datos para actividad reciente (últimos 30 días)
  const [actividadMes, setActividadMes] = useState({
    pedidos: 0,
    ingresos: 0,
    clientes: 0
  });

  const [ultimosPedidos, setUltimosPedidos] = useState([]);
  const [ultimosIngresos, setUltimosIngresos] = useState([]); // ✅ 3.6
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);

      const [prodRes, cliRes, pedRes, envRes, sumRes] = await Promise.all([
        getProductos(),
        getClientes(),
        getPedidos(),
        getEnvios(),
        getSuministros(), // Cargar suministros
      ]);

      const prodData = prodRes.data || [];
      const cliData = cliRes.data || [];
      const pedData = pedRes.data || [];
      const envData = envRes.data || [];
      const sumData = sumRes.data || [];

      // ✅ 3.5 Calcular stock total (suma de unidades)
      const totalStock = prodData.reduce((acc, p) => acc + Number(p.existencias || p.stock || 0), 0);

      // ✅ 3.7 Calcular actividad de los últimos 30 días
      const hace30dias = new Date();
      hace30dias.setDate(hace30dias.getDate() - 30);

      const pedidosMes = pedData.filter(p => new Date(p.fecha_pedido) >= hace30dias).length;
      const ingresosMes = sumData.filter(s => new Date(s.fecha_llegada) >= hace30dias).length;
      const clientesMes = cliData.filter(c => c.fecha_alta && new Date(c.fecha_alta) >= hace30dias).length;

      setStats({
        productos: prodData.length,
        totalUnidades: totalStock,
        clientes: cliData.length,
        pedidos: pedData.length,
        envios: envData.length,
      });

      setActividadMes({
        pedidos: pedidosMes,
        ingresos: ingresosMes,
        clientes: clientesMes
      });

      // Últimos 5 pedidos
      setUltimosPedidos(pedData.slice(-5).reverse());

      // ✅ 3.6 Últimos 5 ingresos
      // Ordenamos por ID descendente (o fecha si prefieres) asumiendo que ID mayor es más reciente
      const ingresosOrdenados = [...sumData].sort((a, b) => b.id_suministro - a.id_suministro);
      setUltimosIngresos(ingresosOrdenados.slice(0, 5));

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
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
          <div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 600, margin: 0, color: "#111827" }}>
              Dashboard general
            </h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
              Resumen operativo de Agromat
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
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
          
          {/* ✅ 3.5 Aclarar número inventario (Productos únicos vs Stock total) */}
          <StatCard
            title="Inventario"
            value={stats.productos}
            icon="📦"
            tag={`${stats.totalUnidades.toLocaleString()} unidades totales`} // Subtítulo aclaratorio
            color="#2563eb"
            onClick={() => navigate("/app/productos")}
          />
          
          <StatCard
            title="Clientes"
            value={stats.clientes}
            icon="👥"
            tag="Cuentas registradas"
            color="#22c55e"
            onClick={() => navigate("/app/clientes")}
          />
          
          {/* ✅ 3.8 Link a pedidos (ya existía, lo mantenemos) */}
          <StatCard
            title="Pedidos"
            value={stats.pedidos}
            icon="🧾"
            tag="Pedidos históricos"
            color="#0EA5E9"
            onClick={() => navigate("/app/pedidos")}
          />
          
          <StatCard
            title="Despachos"
            value={stats.envios}
            icon="🚚"
            tag="Envíos realizados"
            color="#F59E0B"
            onClick={() => navigate("/app/envios")}
          />
        </section>

        {/* GRID PRINCIPAL */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
          
          {/* COLUMNA IZQUIERDA: TABLAS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* ÚLTIMOS PEDIDOS */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "1.1rem 1.2rem", boxShadow: "0 2px 10px rgba(15,23,42,0.08)", border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "#111827" }}>
                  📅 Últimos Pedidos
                </h3>
                <span onClick={() => navigate("/app/pedidos")} style={{ fontSize: "0.75rem", color: "#2563eb", cursor: "pointer", fontWeight: 500 }}>
                  Ver todos →
                </span>
              </div>

              {ultimosPedidos.length === 0 ? (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>No hay pedidos recientes.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", color: "#6b7280" }}>
                        <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>Fecha</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>Cliente</th>
                        <th style={{ padding: "8px", textAlign: "right" }}>Total</th>
                        <th style={{ padding: "8px", textAlign: "center" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimosPedidos.map((p) => (
                        <tr key={p.id_pedido} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px", fontWeight: 500 }}>#{p.id_pedido}</td>
                          <td style={{ padding: "8px", color: "#6b7280" }}>{p.fecha_pedido}</td>
                          <td style={{ padding: "8px" }}>{p.Cliente?.nombre_cliente || "N/A"}</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>${Number(p.total).toFixed(2)}</td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ✅ 3.6 SECCIÓN: ÚLTIMOS INGRESOS */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "1.1rem 1.2rem", boxShadow: "0 2px 10px rgba(15,23,42,0.08)", border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "#111827" }}>
                  📥 Últimos Ingresos (Suministros)
                </h3>
                <span onClick={() => navigate("/app/suministros")} style={{ fontSize: "0.75rem", color: "#2563eb", cursor: "pointer", fontWeight: 500 }}>
                  Ver todos →
                </span>
              </div>

              {ultimosIngresos.length === 0 ? (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>No hay ingresos recientes.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", color: "#6b7280" }}>
                        <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>Fecha Llegada</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>Proveedor</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>Recibió</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimosIngresos.map((s) => (
                        <tr key={s.id_suministro} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px", fontWeight: 500 }}>#{s.id_suministro}</td>
                          <td style={{ padding: "8px", color: "#6b7280" }}>
                            {s.fecha_llegada} <span style={{fontSize:"0.8em"}}>{s.hora_llegada}</span>
                          </td>
                          <td style={{ padding: "8px" }}>{s.Proveedor?.nombre_proveedor || "Desconocido"}</td>
                          <td style={{ padding: "8px" }}>{s.Empleado?.nombre_empleado || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* COLUMNA DERECHA: RESUMEN ACTIVIDAD */}
          {/* ✅ 3.7 Aclarar período actividad */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ backgroundColor: "#ffffff", padding: "1.2rem", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(15,23,42,0.05)" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: 600, color: "#111827", display:"flex", alignItems:"center", gap:"8px" }}>
                ⚡ Actividad (Últimos 30 días)
              </h4>
              
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem", color: "#4b5563", display: "flex", flexDirection: "column", gap: "12px" }}>
                <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e5e7eb", paddingBottom: "8px" }}>
                  <span>🛒 Pedidos nuevos</span>
                  <strong style={{color:"#111"}}>{actividadMes.pedidos}</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e5e7eb", paddingBottom: "8px" }}>
                  <span>📦 Ingresos mercancía</span>
                  <strong style={{color:"#111"}}>{actividadMes.ingresos}</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>👤 Clientes nuevos</span>
                  <strong style={{color:"#111"}}>{actividadMes.clientes}</strong>
                </li>
              </ul>
            </div>

            {/* Accesos rápidos extra */}
            <div style={{ backgroundColor: "#f0fdf4", padding: "1.2rem", borderRadius: "14px", border: "1px solid #bbf7d0" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#166534" }}>¿Necesitas ayuda?</h4>
              <p style={{ fontSize: "0.8rem", color: "#15803d", margin: 0 }}>
                Contacta al soporte técnico si tienes problemas con el inventario.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Componente simple para status
function StatusBadge({ status }) {
  let bg = "#f3f4f6";
  let color = "#374151";

  const s = (status || "").toLowerCase();
  if (s.includes("complet") || s.includes("entregado")) {
    bg = "#dcfce7";
    color = "#166534";
  } else if (s.includes("cancel")) {
    bg = "#fee2e2";
    color = "#991b1b";
  } else if (s.includes("proceso") || s.includes("transito")) {
    bg = "#e0f2fe";
    color = "#075985";
  }

  return (
    <span style={{ backgroundColor: bg, color: color, padding: "2px 8px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
      {status}
    </span>
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
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,23,42,0.12)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(15,23,42,0.06)";
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
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </p>
        <div style={{ marginTop: "0.15rem", display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
          <span style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>
            {value}
          </span>
        </div>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
          {tag}
        </p>
      </div>
    </div>
  );
}
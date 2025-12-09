// frontend/src/pages/HistorialProducto.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getMovimientosProducto } from "../api/productos";

export default function HistorialProducto() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [movimientosRaw, setMovimientosRaw] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await getMovimientosProducto(id);

      const data = res.data || {};
      const prod = data.producto || null;
      const resum = data.resumen || null;

      let movimientos =
        data.movimientos ||
        data.data ||
        (Array.isArray(data) ? data : []);

      if (!Array.isArray(movimientos)) {
        movimientos = [];
      }

      setProducto(prod);
      setMovimientosRaw(movimientos);
      setResumen(resum);
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        "No pude cargar el historial de este producto",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) cargar();
  }, [id]);

  // Normalizar movimientos y calcular saldo acumulado
  const movimientos = useMemo(() => {
    if (!movimientosRaw || movimientosRaw.length === 0) return [];

    const sorted = [...movimientosRaw].sort((a, b) => {
      const fa = String(a.fecha || a.fecha_movimiento || "").slice(0, 10);
      const fb = String(b.fecha || b.fecha_movimiento || "").slice(0, 10);
      if (fa < fb) return -1;
      if (fa > fb) return 1;
      return 0;
    });

    let saldoAcum = 0;

    return sorted.map((m) => {
      const fecha =
        m.fecha ||
        m.fecha_movimiento ||
        m.fecha_pedido ||
        m.fecha_suministro ||
        "";
      const entradas =
        Number(
          m.entradas ??
            m.total_entrada ??
            m.cantidad_entrada ??
            m.cantidad_entradas ??
            0
        ) || 0;
      const salidas =
        Number(
          m.salidas ??
            m.total_salida ??
            m.cantidad_salida ??
            m.cantidad_salidas ??
            0
        ) || 0;

      saldoAcum += entradas - salidas;

      return {
        fecha: String(fecha).slice(0, 10),
        entradas,
        salidas,
        saldoAcumulado: saldoAcum,
      };
    });
  }, [movimientosRaw]);

  // Calcular máximo y mínimo para la escala
  const { maxSaldo, minSaldo } = useMemo(() => {
    if (movimientos.length === 0) return { maxSaldo: 0, minSaldo: 0 };
    const saldos = movimientos.map((m) => m.saldoAcumulado);
    return {
      maxSaldo: Math.max(...saldos),
      minSaldo: Math.min(...saldos, 0),
    };
  }, [movimientos]);

  const totalEntradas = useMemo(
    () => movimientos.reduce((sum, m) => sum + m.entradas, 0),
    [movimientos]
  );
  const totalSalidas = useMemo(
    () => movimientos.reduce((sum, m) => sum + m.salidas, 0),
    [movimientos]
  );

  const stockActual = useMemo(() => {
    if (movimientos.length === 0) return 0;
    return movimientos[movimientos.length - 1].saldoAcumulado;
  }, [movimientos]);

  // Generar puntos para el SVG con mejor escala
  const chartData = useMemo(() => {
    if (movimientos.length === 0) return { points: "", areaPoints: "", circles: [] };

    const width = 700;
    const height = 200;
    const paddingX = 50;
    const paddingY = 30;
    const paddingBottom = 40;
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY - paddingBottom;

    const range = maxSaldo - minSaldo || 1;

    const points = movimientos.map((m, idx) => {
      const x =
        movimientos.length === 1
          ? width / 2
          : paddingX + (idx / (movimientos.length - 1)) * usableWidth;
      const ratio = (m.saldoAcumulado - minSaldo) / range;
      const y = paddingY + (1 - ratio) * usableHeight;
      return { x, y, ...m };
    });

    const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

    // Área bajo la curva
    const firstX = points[0]?.x || paddingX;
    const lastX = points[points.length - 1]?.x || width - paddingX;
    const baseY = paddingY + usableHeight;
    const areaPoints = `${firstX},${baseY} ${linePoints} ${lastX},${baseY}`;

    return { points: linePoints, areaPoints, circles: points };
  }, [movimientos, maxSaldo, minSaldo]);

  // Generar líneas de la cuadrícula
  const gridLines = useMemo(() => {
    const lines = [];
    const width = 700;
    const height = 200;
    const paddingX = 50;
    const paddingY = 30;
    const paddingBottom = 40;
    const usableHeight = height - paddingY - paddingBottom;
    const range = maxSaldo - minSaldo || 1;

    // 5 líneas horizontales
    for (let i = 0; i <= 4; i++) {
      const y = paddingY + (i / 4) * usableHeight;
      const value = Math.round(maxSaldo - (i / 4) * range);
      lines.push({ y, value, x1: paddingX, x2: width - paddingX });
    }

    return lines;
  }, [maxSaldo, minSaldo]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "0.25rem",
            }}
          >
            📈 Historial de inventario
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
            Producto:{" "}
            <span style={{ fontWeight: 600 }}>
              {producto?.nombre_producto || id}
            </span>
          </p>
        </div>

        <button
          onClick={() => navigate("/app/productos")}
          style={{
            padding: "8px 14px",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            background: "white",
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
          onMouseLeave={(e) => (e.target.style.background = "white")}
        >
          ← Volver a productos
        </button>
      </div>

      {loading ? (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #e5e7eb",
              borderTopColor: "#4F46E5",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          Cargando historial...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* CARDS DE RESUMEN */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            {/* Stock Actual */}
            <div
              style={{
                background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                borderRadius: "12px",
                padding: "20px",
                color: "white",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
                Stock Actual
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "2rem",
                  fontWeight: 700,
                }}
              >
                {stockActual}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", opacity: 0.8 }}>
                unidades
              </p>
            </div>

            {/* Total Entradas */}
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                Total Entradas
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#059669",
                }}
              >
                +{totalEntradas}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
                suministros
              </p>
            </div>

            {/* Total Salidas */}
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                Total Salidas
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#DC2626",
                }}
              >
                -{totalSalidas}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
                pedidos
              </p>
            </div>

            {/* Movimientos */}
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                Días con Movimiento
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {movimientos.length}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
                registros
              </p>
            </div>
          </div>

          {/* CARD: Gráfica */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "1.25rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    marginBottom: "4px",
                    color: "#111827",
                  }}
                >
                  Evolución del Stock
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    margin: 0,
                  }}
                >
                  Saldo acumulado basado en entradas y salidas
                </p>
              </div>

              {movimientos.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    fontSize: "0.8rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "3px",
                        background: "#4F46E5",
                        borderRadius: "2px",
                      }}
                    />
                    <span style={{ color: "#6b7280" }}>Saldo</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        background: "#4F46E5",
                        borderRadius: "50%",
                      }}
                    />
                    <span style={{ color: "#6b7280" }}>Movimiento</span>
                  </div>
                </div>
              )}
            </div>

            {movimientos.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  fontSize: "0.95rem",
                  color: "#9ca3af",
                  borderRadius: "8px",
                  background: "#f9fafb",
                  border: "2px dashed #e5e7eb",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📊</div>
                <p style={{ margin: 0, fontWeight: 500, color: "#6b7280" }}>
                  Sin movimientos registrados
                </p>
                <p style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
                  Los movimientos aparecerán aquí cuando se registren entradas o salidas
                </p>
              </div>
            ) : (
              <div style={{ width: "100%", overflowX: "auto" }}>
                <svg
                  viewBox="0 0 700 240"
                  style={{ width: "100%", minWidth: "500px", maxWidth: "100%" }}
                >
                  {/* Definir gradiente */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                    </filter>
                  </defs>

                  {/* Fondo */}
                  <rect x="0" y="0" width="700" height="240" fill="#fafafa" rx="8" />

                  {/* Líneas de cuadrícula */}
                  {gridLines.map((line, idx) => (
                    <g key={idx}>
                      <line
                        x1={line.x1}
                        y1={line.y}
                        x2={line.x2}
                        y2={line.y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray={idx === gridLines.length - 1 ? "0" : "4,4"}
                      />
                      <text
                        x={line.x1 - 8}
                        y={line.y + 4}
                        fill="#9ca3af"
                        fontSize="11"
                        textAnchor="end"
                      >
                        {line.value}
                      </text>
                    </g>
                  ))}

                  {/* Área bajo la curva */}
                  <polygon
                    points={chartData.areaPoints}
                    fill="url(#areaGradient)"
                  />

                  {/* Línea principal */}
                  <polyline
                    points={chartData.points}
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#shadow)"
                  />

                  {/* Puntos con tooltip */}
                  {chartData.circles.map((point, idx) => (
                    <g key={idx}>
                      {/* Círculo exterior (halo) */}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="8"
                        fill="#4F46E5"
                        fillOpacity="0.1"
                      />
                      {/* Círculo principal */}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill="white"
                        stroke="#4F46E5"
                        strokeWidth="2.5"
                        style={{ cursor: "pointer" }}
                      />
                      {/* Etiqueta para el primer y último punto */}
                      {(idx === 0 || idx === chartData.circles.length - 1) && (
                        <text
                          x={point.x}
                          y={point.y - 14}
                          fill="#4F46E5"
                          fontSize="12"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {point.saldoAcumulado}
                        </text>
                      )}
                    </g>
                  ))}

                  {/* Etiquetas de fechas en el eje X */}
                  {chartData.circles.length > 0 && (
                    <>
                      <text
                        x={chartData.circles[0].x}
                        y="225"
                        fill="#6b7280"
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {chartData.circles[0].fecha}
                      </text>
                      {chartData.circles.length > 1 && (
                        <text
                          x={chartData.circles[chartData.circles.length - 1].x}
                          y="225"
                          fill="#6b7280"
                          fontSize="11"
                          textAnchor="middle"
                        >
                          {chartData.circles[chartData.circles.length - 1].fecha}
                        </text>
                      )}
                    </>
                  )}
                </svg>

                {/* Leyenda inferior */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "12px",
                    padding: "12px 16px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    color: "#6b7280",
                  }}
                >
                  <span>
                    📅 Período: <strong>{movimientos[0]?.fecha}</strong> →{" "}
                    <strong>{movimientos[movimientos.length - 1]?.fecha}</strong>
                  </span>
                  <span>
                    📊 Máximo alcanzado: <strong>{maxSaldo}</strong> | Mínimo:{" "}
                    <strong>{minSaldo}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CARD: Detalle por fecha */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    marginBottom: "4px",
                    color: "#111827",
                  }}
                >
                  Detalle por fecha
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    margin: 0,
                  }}
                >
                  Historial de entradas y salidas agrupado por día
                </p>
              </div>
            </div>

            {movimientos.length === 0 ? (
              <div
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  fontSize: "0.9rem",
                  color: "#9ca3af",
                  borderRadius: "8px",
                  background: "#f9fafb",
                  border: "2px dashed #e5e7eb",
                }}
              >
                No hay datos para mostrar
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.9rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      <th
                        style={{
                          textAlign: "left",
                          padding: "14px 16px",
                          color: "#374151",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Fecha
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "14px 16px",
                          color: "#059669",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Entradas
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "14px 16px",
                          color: "#DC2626",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Salidas
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "14px 16px",
                          color: "#374151",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Saldo Acumulado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m, idx) => {
                      const cambio = m.entradas - m.salidas;
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#fafafa")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "white")
                          }
                        >
                          <td
                            style={{
                              padding: "14px 16px",
                              color: "#111827",
                              fontWeight: 500,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background:
                                    cambio > 0
                                      ? "#10B981"
                                      : cambio < 0
                                      ? "#EF4444"
                                      : "#9CA3AF",
                                }}
                              />
                              {m.fecha}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "right",
                            }}
                          >
                            {m.entradas > 0 ? (
                              <span
                                style={{
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                }}
                              >
                                +{m.entradas}
                              </span>
                            ) : (
                              <span style={{ color: "#d1d5db" }}>—</span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "right",
                            }}
                          >
                            {m.salidas > 0 ? (
                              <span
                                style={{
                                  background: "#fef2f2",
                                  color: "#DC2626",
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                }}
                              >
                                -{m.salidas}
                              </span>
                            ) : (
                              <span style={{ color: "#d1d5db" }}>—</span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "right",
                              fontWeight: 600,
                              fontSize: "1rem",
                              color: "#111827",
                            }}
                          >
                            {m.saldoAcumulado}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                        borderTop: "2px solid #0ea5e9",
                      }}
                    >
                      <td
                        style={{
                          padding: "14px 16px",
                          fontWeight: 700,
                          color: "#0369a1",
                        }}
                      >
                        TOTALES
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#059669",
                          fontSize: "1rem",
                        }}
                      >
                        +{totalEntradas}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#DC2626",
                          fontSize: "1rem",
                        }}
                      >
                        -{totalSalidas}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#0369a1",
                          fontSize: "1.1rem",
                        }}
                      >
                        {stockActual}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* NOTA: Discrepancia de stock */}
          {producto && Number(producto.stock) !== stockActual && (
            <div
              style={{
                marginTop: "1rem",
                padding: "16px 20px",
                background: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: "#92400e" }}>
                  Discrepancia detectada
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#a16207" }}>
                  El stock en inventario ({producto.stock}) no coincide con el
                  calculado por movimientos ({stockActual}). Se recomienda
                  verificar y recalcular el stock.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
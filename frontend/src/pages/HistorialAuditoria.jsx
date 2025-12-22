// src/pages/HistorialAuditoria.jsx
import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import {
  getAuditLogs,
  getTablasAuditadas,
  getAuditStats,
  getRegistroHistorial,
  getAuditLogById,
  getTiposCambio,
  getSearchSuggestions,
} from "../api/audit";

// =============================
// Labels / Styles
// =============================
const TABLA_LABELS = {
  clientes: "Clientes",
  productos: "Productos",
  pedidos: "Pedidos",
  empleados: "Empleados",
  proveedor: "Proveedores",
  zonas: "Zonas",
  envios: "Envíos",
  envio_detalle: "Detalle Envío",
  suministro: "Suministros",
  suministra: "Detalle Suministro",
  contiene: "Detalle Pedido",
  seubica: "Ubicaciones",
  ajustes_stock: "Ajustes de Stock",
};

const TABLA_COLORS = {
  clientes: { bg: "#DBEAFE", text: "#1E40AF" },
  productos: { bg: "#F3E8FF", text: "#6D28D9" },
  pedidos: { bg: "#FEF3C7", text: "#92400E" },
  empleados: { bg: "#E0E7FF", text: "#3730A3" },
  proveedor: { bg: "#D1FAE5", text: "#065F46" },
  zonas: { bg: "#FCE7F3", text: "#9D174D" },
  envios: { bg: "#CFFAFE", text: "#0E7490" },
  envio_detalle: { bg: "#CFFAFE", text: "#0E7490" },
  suministro: { bg: "#FED7AA", text: "#9A3412" },
  suministra: { bg: "#FDE68A", text: "#854D0E" },
  contiene: { bg: "#E9D5FF", text: "#6B21A8" },
  seubica: { bg: "#CCFBF1", text: "#0F766E" },
  ajustes_stock: { bg: "#FEE2E2", text: "#991B1B" },
};

const ACCION_META = {
  CREATE: { bg: "#DCFCE7", text: "#166534", label: "Creación", pill: "#ECFDF5" },
  UPDATE: { bg: "#FEF3C7", text: "#92400E", label: "Edición", pill: "#FFFBEB" },
  DELETE: { bg: "#FEE2E2", text: "#991B1B", label: "Eliminación", pill: "#FEF2F2" },
};

// =============================
// Small UI helpers (inline styles)
// =============================
const S = {
  page: {
    padding: "1.5rem",
    background: "transparent",
  },
  card: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    boxShadow: "0 1px 10px rgba(0,0,0,0.04)",
  },
  subtle: { color: "#6b7280" },
  h1: { fontSize: "1.45rem", fontWeight: 750, margin: 0, letterSpacing: "-0.02em" },
  h2: { fontSize: "1.05rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },

  statWrap: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" },
  statCard: (tone) => ({
    background: tone.bg,
    border: `1px solid ${tone.border}`,
    borderRadius: "12px",
    padding: "10px 12px",
    minWidth: "140px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  }),
  statLeft: { display: "flex", flexDirection: "column", lineHeight: 1.1 },
  statValue: (tone) => ({
    fontSize: "1.25rem",
    fontWeight: 800,
    color: tone.text,
    letterSpacing: "-0.02em",
  }),
  statLabel: (tone) => ({
    fontSize: "0.78rem",
    fontWeight: 650,
    color: tone.text,
    opacity: 0.9,
    marginTop: "4px",
  }),
  statIcon: (tone) => ({
    width: 30,
    height: 30,
    borderRadius: 10,
    background: tone.iconBg,
    display: "grid",
    placeItems: "center",
    color: tone.text,
    fontSize: "0.95rem",
  }),

  toolbar: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
    padding: "10px",
    background: "#f9fafb",
    border: "1px solid #eef2f7",
    borderRadius: "12px",
  },
  toolbarSection: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  toolbarLabel: {
    fontSize: "0.85rem",
    color: "#6b7280",
    fontWeight: 700,
    marginRight: "4px",
  },
  pill: (active) => ({
    border: `1px solid ${active ? "#c7d2fe" : "#e5e7eb"}`,
    background: active ? "#EEF2FF" : "white",
    color: active ? "#3730a3" : "#111827",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: active ? "0 1px 8px rgba(99,102,241,0.10)" : "none",
  }),
  divider: { width: 1, height: 26, background: "#e5e7eb", margin: "0 2px" },

  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderBottom: "1px solid #eef2f7",
    background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },

  // Filters
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    gap: "10px",
    padding: "12px 14px",
    background: "#ffffff",
  },
  filtersGrid2: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    padding: "0 14px 14px 14px",
    alignItems: "center",
  },

  inputWrap: { display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 },
  label: { fontSize: "0.78rem", color: "#64748b", fontWeight: 700 },
  control: {
    width: "100%",
    padding: "10px 10px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    outline: "none",
    fontSize: "0.9rem",
    color: "#111827",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  },
  controlFocus: {
    border: "1px solid #c7d2fe",
    boxShadow: "0 0 0 4px rgba(99,102,241,0.12)",
    background: "#ffffff",
  },

  quickSearchWrap: {
    position: "relative",
    width: "100%",
  },
  quickIcon: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "0.95rem",
    color: "#64748b",
  },

  actionRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  actionPill: (active, kind) => {
    const meta = ACCION_META[kind];
    const bg = active ? meta.bg : meta.pill;
    const border = active ? meta.bg : "#e5e7eb";
    const text = meta.text;

    return {
      border: `1px solid ${border}`,
      background: bg,
      color: text,
      padding: "7px 10px",
      borderRadius: "999px",
      fontSize: "0.85rem",
      fontWeight: 800,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: active ? "0 1px 10px rgba(0,0,0,0.05)" : "none",
    };
  },

  btn: (variant) => {
    const base = {
      padding: "10px 12px",
      borderRadius: "10px",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: "0.9rem",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      border: "1px solid transparent",
      userSelect: "none",
      lineHeight: 1,
    };

    if (variant === "primary") {
      return {
        ...base,
        background: "#4F46E5",
        color: "white",
        boxShadow: "0 8px 18px rgba(79,70,229,0.18)",
      };
    }
    if (variant === "soft") {
      return {
        ...base,
        background: "#EEF2FF",
        color: "#3730A3",
        border: "1px solid #c7d2fe",
      };
    }
    if (variant === "ghost") {
      return {
        ...base,
        background: "white",
        color: "#111827",
        border: "1px solid #e5e7eb",
      };
    }
    if (variant === "export") {
      return {
        ...base,
        background: "#ECFDF5",
        color: "#065F46",
        border: "1px solid #A7F3D0",
      };
    }
    if (variant === "toggle") {
      return {
        ...base,
        background: "#F1F5F9",
        color: "#475569",
        border: "1px solid #CBD5E1",
      };
    }
    if (variant === "sort") {
      return {
        ...base,
        background: "#FEF3C7",
        color: "#92400E",
        border: "1px solid #FDE68A",
      };
    }
    return base;
  },

  // Table
  tableWrap: {
    overflowX: "auto",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 10px rgba(0,0,0,0.04)",
    background: "white",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#f9fafb" },
  th: {
    padding: "12px",
    textAlign: "left",
    fontWeight: 800,
    color: "#374151",
    fontSize: "0.78rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "12px",
    fontSize: "0.92rem",
    borderTop: "1px solid #f1f5f9",
    color: "#111827",
    verticalAlign: "middle",
  },
  rowHover: { background: "#f8fafc" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },

  badge: (bg, text) => ({
    background: bg,
    color: text,
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "0.82rem",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  }),

  linkBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    color: "#4F46E5",
    textDecoration: "underline",
    fontWeight: 800,
  },

  eyeBtn: {
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 800,
  },

  // Modal base
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px",
    zIndex: 9999,
  },
  modal: {
    width: "100%",
    maxWidth: "800px",
    borderRadius: "14px",
    background: "white",
    border: "1px solid #e5e7eb",
    boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px 16px",
    borderBottom: "1px solid #eef2f7",
    background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  },
  modalBody: { padding: "14px 16px" },
  modalFooter: {
    padding: "14px 16px",
    borderTop: "1px solid #eef2f7",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    background: "#fafafa",
  },
  closeX: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: "10px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 900,
  },
  
  // Resumen de cambio
  changeSummary: {
    fontSize: "0.85rem",
    color: "#374151",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  entityName: {
    fontWeight: 800,
    color: "#111827",
    fontSize: "0.9rem",
  },
  changeDetail: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.82rem",
    color: "#64748b",
  },
  changeBadge: {
    background: "#F0FDF4",
    color: "#166534",
    padding: "2px 8px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 700,
  },

  // Autocompletado
  suggestionsDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    marginTop: "4px",
    maxHeight: "300px",
    overflowY: "auto",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 1000,
  },
  suggestionCategory: {
    padding: "8px 12px",
    backgroundColor: "#f5f5f5",
    fontWeight: 700,
    fontSize: "0.78rem",
    color: "#555",
    borderBottom: "1px solid #e0e0e0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  suggestionItem: {
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "0.88rem",
    borderBottom: "1px solid #f0f0f0",
    transition: "background-color 0.15s",
  },
};

function toneForStat(kind) {
  if (kind === "CREATE") {
    return { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", iconBg: "#DCFCE7", icon: "＋" };
  }
  if (kind === "UPDATE") {
    return { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", iconBg: "#FEF3C7", icon: "✎" };
  }
  return { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", iconBg: "#FEE2E2", icon: "🗑" };
}

function getTablaStyle(tabla) {
  return TABLA_COLORS[tabla] || { bg: "#f3f4f6", text: "#374151" };
}

// ✅ HELPER: Formatear strings de fecha de manera robusta
function formatStringDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const fecha = new Date(dateStr);
    if (isNaN(fecha.getTime())) return "-";
    
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(fecha);
  } catch {
    return "-";
  }
}

// ✅ MODIFICADO: Extraer fecha del log (priorizando ISO UTC)
function formatFecha(log) {
  const fechaStr = log.fecha_iso || log.created_at;
  return formatStringDate(fechaStr);
}

// Obtener fecha actual local en formato YYYY-MM-DD
function getTodayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Obtener fecha hace N días
function getDateDaysAgo(days) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ✅ MODIFICADO: Generar resumen usando entidad_nombre del backend
function getResumenCambio(log) {
  const { accion, datos_anteriores, datos_nuevos, tabla_afectada, entidad_nombre } = log;

  let antes = datos_anteriores;
  let despues = datos_nuevos;

  if (typeof antes === "string") try { antes = JSON.parse(antes); } catch { antes = {}; }
  if (typeof despues === "string") try { despues = JSON.parse(despues); } catch { despues = {}; }

  antes = antes || {};
  despues = despues || {};

  // 1. Priorizar el nombre enriquecido que viene del backend
  let nombre = entidad_nombre;

  // 2. Si no viene del backend, intentar armarlo localmente (Fallback)
  if (!nombre) {
    nombre =
      despues.nombre_producto || despues.nombre_cliente || despues.nombre_empleado ||
      despues.nombre_proveedor || despues.nombre_zona || despues.codigo ||
      antes.nombre_producto || antes.nombre_cliente || antes.nombre_empleado ||
      antes.nombre_proveedor || antes.nombre_zona || antes.codigo ||
      null;

    if (nombre && !nombre.includes("(ID:")) {
      nombre = `${nombre} (ID: ${log.id_registro})`;
    }
  }

  // 3. Fallbacks finales por tabla si no hay nombre
  if (!nombre) {
    if (tabla_afectada === "productos") {
      nombre = `Producto (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "seubica") {
      const idProd = despues.id_producto || antes.id_producto || log.id_registro;
      nombre = `Ubicación: Producto ${idProd}`;
    } else if (tabla_afectada === "envio_detalle") {
      nombre = `Detalle Envío (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "contiene") {
      nombre = `Detalle Pedido (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "pedidos") {
      nombre = `Pedido #${log.id_registro}`;
    } else if (tabla_afectada === "clientes") {
      nombre = `Cliente (ID: ${log.id_registro})`;
    } else {
      nombre = `Registro (ID: ${log.id_registro || '?'})`;
    }
  }

  // --- Detalles según acción ---
  if (accion === "CREATE") {
    if (tabla_afectada === "seubica") {
      return { nombre, detalle: `Ubicado en Zona ${despues.id_zona}`, tipo: "Ubicación" };
    }
    return { nombre, detalle: "Registro creado", tipo: "Nuevo" };
  }

  if (accion === "DELETE") {
    if (tabla_afectada === "seubica") {
      return { nombre, detalle: `Retirado de Zona ${antes.id_zona}`, tipo: "Ubicación" };
    }
    return { nombre, detalle: "Eliminado del sistema", tipo: "Eliminado" };
  }

  if (accion === "UPDATE") {
    const camposImportantes = ["stock", "precio", "status", "id_zona", "nombre_producto", "nombre_cliente", "total"];
    const cambios = [];

    for (const campo of camposImportantes) {
      if (antes[campo] !== undefined && despues[campo] !== undefined && String(antes[campo]) !== String(despues[campo])) {
        cambios.push({ campo, antes: antes[campo], despues: despues[campo] });
      }
    }

    if (cambios.length === 0) {
      const todasLasKeys = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];
      for (const key of todasLasKeys) {
        if (String(antes[key]) !== String(despues[key]) && !key.includes("_at") && key !== "id") {
          cambios.push({ campo: key, antes: antes[key], despues: despues[key] });
          break;
        }
      }
    }

    if (cambios.length > 0) {
      const c = cambios[0];
      const campoLabel = {
        stock: "Stock",
        precio: "Precio",
        status: "Status",
        id_zona: "Zona",
        nombre_producto: "Nombre",
        nombre_cliente: "Cliente",
        total: "Total",
      }[c.campo] || c.campo;

      return {
        nombre,
        detalle: `${campoLabel}: ${c.antes} → ${c.despues}`,
        tipo: campoLabel,
        cambiosExtra: cambios.length - 1,
      };
    }

    return { nombre, detalle: "Modificado", tipo: "Edición" };
  }

  return { nombre: "-", detalle: "-", tipo: "?" };
}

export default function HistorialAuditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tablas, setTablas] = useState([]);
  const [stats, setStats] = useState({ CREATE: 0, UPDATE: 0, DELETE: 0 });
  const [empleados, setEmpleados] = useState([]);
  const [tiposCambio, setTiposCambio] = useState([]);
  const [filtrosVisibles, setFiltrosVisibles] = useState(true);
  const [ordenFecha, setOrdenFecha] = useState("DESC");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busquedaBackend, setBusquedaBackend] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [filtros, setFiltros] = useState({
    tabla: "",
    accion: "",
    id_empleado: "",
    fecha_inicio: "",
    fecha_fin: "",
    tipo_cambio: "",
    page: 1,
    limit: 50,
  });

  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [timelineInfo, setTimelineInfo] = useState({ tabla: "", id: "", nombre: "" });
  const [focusKey, setFocusKey] = useState("");

  const loadTablas = async () => {
    try {
      const { data } = await getTablasAuditadas();
      setTablas(data.data || data.tablas || []);
    } catch (e) { console.error(e); }
  };

  const loadStats = async () => {
    try {
      const { data } = await getAuditStats(30);
      const porAccion = data.estadisticas?.por_accion || [];
      const statsObj = { CREATE: 0, UPDATE: 0, DELETE: 0 };
      porAccion.forEach((item) => {
        if (item.accion && item.total) statsObj[item.accion] = parseInt(item.total, 10);
      });
      setStats(statsObj);

      const porEmpleado = data.estadisticas?.por_empleado || [];
      const empList = porEmpleado.map((e) => ({
        id: e.id_empleado,
        nombre: e.nombre_empleado || `Empleado ${e.id_empleado}`,
      }));
      setEmpleados(empList);
    } catch (e) { console.error(e); }
  };

  const loadTiposCambio = async () => {
    try {
      const { data } = await getTiposCambio();
      setTiposCambio(data.data || []);
    } catch (e) { console.error(e); }
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        orden: ordenFecha,
        page: filtros.page,
        limit: filtros.limit,
      };
      
      if (filtros.tabla) params.tabla = filtros.tabla;
      if (filtros.accion) params.accion = filtros.accion;
      if (filtros.id_empleado) params.id_empleado = filtros.id_empleado;
      if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
      if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;
      if (filtros.tipo_cambio) params.tipo_cambio = filtros.tipo_cambio;
      if (busquedaBackend) params.busqueda = busquedaBackend;

      const { data } = await getAuditLogs(params);
      setLogs(data.data || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo cargar el historial", "error");
    } finally {
      setLoading(false);
    }
  }, [filtros, ordenFecha, busquedaBackend]);

  useEffect(() => {
    loadTablas();
    loadStats();
    loadTiposCambio();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const openDetails = async (log) => {
    try {
      const { data } = await getAuditLogById(log.id);
      setSelectedLog(data.data);
      setModalOpen(true);
    } catch (e) {
      setSelectedLog(log);
      setModalOpen(true);
    }
  };

  const openTimeline = async (tabla, idRegistro, entidadNombre) => {
    try {
      const { data } = await getRegistroHistorial(tabla, idRegistro);
      setTimelineData(data.data || []);
      setTimelineInfo({ 
        tabla, 
        id: idRegistro, 
        nombre: data.entidad_nombre || entidadNombre || `#${idRegistro}` 
      });
      setTimelineOpen(true);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo cargar el historial", "error");
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    setBusquedaBackend(busquedaInput.trim());
    setFiltros((f) => ({ ...f, page: 1 }));
    setShowSuggestions(false);
  };

  const fetchSuggestions = async (term) => {
    if (term.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      console.log("🔍 Buscando sugerencias para:", term);
      const { data } = await getSearchSuggestions(term);
      console.log("📦 Sugerencias recibidas:", data);
      if (data.ok) {
        setSuggestions(data.suggestions);
        setShowSuggestions(data.suggestions.length > 0);
      }
    } catch (error) {
      console.error("❌ Error al obtener sugerencias:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setBusquedaInput(suggestion.searchTerm);
    setBusquedaBackend(suggestion.searchTerm);
    setShowSuggestions(false);
    setFiltros((f) => ({ ...f, page: 1 }));
  };

  const exportToExcel = () => {
    if (logs.length === 0) {
      Swal.fire("Info", "No hay datos para exportar", "info");
      return;
    }
    const headers = ["Fecha", "Tabla", "Acción", "Usuario", "Entidad", "Detalle del Cambio"];
    const rows = logs.map((log) => {
      const resumen = getResumenCambio(log);
      return [
        formatFecha(log),
        TABLA_LABELS[log.tabla_afectada] || log.tabla_afectada,
        ACCION_META[log.accion]?.label || log.accion,
        log.empleado?.nombre_empleado || "Sistema",
        resumen.nombre,
        resumen.detalle,
      ];
    });
    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `auditoria_${getTodayLocal()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderVisualDiff = (antes, despues) => {
    let antesObj = antes;
    let despuesObj = despues;
    if (typeof antes === "string") { try { antesObj = JSON.parse(antes); } catch { antesObj = {}; } }
    if (typeof despues === "string") { try { despuesObj = JSON.parse(despues); } catch { despuesObj = {}; } }
    antesObj = antesObj || {};
    despuesObj = despuesObj || {};
    const allKeys = [...new Set([...Object.keys(antesObj), ...Object.keys(despuesObj)])];

    return (
      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", marginTop: "10px", border: "1px solid #e5e7eb" }}>
        <strong style={{ fontSize: "0.85rem", color: "#475569" }}>🔄 Comparación de cambios</strong>
        <div style={{ marginTop: "10px" }}>
          {allKeys.map((key) => {
            const valorAntes = antesObj[key];
            const valorDespues = despuesObj[key];
            const cambio = String(valorAntes) !== String(valorDespues);
            return (
              <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px", marginBottom: "8px", borderRadius: "10px", background: cambio ? "#FFFBEB" : "white", border: cambio ? "1px solid #FDE68A" : "1px solid #E5E7EB" }}>
                <span style={{ fontWeight: 800, minWidth: "150px", color: "#0f172a", fontSize: "0.85rem" }}>{key}</span>
                {cambio ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, flexWrap: "wrap" }}>
                    {valorAntes !== undefined && (
                      <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: "999px", fontSize: "0.85rem", textDecoration: "line-through", fontWeight: 700 }}>{valorAntes === null ? "null" : String(valorAntes)}</span>
                    )}
                    <span style={{ color: "#64748b" }}>→</span>
                    {valorDespues !== undefined && (
                      <span style={{ background: "#DCFCE7", color: "#166534", padding: "4px 10px", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 800 }}>{valorDespues === null ? "null" : String(valorDespues)}</span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>{valorDespues === null ? <em>null</em> : String(valorDespues)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderJSON = (data, title, isDelete = false) => {
    if (!data) return <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Sin datos</p>;
    let parsed = data;
    if (typeof data === "string") { try { parsed = JSON.parse(data); } catch { return <pre style={{ fontSize: "0.85rem" }}>{data}</pre>; } }
    return (
      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", marginTop: "10px", border: "1px solid #e5e7eb" }}>
        <strong style={{ fontSize: "0.85rem", color: "#475569" }}>{title}</strong>
        <div style={{ marginTop: "10px" }}>
          {Object.entries(parsed).map(([key, value]) => (
            <div key={key} style={{ display: "flex", gap: "10px", padding: "8px 10px", marginBottom: "6px", borderRadius: "10px", background: isDelete ? "#FEF2F2" : "#ECFDF5", border: `1px solid ${isDelete ? "#FECACA" : "#A7F3D0"}` }}>
              <span style={{ fontWeight: 800, minWidth: "150px", color: "#0f172a", fontSize: "0.85rem" }}>{key}:</span>
              <span style={{ color: isDelete ? "#991B1B" : "#065F46", fontSize: "0.85rem", wordBreak: "break-word", fontWeight: 700 }}>{value === null ? <em>null</em> : String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setFiltros((f) => ({ ...f, page: newPage }));
  };

  const clearFilters = () => {
    setBusquedaInput("");
    setBusquedaBackend("");
    setFiltros({ tabla: "", accion: "", id_empleado: "", fecha_inicio: "", fecha_fin: "", tipo_cambio: "", page: 1, limit: 50 });
  };

  const toggleOrden = () => setOrdenFecha((prev) => (prev === "DESC" ? "ASC" : "DESC"));

  const toneCreate = toneForStat("CREATE");
  const toneUpdate = toneForStat("UPDATE");
  const toneDelete = toneForStat("DELETE");
  const activeAccion = filtros.accion || "ALL";

  return (
    <div style={S.page}>
      {/* Header + Stats */}
      <div style={S.topRow}>
        <div>
          <h2 style={S.h1}>Historial de Auditoría</h2>
          <p style={{ ...S.subtle, margin: "6px 0 0 0" }}>Control total de cambios.</p>
        </div>
        <div style={S.statWrap}>
          <div style={S.statCard(toneCreate)}>
            <div style={S.statLeft}><div style={S.statValue(toneCreate)}>{stats.CREATE}</div><div style={S.statLabel(toneCreate)}>Creaciones</div></div>
            <div style={S.statIcon(toneCreate)}>{toneCreate.icon}</div>
          </div>
          <div style={S.statCard(toneUpdate)}>
            <div style={S.statLeft}><div style={S.statValue(toneUpdate)}>{stats.UPDATE}</div><div style={S.statLabel(toneUpdate)}>Ediciones</div></div>
            <div style={S.statIcon(toneUpdate)}>{toneUpdate.icon}</div>
          </div>
          <div style={S.statCard(toneDelete)}>
            <div style={S.statLeft}><div style={S.statValue(toneDelete)}>{stats.DELETE}</div><div style={S.statLabel(toneDelete)}>Eliminaciones</div></div>
            <div style={S.statIcon(toneDelete)}>{toneDelete.icon}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ ...S.card, padding: "12px", marginBottom: "12px" }}>
        <div style={S.toolbar}>
          <div style={S.toolbarSection}>
            <span style={S.toolbarLabel}>Rango</span>
            <button onClick={() => { const t = getTodayLocal(); setFiltros((f) => ({ ...f, fecha_inicio: t, fecha_fin: t, page: 1 })); }} style={S.pill(false)}>📅 Hoy</button>
            <button onClick={() => setFiltros((f) => ({ ...f, fecha_inicio: getDateDaysAgo(7), fecha_fin: getTodayLocal(), page: 1 }))} style={S.pill(false)}>🗓️ 7 días</button>
            <button onClick={() => setFiltros((f) => ({ ...f, fecha_inicio: getDateDaysAgo(30), fecha_fin: getTodayLocal(), page: 1 }))} style={S.pill(false)}>🗓️ 30 días</button>
            <div style={S.divider} />
            <button onClick={clearFilters} style={S.pill(false)}>↺ Reset</button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ ...S.card, overflow: "hidden" }}>
        <div style={S.sectionHead}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#6366F1", boxShadow: "0 0 0 4px rgba(99,102,241,0.12)" }} />
            <div><div style={S.h2}>Registros</div><div style={{ fontSize: "0.85rem", color: "#64748b" }}>{logs.length} / {pagination.total}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={toggleOrden} style={S.btn("sort")}>{ordenFecha === "DESC" ? "↓ Recientes" : "↑ Antiguos"}</button>
            <button onClick={() => setFiltrosVisibles(!filtrosVisibles)} style={S.btn("toggle")}>{filtrosVisibles ? "🙈 Ocultar filtros" : "🔍 Mostrar filtros"}</button>
            <button onClick={exportToExcel} style={S.btn("export")}>⬇︎ Exportar</button>
          </div>
        </div>

        {filtrosVisibles && (
          <form onSubmit={handleSearch}>
            <div style={S.filtersGrid}>
              <div style={{ ...S.inputWrap, gridColumn: "span 2", position: "relative" }}>
                <div style={S.label}>🔍 Búsqueda</div>
                <div style={S.quickSearchWrap}>
                  <span style={S.quickIcon}>⌕</span>
                  <input
                    value={busquedaInput}
                    onChange={(e) => {
                      setBusquedaInput(e.target.value);
                      fetchSuggestions(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch(e);
                      if (e.key === "Escape") setShowSuggestions(false);
                    }}
                    placeholder="Busca por nombre, ID, código, CUIT..."
                    style={{ ...S.control, paddingLeft: 30, ...(focusKey === "busqueda" ? S.controlFocus : null) }}
                    onFocus={() => setFocusKey("busqueda")}
                    onBlur={() => {
                      setFocusKey("");
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                  />
                </div>

                {/* Dropdown de sugerencias */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={S.suggestionsDropdown}>
                    {suggestions.map((category, idx) => (
                      <div key={idx}>
                        <div style={S.suggestionCategory}>
                          {category.icon} {category.category}
                        </div>
                        {category.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            style={S.suggestionItem}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSuggestionClick(item);
                            }}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={S.inputWrap}>
                <div style={S.label}>Tabla</div>
                <select value={filtros.tabla} onChange={(e) => setFiltros((f) => ({ ...f, tabla: e.target.value, tipo_cambio: "", page: 1 }))} style={{ ...S.control, ...(focusKey === "tabla" ? S.controlFocus : null) }} onFocus={() => setFocusKey("tabla")} onBlur={() => setFocusKey("")}>
                  <option value="">Todas</option>
                  {tablas.map((t) => <option key={t} value={t}>{TABLA_LABELS[t] || t}</option>)}
                </select>
              </div>
              <div style={S.inputWrap}>
                <div style={S.label}>Usuario</div>
                <select value={filtros.id_empleado} onChange={(e) => setFiltros((f) => ({ ...f, id_empleado: e.target.value, page: 1 }))} style={{ ...S.control, ...(focusKey === "usuario" ? S.controlFocus : null) }} onFocus={() => setFocusKey("usuario")} onBlur={() => setFocusKey("")}>
                  <option value="">Todos</option>
                  {empleados.map((emp) => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              </div>
              <div style={S.inputWrap}>
                <div style={S.label}>Desde</div>
                <input type="date" value={filtros.fecha_inicio} onChange={(e) => setFiltros((f) => ({ ...f, fecha_inicio: e.target.value, page: 1 }))} style={{ ...S.control, ...(focusKey === "desde" ? S.controlFocus : null) }} onFocus={() => setFocusKey("desde")} onBlur={() => setFocusKey("")} />
              </div>
            </div>
            <div style={{ ...S.filtersGrid, gridTemplateColumns: "1fr 2fr 2fr", paddingTop: 0 }}>
              <div style={S.inputWrap}>
                <div style={S.label}>Hasta</div>
                <input type="date" value={filtros.fecha_fin} onChange={(e) => setFiltros((f) => ({ ...f, fecha_fin: e.target.value, page: 1 }))} style={{ ...S.control, ...(focusKey === "hasta" ? S.controlFocus : null) }} onFocus={() => setFocusKey("hasta")} onBlur={() => setFocusKey("")} />
              </div>
              <div style={S.inputWrap}>
                <div style={S.label}>🎯 Tipo de Cambio</div>
                <select value={filtros.tipo_cambio} onChange={(e) => setFiltros((f) => ({ ...f, tipo_cambio: e.target.value, tabla: "", accion: "", page: 1 }))} style={{ ...S.control, background: filtros.tipo_cambio ? "#EEF2FF" : "#f8fafc", borderColor: filtros.tipo_cambio ? "#c7d2fe" : "#e5e7eb", ...(focusKey === "tipo" ? S.controlFocus : null) }} onFocus={() => setFocusKey("tipo")} onBlur={() => setFocusKey("")}>
                  <option value="">-- Todos --</option>
                  <optgroup label="📦 Inventario"><option value="cambio_stock">📊 Stock</option><option value="cambio_precio">💰 Precio</option><option value="creacion_producto">✨ Creación Prod.</option></optgroup>
                  <optgroup label="📋 Pedidos"><option value="cambio_status">🔄 Status</option><option value="creacion_pedido">🛒 Nuevo Pedido</option></optgroup>
                </select>
              </div>
            </div>
            <div style={S.filtersGrid2}>
              <div style={S.actionRow}>
                <span style={{ ...S.label, marginRight: 6 }}>Acción:</span>
                <button type="button" onClick={() => setFiltros((f) => ({ ...f, accion: "", page: 1 }))} style={{ border: "1px solid #c7d2fe", background: activeAccion === "ALL" ? "#EEF2FF" : "#F8FAFC", color: "#3730A3", padding: "7px 10px", borderRadius: 999, fontSize: "0.85rem", fontWeight: 900, cursor: "pointer" }}>Todas</button>
                <button type="button" onClick={() => setFiltros((f) => ({ ...f, accion: "CREATE", page: 1 }))} style={S.actionPill(activeAccion === "CREATE", "CREATE")}>＋ Creación</button>
                <button type="button" onClick={() => setFiltros((f) => ({ ...f, accion: "UPDATE", page: 1 }))} style={S.actionPill(activeAccion === "UPDATE", "UPDATE")}>✎ Edición</button>
                <button type="button" onClick={() => setFiltros((f) => ({ ...f, accion: "DELETE", page: 1 }))} style={S.actionPill(activeAccion === "DELETE", "DELETE")}>🗑 Eliminación</button>
              </div>
              <div style={{ display: "flex", gap: "10px" }}><button type="button" onClick={clearFilters} style={S.btn("ghost")}>✕ Limpiar</button><button type="submit" style={S.btn("primary")}>⟳ Buscar</button></div>
            </div>
          </form>
        )}
      </div>

      {/* Tabla Resultados */}
      <div style={{ marginTop: "12px" }}>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead style={S.thead}>
              <tr>
                <th style={{ ...S.th, cursor: "pointer" }} onClick={toggleOrden}>Fecha {ordenFecha === "DESC" ? "↓" : "↑"}</th>
                <th style={S.th}>Tabla</th>
                <th style={S.th}>Acción</th>
                <th style={S.th}>Usuario</th>
                <th style={S.th}>Entidad / Cambio</th>
                <th style={{ ...S.th, textAlign: "center" }}>Ver</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: "40px" }}>⏳ Cargando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: "44px" }}>Sin resultados</td></tr>
              ) : (
                logs.map((log) => {
                  const accion = ACCION_META[log.accion] || { bg: "#f3f4f6", label: log.accion };
                  const tablaStyle = getTablaStyle(log.tabla_afectada);
                  const resumen = getResumenCambio(log);
                  // ✅ MOSTRAR TOOLTIP CON HORA CLIENTE
                  const tooltipFecha = log.fecha_cliente ? `Hora Cliente: ${formatStringDate(log.fecha_cliente)}` : "Hora Servidor";

                  return (
                    <tr key={log.id} onMouseEnter={(e) => (e.currentTarget.style.background = S.rowHover.background)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }} title={tooltipFecha}>{formatFecha(log)}</td>
                      <td style={S.td}><span style={S.badge(tablaStyle.bg, tablaStyle.text)}>{TABLA_LABELS[log.tabla_afectada] || log.tabla_afectada}</span></td>
                      <td style={S.td}><span style={S.badge(accion.bg, accion.text)}>{accion.label}</span></td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{log.empleado?.nombre_empleado || "Sistema"}</td>
                      <td style={S.td}>
                        <div style={S.changeSummary}>
                          {/* ✅ AQUI SE MUESTRA EL NOMBRE EN VEZ DEL ID */}
                          <button type="button" onClick={() => openTimeline(log.tabla_afectada, log.id_registro, resumen.nombre)} style={{ ...S.linkBtn, ...S.entityName, textAlign: "left" }}>{resumen.nombre}</button>
                          <div style={S.changeDetail}><span style={S.changeBadge}>{resumen.tipo}</span><span>{resumen.detalle}</span></div>
                        </div>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}><button onClick={() => openDetails(log)} style={S.eyeBtn}>👁</button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "12px" }}>
            <button onClick={() => changePage(pagination.page - 1)} disabled={pagination.page <= 1} style={S.btn("soft")}>←</button>
            <span style={{ padding: "0 6px", fontWeight: 800 }}>{pagination.page} / {pagination.totalPages}</span>
            <button onClick={() => changePage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} style={S.btn("soft")}>→</button>
          </div>
        )}
      </div>

      {/* Modal Detalles */}
      {modalOpen && selectedLog && (
        <div style={S.backdrop} onClick={() => setModalOpen(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <h2 style={{ margin: 0 }}>Detalle del Cambio</h2>
                <span style={S.badge(ACCION_META[selectedLog.accion]?.bg, ACCION_META[selectedLog.accion]?.text)}>{selectedLog.accion}</span>
              </div>
              <button onClick={() => setModalOpen(false)} style={S.closeX}>✕</button>
            </div>
            <div style={{ ...S.modalBody, maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div><div style={S.label}>Tabla</div><div style={{ marginTop: 6 }}>{selectedLog.tabla_afectada}</div></div>
                <div><div style={S.label}>Entidad (Nombre)</div><div style={{ marginTop: 6, fontWeight: 900 }}>{selectedLog.entidad_nombre || getResumenCambio(selectedLog).nombre}</div></div>
                <div><div style={S.label}>Fecha (Servidor)</div><div style={{ marginTop: 6 }}>{formatFecha(selectedLog)}</div></div>
                
                {/* ✅ NUEVA SECCIÓN: FECHA CLIENTE */}
                {selectedLog.fecha_cliente && (
                  <div>
                    <div style={S.label}>Fecha (Cliente / Usuario)</div>
                    <div style={{ marginTop: 6, fontWeight: 700, color: "#4F46E5" }}>
                      {formatStringDate(selectedLog.fecha_cliente)}
                    </div>
                  </div>
                )}
              </div>
              {selectedLog.accion === "UPDATE" && renderVisualDiff(selectedLog.datos_anteriores, selectedLog.datos_nuevos)}
              {selectedLog.accion === "CREATE" && renderJSON(selectedLog.datos_nuevos, "Registro Creado")}
              {selectedLog.accion === "DELETE" && renderJSON(selectedLog.datos_anteriores, "Registro Eliminado", true)}
            </div>
          </div>
        </div>
      )}

      {/* Modal Timeline (Sin cambios mayores, solo hereda entidad_nombre) */}
      {timelineOpen && (
        <div style={S.backdrop} onClick={() => setTimelineOpen(false)}>
          <div style={{ ...S.modal, maxWidth: "860px" }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2>📜 Historial: {timelineInfo.nombre}</h2>
              <button onClick={() => setTimelineOpen(false)} style={S.closeX}>✕</button>
            </div>
            <div style={{ ...S.modalBody, maxHeight: "70vh", overflowY: "auto" }}>
               {timelineData.map(log => (
                  <div key={log.id} style={{ marginBottom: 10, borderBottom: "1px solid #eee", paddingBottom: 10 }}>
                    <div style={{ fontWeight: "bold" }}>{formatFecha(log)}</div>
                    <div>{log.empleado?.nombre_empleado || "Sistema"} - {log.accion}</div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
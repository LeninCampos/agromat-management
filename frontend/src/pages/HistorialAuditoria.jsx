// src/pages/HistorialAuditoria.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import {
  getAuditLogs,
  getTablasAuditadas,
  getAuditStats,
  getRegistroHistorial,
  getAuditLogById,
  getTiposCambio,
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



// ✅ MODIFICADO: Usar fecha_iso del backend (UTC con Z) para que el navegador convierta a hora local
function formatFecha(log) {
  // Priorizar fecha_iso del backend (viene en UTC con "Z", ej: "2025-12-20T19:17:06.000Z")
  const fechaStr = log.fecha_iso || log.created_at;
  
  if (!fechaStr) return "-";
  
  try {
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return "-";
    
    // El navegador automáticamente convierte UTC a hora local del usuario
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

// ✅ MODIFICADO: Generar resumen del cambio priorizando entidad_nombre del backend
function getResumenCambio(log) {
  const { accion, datos_anteriores, datos_nuevos, tabla_afectada, entidad_nombre } = log;

  let antes = datos_anteriores;
  let despues = datos_nuevos;

  if (typeof antes === "string") try { antes = JSON.parse(antes); } catch { antes = {}; }
  if (typeof despues === "string") try { despues = JSON.parse(despues); } catch { despues = {}; }

  antes = antes || {};
  despues = despues || {};

  // ✅ PRIORIZAR entidad_nombre del backend (ya viene con formato "Nombre (ID: X)")
  let nombre = entidad_nombre;

  // Fallback: construir nombre localmente si el backend no lo envió
  if (!nombre) {
    nombre =
      despues.nombre_producto || despues.nombre_cliente || despues.nombre_empleado ||
      despues.nombre_proveedor || despues.nombre_zona || despues.codigo ||
      antes.nombre_producto || antes.nombre_cliente || antes.nombre_empleado ||
      antes.nombre_proveedor || antes.nombre_zona || antes.codigo ||
      null;

    // Si encontramos nombre pero no tiene el formato (ID: X), agregarlo
    if (nombre && !nombre.includes("(ID:")) {
      nombre = `${nombre} (ID: ${log.id_registro})`;
    }
  }

  // ✅ Fallbacks robustos cuando no hay nombre
  if (!nombre) {
    if (tabla_afectada === "productos") {
      const codigo = despues.codigo || antes.codigo;
      nombre = codigo ? `Producto ${codigo} (ID: ${log.id_registro})` : `Producto (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "seubica") {
      const idProd = despues.id_producto || antes.id_producto || log.id_registro;
      nombre = `Ubicación: Producto ${idProd}`;
    } else if (tabla_afectada === "envio_detalle") {
      const idProd = despues.id_producto || antes.id_producto;
      nombre = idProd ? `Detalle Envío (Prod ID: ${idProd})` : `Detalle Envío (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "contiene") {
      const idProd = despues.id_producto || antes.id_producto;
      nombre = idProd ? `Detalle Pedido (Prod ID: ${idProd})` : `Detalle Pedido (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "pedidos") {
      nombre = `Pedido (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "clientes") {
      nombre = `Cliente (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "empleados") {
      nombre = `Empleado (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "proveedor") {
      nombre = `Proveedor (ID: ${log.id_registro})`;
    } else if (tabla_afectada === "zonas") {
      nombre = `Zona (ID: ${log.id_registro})`;
    } else {
      nombre = `Registro (ID: ${log.id_registro || '?'})`;
    }
  }

  if (accion === "CREATE") {
    if (tabla_afectada === "seubica") {
      return {
        nombre: nombre,
        detalle: `Ubicado en Zona ${despues.id_zona}`,
        tipo: "Ubicación",
      };
    }
    return {
      nombre: nombre,
      detalle: "Registro creado",
      tipo: "Nuevo",
    };
  }

  if (accion === "DELETE") {
    if (tabla_afectada === "seubica") {
      return {
        nombre: nombre,
        detalle: `Retirado de Zona ${antes.id_zona}`,
        tipo: "Ubicación",
      };
    }
    return {
      nombre: nombre,
      detalle: "Eliminado del sistema",
      tipo: "Eliminado",
    };
  }

  if (accion === "UPDATE") {
    const camposImportantes = ["stock", "precio", "status", "id_zona", "nombre_producto", "nombre_cliente", "direccion", "telefono", "total", "piso"];
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
        piso: "Piso",
        nombre_producto: "Nombre",
        nombre_cliente: "Cliente",
        direccion: "Dirección",
        telefono: "Teléfono",
        total: "Total",
      }[c.campo] || c.campo;

      return {
        nombre: nombre,
        detalle: `${campoLabel}: ${c.antes} → ${c.despues}`,
        tipo: campoLabel,
        cambiosExtra: cambios.length - 1,
      };
    }

    return {
      nombre: nombre,
      detalle: "Modificado",
      tipo: "Edición",
    };
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

  // Estado para ocultar/mostrar filtros
  const [filtrosVisibles, setFiltrosVisibles] = useState(true);

  // Estado para ordenamiento
  const [ordenFecha, setOrdenFecha] = useState("DESC");

  // Búsqueda que va al backend
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busquedaBackend, setBusquedaBackend] = useState("");

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

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [timelineInfo, setTimelineInfo] = useState({ tabla: "", id: "", nombre: "" });

  // Focus styling
  const [focusKey, setFocusKey] = useState("");

  const loadTablas = async () => {
    try {
      const { data } = await getTablasAuditadas();
      setTablas(data.data || data.tablas || []);
    } catch (e) {
      console.error("Error cargando tablas:", e);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await getAuditStats(30);
      const porAccion = data.estadisticas?.por_accion || data.porAccion || [];
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
    } catch (e) {
      console.error("Error cargando stats:", e);
    }
  };

  const loadTiposCambio = async () => {
    try {
      const { data } = await getTiposCambio();
      setTiposCambio(data.data || []);
    } catch (e) {
      console.error("Error cargando tipos de cambio:", e);
    }
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
      console.error("Error cargando logs:", e);
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
      // Si falla, usar el log local
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
      console.error("Error cargando timeline:", e);
      Swal.fire("Error", "No se pudo cargar el historial del registro", "error");
    }
  };

  // Ejecutar búsqueda al presionar Enter o click en Buscar
  const handleSearch = (e) => {
    e?.preventDefault();
    setBusquedaBackend(busquedaInput.trim());
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

    if (typeof antes === "string") {
      try { antesObj = JSON.parse(antes); } catch { antesObj = {}; }
    }
    if (typeof despues === "string") {
      try { despuesObj = JSON.parse(despues); } catch { despuesObj = {}; }
    }

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
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px",
                  marginBottom: "8px",
                  borderRadius: "10px",
                  background: cambio ? "#FFFBEB" : "white",
                  border: cambio ? "1px solid #FDE68A" : "1px solid #E5E7EB",
                }}
              >
                <span style={{ fontWeight: 800, minWidth: "150px", color: "#0f172a", fontSize: "0.85rem" }}>{key}</span>

                {cambio ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, flexWrap: "wrap" }}>
                    {valorAntes !== undefined && (
                      <span
                        style={{
                          background: "#FEE2E2",
                          color: "#991B1B",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.85rem",
                          textDecoration: "line-through",
                          fontWeight: 700,
                        }}
                      >
                        {valorAntes === null ? "null" : String(valorAntes)}
                      </span>
                    )}
                    <span style={{ color: "#64748b" }}>→</span>
                    {valorDespues !== undefined && (
                      <span
                        style={{
                          background: "#DCFCE7",
                          color: "#166534",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.85rem",
                          fontWeight: 800,
                        }}
                      >
                        {valorDespues === null ? "null" : String(valorDespues)}
                      </span>
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
    if (typeof data === "string") {
      try { parsed = JSON.parse(data); } catch { return <pre style={{ fontSize: "0.85rem" }}>{data}</pre>; }
    }

    return (
      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", marginTop: "10px", border: "1px solid #e5e7eb" }}>
        <strong style={{ fontSize: "0.85rem", color: "#475569" }}>{title}</strong>
        <div style={{ marginTop: "10px" }}>
          {Object.entries(parsed).map(([key, value]) => (
            <div
              key={key}
              style={{
                display: "flex",
                gap: "10px",
                padding: "8px 10px",
                marginBottom: "6px",
                borderRadius: "10px",
                background: isDelete ? "#FEF2F2" : "#ECFDF5",
                border: `1px solid ${isDelete ? "#FECACA" : "#A7F3D0"}`,
              }}
            >
              <span style={{ fontWeight: 800, minWidth: "150px", color: "#0f172a", fontSize: "0.85rem" }}>{key}:</span>
              <span style={{ color: isDelete ? "#991B1B" : "#065F46", fontSize: "0.85rem", wordBreak: "break-word", fontWeight: 700 }}>
                {value === null ? <em>null</em> : String(value)}
              </span>
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
    setFiltros({
      tabla: "",
      accion: "",
      id_empleado: "",
      fecha_inicio: "",
      fecha_fin: "",
      tipo_cambio: "",
      page: 1,
      limit: 50,
    });
  };

  const toggleOrden = () => {
    setOrdenFecha((prev) => (prev === "DESC" ? "ASC" : "DESC"));
  };

  // =============================
  // UI
  // =============================
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
          <p style={{ ...S.subtle, margin: "6px 0 0 0" }}>
            Control total de cambios: filtra, busca y revisa el detalle en 1 click.
          </p>
        </div>

        <div style={S.statWrap}>
          <div style={S.statCard(toneCreate)}>
            <div style={S.statLeft}>
              <div style={S.statValue(toneCreate)}>{stats.CREATE}</div>
              <div style={S.statLabel(toneCreate)}>Creaciones</div>
            </div>
            <div style={S.statIcon(toneCreate)} title="Creaciones">
              {toneCreate.icon}
            </div>
          </div>

          <div style={S.statCard(toneUpdate)}>
            <div style={S.statLeft}>
              <div style={S.statValue(toneUpdate)}>{stats.UPDATE}</div>
              <div style={S.statLabel(toneUpdate)}>Ediciones</div>
            </div>
            <div style={S.statIcon(toneUpdate)} title="Ediciones">
              {toneUpdate.icon}
            </div>
          </div>

          <div style={S.statCard(toneDelete)}>
            <div style={S.statLeft}>
              <div style={S.statValue(toneDelete)}>{stats.DELETE}</div>
              <div style={S.statLabel(toneDelete)}>Eliminaciones</div>
            </div>
            <div style={S.statIcon(toneDelete)} title="Eliminaciones">
              {toneDelete.icon}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Rango rápido */}
      <div style={{ ...S.card, padding: "12px", marginBottom: "12px" }}>
        <div style={S.toolbar}>
          <div style={S.toolbarSection}>
            <span style={S.toolbarLabel}>Rango</span>

            <button
              type="button"
              onClick={() => {
                const today = getTodayLocal();
                setFiltros((f) => ({ ...f, fecha_inicio: today, fecha_fin: today, page: 1 }));
              }}
              style={S.pill(false)}
            >
              📅 Hoy
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltros((f) => ({
                  ...f,
                  fecha_inicio: getDateDaysAgo(7),
                  fecha_fin: getTodayLocal(),
                  page: 1,
                }));
              }}
              style={S.pill(false)}
            >
              🗓️ 7 días
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltros((f) => ({
                  ...f,
                  fecha_inicio: getDateDaysAgo(30),
                  fecha_fin: getTodayLocal(),
                  page: 1,
                }));
              }}
              style={S.pill(false)}
            >
              🗓️ 30 días
            </button>

            <div style={S.divider} />

            <button type="button" onClick={clearFilters} style={S.pill(false)} title="Reset rápido">
              ↺ Reset
            </button>
          </div>
        </div>
      </div>

      {/* Registros + filtros */}
      <div style={{ ...S.card, overflow: "hidden" }}>
        <div style={S.sectionHead}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#6366F1",
                boxShadow: "0 0 0 4px rgba(99,102,241,0.12)",
              }}
            />
            <div>
              <div style={{ ...S.h2, display: "flex", alignItems: "center", gap: "10px" }}>
                Registros
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>
                Mostrando {logs.length} de {pagination.total} registros
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={toggleOrden} style={S.btn("sort")} title={`Ordenar por fecha`}>
              {ordenFecha === "DESC" ? "↓ Recientes" : "↑ Antiguos"}
            </button>
            <button type="button" onClick={() => setFiltrosVisibles(!filtrosVisibles)} style={S.btn("toggle")}>
              {filtrosVisibles ? "🙈 Ocultar filtros" : "🔍 Mostrar filtros"}
            </button>
            <button type="button" onClick={exportToExcel} style={S.btn("export")} title="Exportar CSV">
              ⬇︎ Exportar (CSV)
            </button>
          </div>
        </div>

        {/* Filtros colapsables */}
        {filtrosVisibles && (
          <form onSubmit={handleSearch}>
            <div style={S.filtersGrid}>
              {/* Búsqueda */}
              <div style={{ ...S.inputWrap, gridColumn: "span 2" }}>
                <div style={S.label}>🔍 Búsqueda (producto, valor, zona, etc.)</div>
                <div style={S.quickSearchWrap}>
                  <span style={S.quickIcon}>⌕</span>
                  <input
                    value={busquedaInput}
                    onChange={(e) => setBusquedaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e); }}
                    placeholder="Ej: Fertilizante, 12321, Zona A..."
                    style={{
                      ...S.control,
                      paddingLeft: 30,
                      ...(focusKey === "busqueda" ? S.controlFocus : null),
                    }}
                    onFocus={() => setFocusKey("busqueda")}
                    onBlur={() => setFocusKey("")}
                  />
                </div>
              </div>

              {/* Tabla */}
              <div style={S.inputWrap}>
                <div style={S.label}>Tabla</div>
                <select
                  value={filtros.tabla}
                  onChange={(e) => setFiltros((f) => ({ ...f, tabla: e.target.value, tipo_cambio: "", page: 1 }))}
                  style={{ ...S.control, ...(focusKey === "tabla" ? S.controlFocus : null) }}
                  onFocus={() => setFocusKey("tabla")}
                  onBlur={() => setFocusKey("")}
                >
                  <option value="">Todas</option>
                  {tablas.map((t) => (
                    <option key={t} value={t}>
                      {TABLA_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Usuario */}
              <div style={S.inputWrap}>
                <div style={S.label}>Usuario</div>
                <select
                  value={filtros.id_empleado}
                  onChange={(e) => setFiltros((f) => ({ ...f, id_empleado: e.target.value, page: 1 }))}
                  style={{ ...S.control, ...(focusKey === "usuario" ? S.controlFocus : null) }}
                  onFocus={() => setFocusKey("usuario")}
                  onBlur={() => setFocusKey("")}
                >
                  <option value="">Todos</option>
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desde */}
              <div style={S.inputWrap}>
                <div style={S.label}>Desde</div>
                <input
                  type="date"
                  value={filtros.fecha_inicio}
                  onChange={(e) => setFiltros((f) => ({ ...f, fecha_inicio: e.target.value, page: 1 }))}
                  style={{ ...S.control, ...(focusKey === "desde" ? S.controlFocus : null) }}
                  onFocus={() => setFocusKey("desde")}
                  onBlur={() => setFocusKey("")}
                />
              </div>
            </div>

            {/* Segunda fila de filtros */}
            <div style={{ ...S.filtersGrid, gridTemplateColumns: "1fr 2fr 2fr", paddingTop: 0 }}>
              {/* Hasta */}
              <div style={S.inputWrap}>
                <div style={S.label}>Hasta</div>
                <input
                  type="date"
                  value={filtros.fecha_fin}
                  onChange={(e) => setFiltros((f) => ({ ...f, fecha_fin: e.target.value, page: 1 }))}
                  style={{ ...S.control, ...(focusKey === "hasta" ? S.controlFocus : null) }}
                  onFocus={() => setFocusKey("hasta")}
                  onBlur={() => setFocusKey("")}
                />
              </div>

              {/* Tipo de cambio */}
              <div style={S.inputWrap}>
                <div style={S.label}>🎯 Tipo de Cambio</div>
                <select
                  value={filtros.tipo_cambio}
                  onChange={(e) => setFiltros((f) => ({ ...f, tipo_cambio: e.target.value, tabla: "", accion: "", page: 1 }))}
                  style={{
                    ...S.control,
                    background: filtros.tipo_cambio ? "#EEF2FF" : "#f8fafc",
                    borderColor: filtros.tipo_cambio ? "#c7d2fe" : "#e5e7eb",
                    ...(focusKey === "tipo" ? S.controlFocus : null),
                  }}
                  onFocus={() => setFocusKey("tipo")}
                  onBlur={() => setFocusKey("")}
                >
                  <option value="">-- Todos los cambios --</option>
                  <optgroup label="📦 Inventario">
                    <option value="cambio_stock">📊 Cambios de Stock</option>
                    <option value="cambio_precio">💰 Cambios de Precio</option>
                    <option value="movimiento_zona">📍 Movimientos de Zona</option>
                    <option value="creacion_producto">✨ Creación de Productos</option>
                    <option value="eliminacion_producto">🗑️ Eliminación de Productos</option>
                  </optgroup>
                  <optgroup label="📋 Pedidos / Envíos">
                    <option value="cambio_status">🔄 Cambios de Status</option>
                    <option value="creacion_pedido">🛒 Creación de Pedidos</option>
                  </optgroup>
                  <optgroup label="👥 Personal">
                    <option value="cambio_empleado">👤 Asignación de Empleado</option>
                    <option value="creacion_empleado">➕ Creación de Empleados</option>
                  </optgroup>
                  <optgroup label="🏢 Entidades">
                    <option value="cambio_cliente">👤 Cambios de Cliente</option>
                    <option value="cambio_proveedor">🏭 Cambios de Proveedor</option>
                  </optgroup>
                </select>
              </div>

              <div></div>
            </div>

            {/* Acciones + botones */}
            <div style={S.filtersGrid2}>
              <div style={S.actionRow}>
                <span style={{ ...S.label, marginRight: 6 }}>Acción:</span>

                <button
                  type="button"
                  onClick={() => setFiltros((f) => ({ ...f, accion: "", page: 1 }))}
                  style={{
                    border: "1px solid #c7d2fe",
                    background: activeAccion === "ALL" ? "#EEF2FF" : "#F8FAFC",
                    color: "#3730A3",
                    padding: "7px 10px",
                    borderRadius: 999,
                    fontSize: "0.85rem",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Todas
                </button>

                <button
                  type="button"
                  onClick={() => setFiltros((f) => ({ ...f, accion: "CREATE", page: 1 }))}
                  style={S.actionPill(activeAccion === "CREATE", "CREATE")}
                >
                  ＋ Creación
                </button>

                <button
                  type="button"
                  onClick={() => setFiltros((f) => ({ ...f, accion: "UPDATE", page: 1 }))}
                  style={S.actionPill(activeAccion === "UPDATE", "UPDATE")}
                >
                  ✎ Edición
                </button>

                <button
                  type="button"
                  onClick={() => setFiltros((f) => ({ ...f, accion: "DELETE", page: 1 }))}
                  style={S.actionPill(activeAccion === "DELETE", "DELETE")}
                >
                  🗑 Eliminación
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button type="button" onClick={clearFilters} style={S.btn("ghost")}>
                  ✕ Limpiar
                </button>
                <button type="submit" style={S.btn("primary")}>
                  ⟳ Buscar
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Tabla */}
      <div style={{ marginTop: "12px" }}>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead style={S.thead}>
              <tr>
                <th style={{ ...S.th, cursor: "pointer" }} onClick={toggleOrden} title="Click para cambiar orden">
                  Fecha {ordenFecha === "DESC" ? "↓" : "↑"}
                </th>
                <th style={S.th}>Tabla</th>
                <th style={S.th}>Acción</th>
                <th style={S.th}>Usuario</th>
                <th style={S.th}>Detalle del Cambio</th>
                <th style={{ ...S.th, textAlign: "center" }}>Ver</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#64748b" }}>
                    ⏳ Cargando...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", padding: "44px", color: "#64748b" }}>
                    <div style={{ fontSize: "1.35rem", marginBottom: 8 }}>🕵️‍♂️</div>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>Sin resultados</div>
                    <div style={{ marginTop: 6, fontSize: "0.9rem" }}>Prueba limpiar filtros o ajustar el rango.</div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const accion = ACCION_META[log.accion] || { bg: "#f3f4f6", text: "#374151", label: log.accion };
                  const tablaStyle = getTablaStyle(log.tabla_afectada);
                  const resumen = getResumenCambio(log);

                  return (
                    <tr
                      key={log.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = S.rowHover.background)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* ✅ MODIFICADO: Usar formatFecha(log) que prioriza fecha_formateada del backend */}
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>{formatFecha(log)}</td>

                      <td style={S.td}>
                        <span style={S.badge(tablaStyle.bg, tablaStyle.text)}>
                          {TABLA_LABELS[log.tabla_afectada] || log.tabla_afectada}
                        </span>
                      </td>

                      <td style={S.td}>
                        <span style={S.badge(accion.bg, accion.text)}>{accion.label}</span>
                      </td>

                      <td style={{ ...S.td, fontWeight: 700 }}>
                        {log.empleado?.nombre_empleado || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Sistema</span>}
                      </td>

                      {/* Columna de detalle del cambio */}
                      <td style={S.td}>
                        <div style={S.changeSummary}>
                          <button
                            type="button"
                            onClick={() => openTimeline(log.tabla_afectada, log.id_registro, resumen.nombre)}
                            style={{ ...S.linkBtn, ...S.entityName, textAlign: "left" }}
                            title="Ver historial completo"
                          >
                            {resumen.nombre}
                          </button>
                          <div style={S.changeDetail}>
                            <span style={S.changeBadge}>{resumen.tipo}</span>
                            <span>{resumen.detalle}</span>
                            {resumen.cambiosExtra > 0 && (
                              <span style={{ color: "#94a3b8" }}>(+{resumen.cambiosExtra} más)</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ ...S.td, textAlign: "center" }}>
                        <button onClick={() => openDetails(log)} style={S.eyeBtn} title="Ver detalles completos">
                          👁
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
            <button onClick={() => changePage(1)} disabled={pagination.page <= 1} style={S.btn("ghost")}>
              ⏮
            </button>
            <button onClick={() => changePage(pagination.page - 1)} disabled={pagination.page <= 1} style={S.btn("soft")}>
              ← Anterior
            </button>

            <span style={{ padding: "0 6px", color: "#334155", fontWeight: 800 }}>
              Página {pagination.page} de {pagination.totalPages}
            </span>

            <button onClick={() => changePage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} style={S.btn("soft")}>
              Siguiente →
            </button>
            <button onClick={() => changePage(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages} style={S.btn("ghost")}>
              ⏭
            </button>
          </div>
        )}
      </div>

      {/* Modal Detalles */}
      {modalOpen && selectedLog && (
        <div style={S.backdrop} onClick={() => setModalOpen(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900 }}>
                    Detalle del Cambio
                  </h2>
                  <span style={S.badge(ACCION_META[selectedLog.accion]?.bg || "#f3f4f6", ACCION_META[selectedLog.accion]?.text || "#374151")}>
                    {ACCION_META[selectedLog.accion]?.label || selectedLog.accion}
                  </span>
                </div>
                {/* ✅ MODIFICADO: Usar formatFecha(selectedLog) */}
                <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                  {formatFecha(selectedLog)}
                </p>
              </div>

              <button type="button" style={S.closeX} onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ ...S.modalBody, maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <div style={S.label}>Tabla</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={S.badge(getTablaStyle(selectedLog.tabla_afectada).bg, getTablaStyle(selectedLog.tabla_afectada).text)}>
                      {TABLA_LABELS[selectedLog.tabla_afectada] || selectedLog.tabla_afectada}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={S.label}>Entidad</div>
                  {/* ✅ MODIFICADO: Priorizar entidad_nombre del backend */}
                  <div style={{ marginTop: 6, fontWeight: 900, color: "#111827" }}>
                    {selectedLog.entidad_nombre || getResumenCambio(selectedLog).nombre}
                  </div>
                  {/* ID extra claro */}
                  <div style={{ marginTop: 4, color: "#64748b", fontSize: "0.85rem", fontWeight: 700 }}>
                    ID: {selectedLog.id_registro || "-"}
                  </div>
                </div>

                <div>
                  <div style={S.label}>Usuario</div>
                  <div style={{ marginTop: 6, fontWeight: 800 }}>
                    {selectedLog.empleado?.nombre_empleado || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Sistema</span>}
                  </div>
                </div>

                <div>
                  <div style={S.label}>Fecha y Hora</div>
                  {/* ✅ MODIFICADO: Usar formatFecha(selectedLog) */}
                  <div style={{ marginTop: 6, color: "#475569" }}>{formatFecha(selectedLog)}</div>
                </div>
              </div>

              {selectedLog.accion === "UPDATE" && renderVisualDiff(selectedLog.datos_anteriores, selectedLog.datos_nuevos)}
              {selectedLog.accion === "CREATE" && renderJSON(selectedLog.datos_nuevos, "✨ Registro creado", false)}
              {selectedLog.accion === "DELETE" && renderJSON(selectedLog.datos_anteriores, "🗑️ Registro eliminado", true)}
            </div>

            <div style={S.modalFooter}>
              <button type="button" style={S.btn("ghost")} onClick={() => setModalOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Timeline */}
      {timelineOpen && (
        <div style={S.backdrop} onClick={() => setTimelineOpen(false)}>
          <div style={{ ...S.modal, maxWidth: "860px" }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900 }}>
                  📜 Historial: {timelineInfo.nombre}
                </h2>
                <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                  {TABLA_LABELS[timelineInfo.tabla] || timelineInfo.tabla} • {timelineData.length} cambios registrados
                </p>
              </div>

              <button type="button" style={S.closeX} onClick={() => setTimelineOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ ...S.modalBody, maxHeight: "70vh", overflowY: "auto" }}>
              {timelineData.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>No hay cambios registrados</div>
              ) : (
                <div style={{ position: "relative", paddingLeft: "26px" }}>
                  <div style={{ position: "absolute", left: "10px", top: 0, bottom: 0, width: 2, background: "#e5e7eb" }} />
                  {timelineData.map((log) => {
                    const accion = ACCION_META[log.accion] || { bg: "#f3f4f6", text: "#374151", label: log.accion };
                    const resumen = getResumenCambio(log);
                    return (
                      <div key={log.id} style={{ position: "relative", marginBottom: "16px" }}>
                        <div
                          style={{
                            position: "absolute",
                            left: "-22px",
                            top: "10px",
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: accion.bg,
                            border: `2px solid ${accion.text}`,
                          }}
                        />
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px 14px", background: "white" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: 8 }}>
                            <span style={S.badge(accion.bg, accion.text)}>{accion.label}</span>
                            {/* ✅ MODIFICADO: Usar formatFecha(log) */}
                            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>{formatFecha(log)}</span>
                          </div>
                          <div style={{ fontSize: "0.92rem", color: "#0f172a", fontWeight: 800 }}>
                            {log.empleado?.nombre_empleado || "Sistema"}
                          </div>
                          <div style={{ marginTop: 6, fontSize: "0.85rem", color: "#475569" }}>
                            <span style={S.changeBadge}>{resumen.tipo}</span> {resumen.detalle}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTimelineOpen(false);
                              openDetails(log);
                            }}
                            style={{ ...S.btn("ghost"), marginTop: 10 }}
                          >
                            Ver detalles →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={S.modalFooter}>
              <button type="button" style={S.btn("ghost")} onClick={() => setTimelineOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
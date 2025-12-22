// frontend/src/api/audit.js
import api from "./axios";

/**
 * Obtener logs de auditoría con filtros
 * @param {Object} params - Filtros opcionales
 * @param {string} params.tabla - Filtrar por tabla
 * @param {string} params.accion - CREATE, UPDATE, DELETE
 * @param {string} params.id_registro - ID del registro
 * @param {string} params.id_empleado - ID del empleado (o "null" para Sistema)
 * @param {string} params.fecha_inicio - Fecha inicio YYYY-MM-DD
 * @param {string} params.fecha_fin - Fecha fin YYYY-MM-DD
 * @param {string} params.orden - ASC o DESC (default: DESC)
 * @param {string} params.tipo_cambio - Tipo de cambio predefinido
 * @param {string} params.campo_modificado - Campo específico a buscar
 * @param {string} params.busqueda - Búsqueda general (nombre, ID, código, CUIT)
 * @param {number} params.page - Página
 * @param {number} params.limit - Límite por página
 */
export const getAuditLogs = (params = {}) => {
  const query = new URLSearchParams();

  if (params.tabla) query.append("tabla", params.tabla);
  if (params.accion) query.append("accion", params.accion);
  if (params.id_registro) query.append("id_registro", params.id_registro);
  if (params.id_empleado) query.append("id_empleado", params.id_empleado);
  if (params.fecha_inicio) query.append("fecha_inicio", params.fecha_inicio);
  if (params.fecha_fin) query.append("fecha_fin", params.fecha_fin);
  if (params.orden) query.append("orden", params.orden);
  if (params.tipo_cambio) query.append("tipo_cambio", params.tipo_cambio);
  if (params.campo_modificado) query.append("campo_modificado", params.campo_modificado);
  if (params.busqueda) query.append("busqueda", params.busqueda);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const queryString = query.toString();
  return api.get(`/audit${queryString ? `?${queryString}` : ""}`);
};

/**
 * Obtener un log específico por ID
 */
export const getAuditLogById = (id) => api.get(`/audit/${id}`);

/**
 * Obtener historial completo de un registro específico
 */
export const getRegistroHistorial = (tabla, idRegistro) =>
  api.get(`/audit/historial/${tabla}/${idRegistro}`);

/**
 * Obtener lista de tablas que tienen registros de auditoría
 */
export const getTablasAuditadas = () => api.get("/audit/tablas");

/**
 * Obtener estadísticas de auditoría
 * @param {number} dias - Número de días hacia atrás (default: 7)
 */
export const getAuditStats = (dias = 7) => api.get(`/audit/estadisticas?dias=${dias}`);

/**
 * ✅ NUEVO: Obtener tipos de cambio predefinidos para filtros
 */
export const getTiposCambio = () => api.get("/audit/tipos-cambio");

/**
 * ✅ NUEVO: Obtener campos disponibles para autocompletado
 */
export const getCamposDisponibles = () => api.get("/audit/campos-disponibles");

/**
 * Obtener sugerencias de búsqueda para autocompletado
 * @param {string} query - Término de búsqueda (mínimo 2 caracteres)
 */
export const getSearchSuggestions = (query) =>
  api.get(`/audit/search-suggestions?q=${encodeURIComponent(query)}`);
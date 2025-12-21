import { Op, Sequelize } from "sequelize";
import AuditLog from "../models/AuditLog.js";
import Empleado from "../models/Empleado.js";
import Producto from "../models/Producto.js";
import Cliente from "../models/Cliente.js"; 
import Proveedor from "../models/Proveedor.js"; // ✅ Importación Agregada
import Zona from "../models/Zona.js";           // ✅ Importación Agregada

// =====================================================
// TIPOS DE CAMBIO PREDEFINIDOS
// =====================================================
const TIPOS_CAMBIO = {
  cambio_stock: {
    label: "Cambios de Stock",
    campos: ["stock"],
    tablas: ["productos"],
    accion: "UPDATE",
  },
  cambio_precio: {
    label: "Cambios de Precio",
    campos: ["precio", "precio_unitario"],
    tablas: ["productos", "contiene"],
    accion: "UPDATE",
  },
  cambio_status: {
    label: "Cambios de Status",
    campos: ["status"],
    tablas: ["pedidos", "envios"],
    accion: "UPDATE",
  },
  movimiento_zona: {
    label: "Movimientos de Zona",
    campos: ["id_zona"],
    tablas: ["seubica"],
    accion: null,
  },
  cambio_empleado: {
    label: "Asignación de Empleado",
    campos: ["id_empleado", "id_empleado_responsable"],
    tablas: null,
    accion: "UPDATE",
  },
  cambio_cliente: {
    label: "Cambios de Cliente",
    campos: null,
    tablas: ["clientes"],
    accion: "UPDATE",
  },
  cambio_proveedor: {
    label: "Cambios de Proveedor",
    campos: null,
    tablas: ["proveedor"],
    accion: "UPDATE",
  },
  creacion_producto: {
    label: "Creación de Productos",
    campos: null,
    tablas: ["productos"],
    accion: "CREATE",
  },
  eliminacion_producto: {
    label: "Eliminación de Productos",
    campos: null,
    tablas: ["productos"],
    accion: "DELETE",
  },
  creacion_pedido: {
    label: "Creación de Pedidos",
    campos: null,
    tablas: ["pedidos"],
    accion: "CREATE",
  },
  creacion_empleado: {
    label: "Creación de Empleados",
    campos: null,
    tablas: ["empleados"],
    accion: "CREATE",
  },
};

// =====================================================
// Helpers de Búsqueda y Utilidades
// =====================================================
function safeParseJSON(x) {
  if (!x) return null;
  if (typeof x === "object") return x;
  try {
    return JSON.parse(x);
  } catch {
    return null;
  }
}

// ✅ CORREGIDO: Productos usan ID como String (sin parseInt forzado)
async function findProductoByRegistro(idRegistro) {
  if (!idRegistro) return null;
  const idStr = String(idRegistro).trim();
  return Producto.findByPk(idStr, {
    attributes: ["id_producto", "nombre_producto"],
  });
}

// Clientes usan ID Integer
async function findClienteByRegistro(idRegistro) {
  if (!idRegistro) return null;
  const id = parseInt(String(idRegistro).trim(), 10);
  if (isNaN(id) || id <= 0) return null;
  return Cliente.findByPk(id, {
    attributes: ["id_cliente", "nombre_cliente"],
  });
}

// Empleados usan ID Integer
async function findEmpleadoByRegistro(idRegistro) {
  if (!idRegistro) return null;
  const id = parseInt(String(idRegistro).trim(), 10);
  if (isNaN(id) || id <= 0) return null;
  return Empleado.findByPk(id, {
    attributes: ["id_empleado", "nombre_empleado"],
  });
}

// ✅ NUEVO: Proveedores usan ID Integer
async function findProveedorByRegistro(idRegistro) {
  if (!idRegistro) return null;
  const id = parseInt(String(idRegistro).trim(), 10);
  if (isNaN(id) || id <= 0) return null;
  return Proveedor.findByPk(id, {
    attributes: ["id_proveedor", "nombre_proveedor"],
  });
}

// ✅ NUEVO: Zonas usan ID Integer
async function findZonaByRegistro(idRegistro) {
  if (!idRegistro) return null;
  const id = parseInt(String(idRegistro).trim(), 10);
  if (isNaN(id) || id <= 0) return null;
  return Zona.findByPk(id, {
    attributes: ["id_zona", "codigo", "descripcion"],
  });
}

// Búsqueda de productos por nombre para el filtro avanzado
async function getMatchingProductoRegistros(busqueda) {
  const term = busqueda.trim();
  if (!term) return [];

  const prods = await Producto.findAll({
    where: {
      nombre_producto: { [Op.like]: `%${term}%` },
    },
    attributes: ["id_producto"],
    limit: 50,
    raw: true,
  });

  const ids = prods.map((p) => String(p.id_producto)).filter(Boolean);
  return Array.from(new Set(ids));
}

// =====================================================
// GET /api/audit
// =====================================================
export const getAuditLogs = async (req, res) => {
  try {
    const {
      tabla,
      accion,
      id_registro,
      id_empleado,
      fecha_inicio,
      fecha_fin,
      page = 1,
      limit = 50,
      orden = "DESC",
      tipo_cambio,
      busqueda,
    } = req.query;

    const where = {};

    // 1. Filtros básicos
    if (tabla) where.tabla_afectada = tabla;
    if (accion) where.accion = accion.toUpperCase();
    if (id_registro) where.id_registro = id_registro;

    // 2. Filtro de empleado
    if (id_empleado) {
      if (id_empleado === "null" || id_empleado === "sistema") {
        where.id_empleado = null;
      } else {
        where.id_empleado = parseInt(id_empleado);
      }
    }

    // 3. Filtro de fechas
    if (fecha_inicio || fecha_fin) {
        where.created_at = {};
        if (fecha_inicio) {
          where.created_at[Op.gte] = new Date(`${fecha_inicio}T00:00:00`); 
        }
        if (fecha_fin) {
          where.created_at[Op.lte] = new Date(`${fecha_fin}T23:59:59`);
        }
    }

    // 4. Búsqueda Avanzada
    if (busqueda && busqueda.trim()) {
      const term = busqueda.trim().replace(/'/g, "''");
      
      const matchingProductoRegistros = await getMatchingProductoRegistros(busqueda);

      const orConditions = [
        { tabla_afectada: { [Op.like]: `%${term}%` } },
        { id_registro: { [Op.like]: `%${term}%` } },
        Sequelize.literal(`CAST(datos_anteriores AS CHAR) LIKE '%${term}%'`),
        Sequelize.literal(`CAST(datos_nuevos AS CHAR) LIKE '%${term}%'`),
      ];

      if (matchingProductoRegistros.length > 0) {
        orConditions.push({
          [Op.and]: [
            { tabla_afectada: "productos" },
            { id_registro: { [Op.in]: matchingProductoRegistros } },
          ],
        });

        // Búsqueda profunda en JSON
        const jsonSearchSnippet = matchingProductoRegistros
          .map(id => `CAST(datos_anteriores AS CHAR) LIKE '%"id_producto":${id}%' OR CAST(datos_nuevos AS CHAR) LIKE '%"id_producto":${id}%'`)
          .join(" OR ");
        
        if (jsonSearchSnippet) {
           orConditions.push(Sequelize.literal(`(${jsonSearchSnippet})`));
        }
      }

      where[Op.or] = orConditions;
    }

    // 5. Filtro por "Tipo de Cambio"
    if (tipo_cambio && TIPOS_CAMBIO[tipo_cambio]) {
      const tipoCfg = TIPOS_CAMBIO[tipo_cambio];

      if (tipoCfg.tablas && tipoCfg.tablas.length > 0) {
        where.tabla_afectada = { [Op.in]: tipoCfg.tablas };
      }
      if (tipoCfg.accion) {
        where.accion = tipoCfg.accion;
      }
      if (tipoCfg.campos && tipoCfg.campos.length > 0) {
        const campoConditions = tipoCfg.campos.map((campo) =>
          Sequelize.literal(
            `(CAST(datos_anteriores AS CHAR) LIKE '%"${campo}":%' OR CAST(datos_nuevos AS CHAR) LIKE '%"${campo}":%')`
          )
        );
        if (!where[Op.and]) where[Op.and] = [];
        where[Op.and].push({ [Op.or]: campoConditions });
      }
    }

    // Paginación y Orden
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    const orderDirection = orden.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: Empleado,
          as: "empleado",
          attributes: ["id_empleado", "nombre_empleado", "correo"],
          required: false,
        },
      ],
      order: [["created_at", orderDirection]],
      limit: limitNum,
      offset,
    });

    // =====================================================
    // ENRIQUECIMIENTO DE DATOS (NOMBRES REALES)
    // =====================================================
    const enrichedRows = await Promise.all(
      rows.map(async (row) => {
        const log = row.toJSON();
        const datos = safeParseJSON(log.datos_nuevos) || safeParseJSON(log.datos_anteriores);

        // Fecha ISO para el frontend
        const fechaDB = new Date(log.created_at);
        log.fecha_iso = fechaDB.toISOString();
        
        // Helper interno
        const formatStr = (nombre, id) => (nombre ? `${nombre} (ID: ${id})` : `ID: ${id}`);

        // 1. PRODUCTOS
        if (log.tabla_afectada === "productos") {
          const item = await findProductoByRegistro(log.id_registro);
          const nombreReal = item ? item.nombre_producto : (datos?.nombre_producto);
          
          if (nombreReal) {
            log.entidad_nombre = `${nombreReal} (ID: ${log.id_registro})`;
          } else {
            log.entidad_nombre = `Producto (ID: ${log.id_registro})`;
          }
        }

        // 2. CLIENTES
        else if (log.tabla_afectada === "clientes") {
          const item = await findClienteByRegistro(log.id_registro);
          log.entidad_nombre = item 
            ? formatStr(item.nombre_cliente, log.id_registro) 
            : (datos?.nombre_cliente || `Cliente (ID: ${log.id_registro})`);
        }

        // 3. EMPLEADOS
        else if (log.tabla_afectada === "empleados") {
          const item = await findEmpleadoByRegistro(log.id_registro);
          log.entidad_nombre = item 
            ? formatStr(item.nombre_empleado, log.id_registro) 
            : (datos?.nombre_empleado || `Empleado (ID: ${log.id_registro})`);
        }

        // 4. PROVEEDORES (NUEVO)
        else if (log.tabla_afectada === "proveedor") {
          const item = await findProveedorByRegistro(log.id_registro);
          log.entidad_nombre = item 
            ? formatStr(item.nombre_proveedor, log.id_registro) 
            : (datos?.nombre_proveedor || `Proveedor (ID: ${log.id_registro})`);
        }

        // 5. ZONAS (NUEVO)
        else if (log.tabla_afectada === "zonas" || log.tabla_afectada === "zona") {
          const item = await findZonaByRegistro(log.id_registro);
          const nombre = item ? `${item.codigo}` : (datos?.codigo);
          log.entidad_nombre = nombre ? `Zona: ${nombre}` : `Zona (ID: ${log.id_registro})`;
        }

        // 6. UBICACIONES / DETALLES (Relacionados con Productos)
        else if (["seubica", "contiene", "envio_detalle"].includes(log.tabla_afectada)) {
            if (datos?.id_producto) {
              const p = await findProductoByRegistro(datos.id_producto);
              const prodNombre = p ? p.nombre_producto : `Producto ${datos.id_producto}`;
              
              if (log.tabla_afectada === "seubica") log.entidad_nombre = `Ubicación: ${prodNombre}`;
              else if (log.tabla_afectada === "contiene") log.entidad_nombre = `Pedido Detalle: ${prodNombre}`;
              else log.entidad_nombre = `Envío Detalle: ${prodNombre}`;
            } else {
              if (log.tabla_afectada === "seubica") log.entidad_nombre = `Movimiento de Zona (ID: ${log.id_registro})`;
              else if (log.tabla_afectada === "contiene") log.entidad_nombre = `Detalle Pedido (ID: ${log.id_registro})`;
              else log.entidad_nombre = `Detalle Envío (ID: ${log.id_registro})`;
            }
        }

        // 7. OTROS
        else if (log.tabla_afectada === "pedidos") log.entidad_nombre = `Pedido #${log.id_registro}`;
        else if (log.tabla_afectada === "envios") log.entidad_nombre = `Envío #${log.id_registro}`;
        else if (["suministro", "suministra"].includes(log.tabla_afectada)) log.entidad_nombre = `Suministro (ID: ${log.id_registro})`;
        
        else {
          log.entidad_nombre = `Registro (ID: ${log.id_registro})`;
        }

        return log;
      })
    );

    res.json({
      ok: true,
      data: enrichedRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("❌ Error en getAuditLogs:", error);
    res.status(500).json({ ok: false, error: "Error al obtener registros de auditoría" });
  }
};

// =====================================================
// GET /api/audit/tipos-cambio
// =====================================================
export const getTiposCambio = async (req, res) => {
  try {
    const tipos = Object.entries(TIPOS_CAMBIO).map(([key, value]) => ({
      id: key,
      label: value.label,
      tablas: value.tablas,
      accion: value.accion || null,
    }));
    res.json({ ok: true, data: tipos });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Error al obtener tipos de cambio" });
  }
};

// =====================================================
// GET /api/audit/campos-disponibles
// =====================================================
export const getCamposDisponibles = async (req, res) => {
  try {
    const muestra = await AuditLog.findAll({
      attributes: ["datos_anteriores", "datos_nuevos"],
      limit: 100,
      order: [["created_at", "DESC"]],
      raw: true,
    });

    const camposSet = new Set();
    muestra.forEach((log) => {
      const a = safeParseJSON(log.datos_anteriores);
      const n = safeParseJSON(log.datos_nuevos);
      Object.keys(a || {}).forEach((k) => camposSet.add(k));
      Object.keys(n || {}).forEach((k) => camposSet.add(k));
    });

    const camposPrioritarios = [
      "stock", "precio", "status", "id_zona", "id_empleado", "id_cliente",
      "nombre_producto", "nombre_cliente", "nombre_empleado", "direccion",
      "telefono", "correo", "total", "subtotal", "cantidad"
    ];

    const todosLosCampos = Array.from(camposSet);
    const ordenados = [
      ...camposPrioritarios.filter((c) => todosLosCampos.includes(c)),
      ...todosLosCampos.filter((c) => !camposPrioritarios.includes(c)).sort(),
    ];

    res.json({ ok: true, data: ordenados });
  } catch (error) {
    console.error("Error en getCamposDisponibles:", error);
    res.status(500).json({ ok: false, error: "Error al obtener campos disponibles" });
  }
};

// =====================================================
// GET /api/audit/:id
// =====================================================
export const getAuditLogById = async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id, {
      include: [
        {
          model: Empleado,
          as: "empleado",
          attributes: ["id_empleado", "nombre_empleado", "correo"],
        },
      ],
    });

    if (!log) {
      return res.status(404).json({ ok: false, error: "Registro no encontrado" });
    }

    const logJSON = log.toJSON();
    const datos = safeParseJSON(logJSON.datos_nuevos) || safeParseJSON(logJSON.datos_anteriores);
    const fechaDB = new Date(logJSON.created_at);
    logJSON.fecha_iso = fechaDB.toISOString();

    const formatStr = (nombre, id) => (nombre ? `${nombre} (ID: ${id})` : `ID: ${id}`);

    // LOGICA DE NOMBRES EN DETALLE
    if (logJSON.tabla_afectada === "productos") {
        const prod = await findProductoByRegistro(logJSON.id_registro);
        const nombre = prod ? prod.nombre_producto : datos?.nombre_producto;
        logJSON.entidad_nombre = nombre ? `${nombre} (ID: ${logJSON.id_registro})` : `Producto (ID: ${logJSON.id_registro})`;
    }
    else if (logJSON.tabla_afectada === "clientes") {
        const cliente = await findClienteByRegistro(logJSON.id_registro);
        logJSON.entidad_nombre = cliente ? formatStr(cliente.nombre_cliente, logJSON.id_registro) : (datos?.nombre_cliente || `Cliente (ID: ${logJSON.id_registro})`);
    }
    else if (logJSON.tabla_afectada === "empleados") {
        const empleado = await findEmpleadoByRegistro(logJSON.id_registro);
        logJSON.entidad_nombre = empleado ? formatStr(empleado.nombre_empleado, logJSON.id_registro) : (datos?.nombre_empleado || `Empleado (ID: ${logJSON.id_registro})`);
    }
    else if (logJSON.tabla_afectada === "proveedor") {
      const item = await findProveedorByRegistro(logJSON.id_registro);
      logJSON.entidad_nombre = item ? formatStr(item.nombre_proveedor, logJSON.id_registro) : (datos?.nombre_proveedor || `Proveedor (ID: ${logJSON.id_registro})`);
    }
    else if (logJSON.tabla_afectada === "zonas" || logJSON.tabla_afectada === "zona") {
      const item = await findZonaByRegistro(logJSON.id_registro);
      logJSON.entidad_nombre = item ? `Zona: ${item.codigo}` : `Zona ${logJSON.id_registro}`;
    }
    else if (datos?.id_producto) {
        const prod = await findProductoByRegistro(datos.id_producto);
        logJSON.entidad_nombre = prod ? prod.nombre_producto : `Producto ${datos.id_producto}`;
    }
    
    // Fallback
    if(!logJSON.entidad_nombre) {
         const nombre = datos?.nombre_proveedor || datos?.nombre_zona || datos?.codigo;
         logJSON.entidad_nombre = nombre 
           ? formatStr(nombre, logJSON.id_registro)
           : `Registro (ID: ${logJSON.id_registro})`;
    }

    res.json({ ok: true, data: logJSON });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "Error al obtener registro" });
  }
};

// =====================================================
// GET /api/audit/historial/:tabla/:id_registro
// =====================================================
export const getRegistroHistorial = async (req, res) => {
  try {
    const { tabla, id_registro } = req.params;

    const historial = await AuditLog.findAll({
      where: { tabla_afectada: tabla, id_registro },
      include: [
        {
          model: Empleado,
          as: "empleado",
          attributes: ["id_empleado", "nombre_empleado", "correo"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    let entidadNombre = null;

    // Buscar nombre actual en DB para el título
    if (tabla === "productos") {
      const p = await findProductoByRegistro(id_registro);
      if (p) entidadNombre = `${p.nombre_producto} (ID: ${id_registro})`;
    } else if (tabla === "clientes") {
      const c = await findClienteByRegistro(id_registro);
      if (c) entidadNombre = `${c.nombre_cliente} (ID: ${id_registro})`;
    } else if (tabla === "empleados") {
      const e = await findEmpleadoByRegistro(id_registro);
      if (e) entidadNombre = `${e.nombre_empleado} (ID: ${id_registro})`;
    } else if (tabla === "proveedor") {
      const p = await findProveedorByRegistro(id_registro);
      if (p) entidadNombre = `${p.nombre_proveedor} (ID: ${id_registro})`;
    } else if (tabla === "zonas") {
      const z = await findZonaByRegistro(id_registro);
      if (z) entidadNombre = `Zona: ${z.codigo}`;
    }

    // Fallback con datos del historial si no está en DB (borrado)
    if (!entidadNombre && historial.length > 0) {
        const d = safeParseJSON(historial[0].datos_nuevos) || safeParseJSON(historial[0].datos_anteriores);
        entidadNombre = d?.nombre_producto || d?.nombre_cliente || d?.nombre_proveedor || d?.codigo;
        if(entidadNombre) entidadNombre = `${entidadNombre} (ID: ${id_registro})`;
    }

    const historialConFecha = historial.map(h => {
      const hJSON = h.toJSON();
      const fechaDB = new Date(hJSON.created_at);
      hJSON.fecha_iso = fechaDB.toISOString();
      return hJSON;
    });

    res.json({
      ok: true,
      tabla,
      id_registro,
      entidad_nombre: entidadNombre || `Registro (ID: ${id_registro})`,
      total_cambios: historial.length,
      data: historialConFecha,
    });
  } catch (error) {
    console.error("Error en getRegistroHistorial:", error);
    res.status(500).json({ ok: false, error: "Error al obtener historial" });
  }
};

// =====================================================
// GET /api/audit/tablas
// =====================================================
export const getTablasAuditadas = async (req, res) => {
  try {
    const tablas = await AuditLog.findAll({
      attributes: ["tabla_afectada"],
      group: ["tabla_afectada"],
      raw: true,
    });
    res.json({ ok: true, data: tablas.map((t) => t.tabla_afectada) });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Error al obtener tablas" });
  }
};

// =====================================================
// GET /api/audit/estadisticas
// =====================================================
export const getAuditStats = async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(dias));

    const porAccion = await AuditLog.findAll({
      where: { created_at: { [Op.gte]: fechaInicio } },
      attributes: [
        "accion",
        [AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("id")), "total"],
      ],
      group: ["accion"],
      raw: true,
    });

    const porEmpleado = await AuditLog.findAll({
      where: { created_at: { [Op.gte]: fechaInicio } },
      attributes: [
        "id_empleado",
        [AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("id")), "total"],
      ],
      include: [
        {
          model: Empleado,
          as: "empleado",
          attributes: ["nombre_empleado"],
          required: false,
        },
      ],
      group: ["id_empleado", "empleado.id_empleado", "empleado.nombre_empleado"],
      order: [[AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("id")), "DESC"]],
      limit: 10,
    });

    res.json({
      ok: true,
      periodo_dias: parseInt(dias),
      estadisticas: {
        por_accion: porAccion,
        por_empleado: porEmpleado.map((e) => ({
          id_empleado: e.id_empleado,
          nombre_empleado: e.empleado?.nombre_empleado || "Sistema",
          total: e.get("total"),
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error en getAuditStats:", error);
    res.status(500).json({ ok: false, error: "Error al obtener estadísticas" });
  }
};
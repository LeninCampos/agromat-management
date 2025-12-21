// backend/src/controllers/empleado.controller.js
import { Empleado } from "../models/index.js";

// Helper para obtener opciones de auditoría
function getAuditOptions(req) {
  // Intentamos leer el header 'x-client-time'
  // Si el frontend no lo envía, quedará null (y se usará solo created_at del server)
  const clientTimeHeader = req.headers['x-client-time']; 
  
  return {
    userId: req.empleado?.id || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    clientTime: clientTimeHeader ? new Date(clientTimeHeader) : null, // ✅ Capturamos la hora
  };
}

export const getAllEmpleados = async (req, res, next) => {
  try {
    res.json(await Empleado.findAll({ order: [["id_empleado", "ASC"]] }));
  } catch (e) {
    next(e);
  }
};

export const getEmpleadoById = async (req, res, next) => {
  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const createEmpleado = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const data = { ...req.body };
    if (!data.fecha_alta) {
      data.fecha_alta = new Date();
    }
    const created = await Empleado.create(data, auditOptions);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
};

export const updateEmpleado = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    await row.update(req.body, auditOptions);
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const deleteEmpleado = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    await row.destroy(auditOptions);
    res.json({ ok: true, mensaje: "Empleado eliminado" });
  } catch (e) {
    next(e);
  }
};
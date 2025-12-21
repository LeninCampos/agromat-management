// backend/src/controllers/proveedor.controller.js
import { Proveedor, Suministro } from "../models/index.js";

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

export const getAllProveedores = async (req, res, next) => {
  try {
    const rows = await Proveedor.findAll({
      include: [{ model: Suministro, attributes: ["id_suministro"] }],
      order: [["id_proveedor", "ASC"]],
    });

    const data = rows.map((p) => {
      const json = p.toJSON();
      return {
        ...json,
        total_suministros: json.Suministros ? json.Suministros.length : 0,
      };
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const getProveedorById = async (req, res, next) => {
  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const createProveedor = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const created = await Proveedor.create(req.body, auditOptions);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
};

export const updateProveedor = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    await row.update({ ...req.body }, auditOptions);
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const deleteProveedor = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    await row.destroy(auditOptions);
    res.json({ ok: true, mensaje: "Proveedor eliminado" });
  } catch (e) {
    next(e);
  }
};
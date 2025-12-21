// backend/src/controllers/zona.controller.js
import { Zona, SeUbica } from "../models/index.js";

// Helper para obtener opciones de auditoría
function getAuditOptions(req) {
  return {
    userId: req.empleado?.id || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
  };
}

// GET /api/zonas
export const getAllZonas = async (req, res, next) => {
  try {
    const zonas = await Zona.findAll({ order: [["codigo", "ASC"]] });
    res.json(zonas);
  } catch (err) {
    next(err);
  }
};

// GET /api/zonas/:id
export const getZonaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const zona = await Zona.findByPk(id);
    if (!zona) return res.status(404).json({ error: "Zona no encontrada" });
    res.json(zona);
  } catch (err) {
    next(err);
  }
};

// POST /api/zonas
export const createZona = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const { codigo, rack, modulo, piso, descripcion } = req.body;

    if (!codigo || !rack || modulo == null || piso == null) {
      return res.status(400).json({ error: "codigo, rack, modulo y piso son obligatorios" });
    }

    const nueva = await Zona.create({
      codigo: codigo.trim(),
      rack: rack.trim(),
      modulo: Number(modulo),
      piso: Number(piso),
      descripcion: descripcion || null,
    }, auditOptions);

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
};

// PUT /api/zonas/:id
export const updateZona = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    const { codigo, rack, modulo, piso, descripcion } = req.body;

    const zona = await Zona.findByPk(id);
    if (!zona) return res.status(404).json({ error: "Zona no encontrada" });

    await zona.update({
      ...(codigo !== undefined && { codigo: codigo.trim() }),
      ...(rack !== undefined && { rack: rack.trim() }),
      ...(modulo !== undefined && { modulo: Number(modulo) }),
      ...(piso !== undefined && { piso: Number(piso) }),
      ...(descripcion !== undefined && { descripcion: descripcion || null }),
    }, auditOptions);

    res.json(zona);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/zonas/:id
export const deleteZona = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;

    const countUbicaciones = await SeUbica.count({ where: { id_zona: id } });
    if (countUbicaciones > 0) {
      return res.status(409).json({
        error: "No se puede eliminar la zona porque tiene productos asignados. Mueve o elimina esos productos primero.",
      });
    }

    const zona = await Zona.findByPk(id);
    if (!zona) return res.status(404).json({ error: "Zona no encontrada" });

    await zona.destroy(auditOptions);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
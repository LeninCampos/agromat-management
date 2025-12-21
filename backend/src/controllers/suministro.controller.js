// backend/src/controllers/suministro.controller.js
import {
  sequelize,
  Suministro,
  Proveedor,
  Suministra,
  Producto,
  Empleado,
} from "../models/index.js";

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

export const getAllSuministros = async (req, res, next) => {
  try {
    const rows = await Suministro.findAll({
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] },
        { model: Empleado, attributes: ["id_empleado", "nombre_empleado"] },
        {
          model: Suministra,
          include: [{ model: Producto, attributes: ["id_producto", "nombre_producto", "imagen_url"] }],
        },
      ],
      order: [["id_suministro", "DESC"]],
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const getSuministroById = async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id, {
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] },
        { model: Empleado, attributes: ["id_empleado", "nombre_empleado"] },
        {
          model: Suministra,
          include: [{ model: Producto, attributes: ["id_producto", "nombre_producto", "imagen_url"] }],
        },
      ],
    });
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const createSuministro = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);

  try {
    const { fecha_llegada, hora_llegada, id_proveedor, transportista, id_empleado, items } = req.body;

    const suministro = await Suministro.create(
      { fecha_llegada, hora_llegada, id_proveedor, transportista, id_empleado },
      { transaction: t, ...auditOptions }
    );

    if (items && items.length > 0) {
      for (const item of items) {
        const { id_producto, cantidad } = item;

        await Suministra.create(
          { id_suministro: suministro.id_suministro, id_producto, cantidad },
          { transaction: t, ...auditOptions }
        );

        const producto = await Producto.findByPk(id_producto, { transaction: t });
        if (producto) {
          await producto.increment("stock", { by: cantidad, transaction: t });
        }
      }
    }

    await t.commit();
    res.status(201).json(suministro);
  } catch (e) {
    if (!t.finished) await t.rollback();
    next(e);
  }
};

export const updateSuministro = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const row = await Suministro.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    await row.update({ ...req.body }, auditOptions);
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const deleteSuministro = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;

    const suministro = await Suministro.findByPk(id, {
      include: [{ model: Suministra }],
      transaction: t,
    });

    if (!suministro) {
      await t.rollback();
      return res.status(404).json({ error: "Suministro no encontrado" });
    }

    // Revertir stock
    for (const item of suministro.Suministras) {
      const producto = await Producto.findByPk(item.id_producto, { transaction: t });
      if (producto) {
        await producto.decrement("stock", { by: item.cantidad, transaction: t });
      }
    }

    // Borrar detalles
    await Suministra.destroy({ where: { id_suministro: id }, transaction: t });

    // Borrar cabecera
    await suministro.destroy({ transaction: t, ...auditOptions });

    await t.commit();
    res.json({ ok: true, message: "Suministro eliminado y stock revertido" });
  } catch (e) {
    await t.rollback();
    next(e);
  }
};
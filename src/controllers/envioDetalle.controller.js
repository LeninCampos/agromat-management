import { sequelize, EnvioDetalle, Envio, Producto } from "../models/index.js";

export const getAllEnvioDetalles = async (req, res, next) => {
  try {
    const { id_envio } = req.query;
    const where = id_envio ? { id_envio } : {};
    const rows = await EnvioDetalle.findAll({
      where,
      include: [
        { model: Envio, attributes: ["id_envio","id_pedido","status"] },
        { model: Producto, attributes: ["id_producto","nombre_producto"] }
      ],
      order: [["id_envio","DESC"],["renglon","ASC"]],
    });
    res.json(rows);
  } catch (e) { next(e); }
};

export const createEnvioDetalle = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id_envio, renglon, id_producto, cantidad } = req.body;
    const created = await EnvioDetalle.create(
      { id_envio, renglon: renglon ?? 1, id_producto, cantidad },
      { transaction: t }
    );
    await t.commit();
    res.status(201).json(created);
  } catch (e) {
    await t.rollback();
    if (e.original?.sqlMessage) return next(new Error(e.original.sqlMessage));
    next(e);
  }
};

export const updateEnvioDetalle = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id_envio, renglon, id_producto, cantidad } = req.body;
    const row = await EnvioDetalle.findOne({ where: { id_envio, renglon }, transaction: t });
    if (!row) { await t.rollback(); return res.status(404).json({ error: "Renglón no encontrado" }); }
    
    await row.update({ ...(id_producto !== undefined && { id_producto }), ...(cantidad !== undefined && { cantidad }) }, { transaction: t });
    await t.commit();
    res.json(row);
  } catch (e) {
    await t.rollback();
    if (e.original?.sqlMessage) return next(new Error(e.original.sqlMessage));
    next(e);
  }
};

export const deleteEnvioDetalle = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id_envio, renglon } = req.body;
    const row = await EnvioDetalle.findOne({ where: { id_envio, renglon }, transaction: t });
    if (!row) { await t.rollback(); return res.status(404).json({ error: "Renglón no encontrado" }); }
    
    await row.destroy({ transaction: t });
    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    if (e.original?.sqlMessage) return next(new Error(e.original.sqlMessage));
    next(e);
  }
};
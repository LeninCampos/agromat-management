//src/controllers/contiene.controller.js
import { Contiene, Producto } from "../models/index.js";

export const getAllContiene = async (req, res, next) => {
  try {
    const { id_pedido } = req.query;
    const where = id_pedido ? { id_pedido } : {};
    const rows = await Contiene.findAll({
      where,
      include: [{ model: Producto, attributes: ["id_producto","nombre_producto","precio"] }],
      order: [["id_pedido","DESC"],["id_producto","ASC"]],
    });
    res.json(rows);
  } catch (e) { next(e); }
};

export const updateContiene = async (req, res, next) => {
  try {
    const { id_pedido, id_producto, cantidad, precio_unitario, subtotal_linea } = req.body;
    const row = await Contiene.findOne({ where: { id_pedido, id_producto } });
    if (!row) return res.status(404).json({ error: "Línea no encontrada" });
    await row.update({
      ...(cantidad !== undefined && { cantidad }),
      ...(precio_unitario !== undefined && { precio_unitario }),
      ...(subtotal_linea !== undefined && { subtotal_linea })
    });
    res.json(row);
  } catch (e) { next(e); }
};

export const deleteContiene = async (req, res, next) => {
  try {
    const { id_pedido, id_producto } = req.body;
    const row = await Contiene.findOne({ where: { id_pedido, id_producto } });
    if (!row) return res.status(404).json({ error: "Línea no encontrada" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
};
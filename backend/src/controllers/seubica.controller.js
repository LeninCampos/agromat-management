import { SeUbica, Producto } from "../models/index.js";

// Lista por producto (opcional: ?id_producto=)
export const getAllSeUbica = async (req, res, next) => {
  try {
    const { id_producto } = req.query;
    const where = id_producto ? { id_producto } : {};
    const rows = await SeUbica.findAll({
      where,
      include: [
        { model: Producto, attributes: ["id_producto","nombre_producto"] },
      ],
      order: [["id_producto","ASC"],["nombre","ASC"],["numero","ASC"]],
    });
    res.json(rows);
  } catch (e) { next(e); }
};

// Vincular producto a zona
export const createSeUbica = async (req, res, next) => {
  try {
    const created = await SeUbica.create(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const deleteSeUbica = async (req, res, next) => {
  try {
    const { id_producto, nombre, numero } = req.body;
    const row = await SeUbica.findOne({ where: { id_producto, nombre, numero } });
    if (!row) return res.status(404).json({ error: "Vinculación no encontrada" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
};
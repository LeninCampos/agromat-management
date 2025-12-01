import { Suministra, Suministro, Producto } from "../models/index.js";

export const getAllSuministra = async (req, res, next) => {
  try {
    const { id_suministro } = req.query;
    const where = id_suministro ? { id_suministro } : {};
    const rows = await Suministra.findAll({
      where,
      include: [
        {
          model: Suministro,
          attributes: ["id_suministro", "fecha_llegada", "hora_llegada"],
        },
        {
          model: Producto,
          // 👇 AGREGADO imagen_url, lo demás igual
          attributes: ["id_producto", "nombre_producto", "imagen_url"],
        },
      ],
      order: [
        ["id_suministro", "DESC"],
        ["id_producto", "ASC"],
      ],
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const createSuministra = async (req, res, next) => {
  try {
    const created = await Suministra.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
};

export const updateSuministra = async (req, res, next) => {
  try {
    const { id_suministro, id_producto, cantidad } = req.body;
    const row = await Suministra.findOne({
      where: { id_suministro, id_producto },
    });
    if (!row)
      return res.status(404).json({ error: "Registro no encontrado" });
    await row.update({ ...(cantidad !== undefined && { cantidad }) });
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const deleteSuministra = async (req, res, next) => {
  try {
    const { id_suministro, id_producto } = req.body;
    const row = await Suministra.findOne({
      where: { id_suministro, id_producto },
    });
    if (!row)
      return res.status(404).json({ error: "Registro no encontrado" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

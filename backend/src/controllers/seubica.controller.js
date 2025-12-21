// backend/src/controllers/seubica.controller.js
import { SeUbica, Producto } from "../models/index.js";

// Lista (opcional: ?id_producto=)
export const getAllSeUbica = async (req, res, next) => {
  try {
    const { id_producto } = req.query;

    const where = {};
    if (id_producto) where.id_producto = Number(id_producto);

    const rows = await SeUbica.findAll({
      where,
      include: [
        // ✅ Si tu asociación usa alias, deja "as: 'producto'".
        // Si NO usas alias en el modelo, borra la línea `as: "producto"`.
        { model: Producto, as: "producto", attributes: ["id_producto", "codigo", "nombre_producto"] },
      ],
      // ✅ Orden por columnas típicas reales de SeUbica:
      // Ajusta "id_zona" / "piso" según tu modelo real.
      order: [
        ["id_producto", "ASC"],
        ["id_zona", "ASC"],
        ["piso", "ASC"],
      ],
    });

    res.json(rows);
  } catch (e) {
    next(e);
  }
};

// Vincular producto a zona
export const createSeUbica = async (req, res, next) => {
  try {
    const created = await SeUbica.create(req.body);

    // ✅ Si quieres que regrese también el nombre del producto (para UI inmediata):
    const row = await SeUbica.findOne({
      where: {
        id_producto: created.id_producto,
        id_zona: created.id_zona,
        piso: created.piso,
      },
      include: [
        { model: Producto, as: "producto", attributes: ["id_producto", "codigo", "nombre_producto"] },
      ],
    });

    res.status(201).json(row || created);
  } catch (e) {
    next(e);
  }
};

// Desvincular (borra una ubicación)
// OJO: aquí asumo llave compuesta típica: id_producto + id_zona + piso.
// Ajusta si tu PK real es diferente.
export const deleteSeUbica = async (req, res, next) => {
  try {
    const { id_producto, id_zona, piso } = req.body;

    const row = await SeUbica.findOne({
      where: {
        id_producto: Number(id_producto),
        id_zona: Number(id_zona),
        piso: Number(piso),
      },
    });

    if (!row) return res.status(404).json({ error: "Vinculación no encontrada" });

    await row.destroy();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

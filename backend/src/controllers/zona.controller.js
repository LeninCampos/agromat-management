// backend/src/controllers/zona.controller.js
import { sequelize, Zona, SeUbica } from "../models/index.js";

// =======================
// GET: todas las zonas
// =======================
export const getAllZonas = async (req, res, next) => {
  try {
    const zonas = await Zona.findAll({
      order: [
        ["codigo", "ASC"],
        ["id_zona", "ASC"],
      ],
    });
    res.json(zonas);
  } catch (err) {
    next(err);
  }
};

// =======================
// GET: zona por ID
// =======================
export const getZonaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const zona = await Zona.findByPk(id);
    if (!zona) {
      return res.status(404).json({ error: "Zona no encontrada" });
    }

    res.json(zona);
  } catch (err) {
    next(err);
  }
};

// =======================
// POST: crear zona
// =======================
export const createZona = async (req, res, next) => {
  try {
    const { codigo, rack, modulo, piso, descripcion } = req.body;

    const nueva = await Zona.create({
      codigo,
      rack,
      modulo,
      piso,
      descripcion: descripcion || null,
    });

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
};

// =======================
// PUT: actualizar zona
// =======================
// OJO: no cambiamos id_zona, solo los demás campos
export const updateZona = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { codigo, rack, modulo, piso, descripcion } = req.body;

    const zona = await Zona.findByPk(id, { transaction: t });
    if (!zona) {
      await t.rollback();
      return res.status(404).json({ error: "Zona no encontrada" });
    }

    await zona.update(
      {
        codigo,
        rack,
        modulo,
        piso,
        descripcion: descripcion || null,
      },
      { transaction: t }
    );

    await t.commit();
    res.json(zona);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// =======================
// DELETE: eliminar zona
// =======================
// 1) Borramos las ubicaciones de seubica con esa id_zona
// 2) Luego borramos la zona
export const deleteZona = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const zona = await Zona.findByPk(id, { transaction: t });
    if (!zona) {
      await t.rollback();
      return res.status(404).json({ error: "Zona no encontrada" });
    }

    // Paso 1: borrar ubicaciones que apuntan a esa zona
    await SeUbica.destroy({
      where: { id_zona: id },
      transaction: t,
    });

    // Paso 2: borrar la zona
    await zona.destroy({ transaction: t });

    await t.commit();
    res.json({ ok: true });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

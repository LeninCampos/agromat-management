import { Suministro, Proveedor } from "../models/index.js";

export const getAllSuministros = async (req, res, next) => {
  try {
    const rows = await Suministro.findAll({
      include: [{ model: Proveedor, attributes: ["id_proveedor","nombre_proveedor"] }],
      order: [["id_suministro","DESC"]],
    });
    res.json(rows);
  } catch (e) { next(e); }
};

export const getSuministroById = async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id, {
      include: [{ model: Proveedor, attributes: ["id_proveedor","nombre_proveedor"] }],
    });
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    res.json(row);
  } catch (e) { next(e); }
};

export const createSuministro = async (req, res, next) => {
  try {
    const created = await Suministro.create(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const updateSuministro = async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    await row.update({ ...req.body });
    res.json(row);
  } catch (e) { next(e); }
};

export const deleteSuministro = async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
};
import { Zona } from "../models/index.js";

export const getAllZonas = async (req, res, next) => {
  try { res.json(await Zona.findAll({ order: [["nombre","ASC"],["numero","ASC"]] })); }
  catch (e) { next(e); }
};

export const findZona = async (req, res, next) => {
  try {
    const { nombre, numero } = req.query;
    const row = await Zona.findOne({ where: { nombre, numero } });
    if (!row) return res.status(404).json({ error: "Zona no encontrada" });
    res.json(row);
  } catch (e) { next(e); }
};

export const createZona = async (req, res, next) => {
  try {
    const { nombre, numero, descripcion } = req.body;
    const created = await Zona.create({ nombre, numero, descripcion });
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const updateZona = async (req, res, next) => {
  try {
    const { nombre, numero, descripcion } = req.body;
    const row = await Zona.findOne({ where: { nombre, numero } });
    if (!row) return res.status(404).json({ error: "Zona no encontrada" });
    await row.update({ ...(descripcion !== undefined && { descripcion }) });
    res.json(row);
  } catch (e) { next(e); }
};

export const deleteZona = async (req, res, next) => {
  try {
    const { nombre, numero } = req.body;
    const row = await Zona.findOne({ where: { nombre, numero } });
    if (!row) return res.status(404).json({ error: "Zona no encontrada" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
};
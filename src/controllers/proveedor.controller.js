import { Proveedor } from "../models/index.js";

export const getAllProveedores = async (req, res, next) => {
  try { res.json(await Proveedor.findAll({ order: [["id_proveedor","ASC"]] })); }
  catch (e) { next(e); }
};

export const getProveedorById = async (req, res, next) => {
  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    res.json(row);
  } catch (e) { next(e); }
};

export const createProveedor = async (req, res, next) => {
  try {
    const created = await Proveedor.create(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const updateProveedor = async (req, res, next) => {
  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    await row.update({ ...req.body });
    res.json(row);
  } catch (e) { next(e); }
};

export const deleteProveedor = async (req, res, next) => {
  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    await row.destroy();
    res.json({ ok: true, mensaje: "Proveedor eliminado" });
  } catch (e) { next(e); }
};
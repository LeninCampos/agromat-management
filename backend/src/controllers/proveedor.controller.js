// 👇 Asegúrate de agregar "Suministro" aquí
import { Proveedor, Suministro } from "../models/index.js";

export const getAllProveedores = async (req, res, next) => {
  try {
    const rows = await Proveedor.findAll({
      include: [{
        model: Suministro, // 👈 Aquí es donde fallaba porque no estaba importado
        attributes: ['id_suministro']
      }],
      order: [["id_proveedor", "ASC"]]
    });

    // Transformamos para enviar el contador simple al frontend
    const data = rows.map(p => {
      const json = p.toJSON();
      return {
        ...json,
        total_suministros: json.Suministros ? json.Suministros.length : 0
      };
    });

    res.json(data);
  } catch (e) { next(e); }
};

// ... (resto de funciones: getProveedorById, createProveedor, etc. se mantienen igual)
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
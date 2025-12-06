import { Empleado } from "../models/index.js";

export const getAllEmpleados = async (req, res, next) => {
  try { res.json(await Empleado.findAll({ order: [["id_empleado","ASC"]] })); }
  catch (e) { next(e); }
};

export const getEmpleadoById = async (req, res, next) => {
  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    res.json(row);
  } catch (e) { next(e); }
};

// POST con validación
export const createEmpleado = async (req, res, next) => {
  try {
    const data = { ...req.body };

    // ✅ 3.1: Asignar fecha_alta automática si no viene
    if (!data.fecha_alta) {
      data.fecha_alta = new Date();
    }

    const created = await Empleado.create(data);
    res.status(201).json(created);
  } catch (e) { 
    next(e); 
  }
};

// PUT con validación  
export const updateEmpleado = async (req, res, next) => {
  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    await row.update(req.body);
    res.json(row);
  } catch (e) { 
    next(e); 
  }
};

export const deleteEmpleado = async (req, res, next) => {
  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    await row.destroy();
    res.json({ ok: true, mensaje: "Empleado eliminado" });
  } catch (e) { next(e); }
};
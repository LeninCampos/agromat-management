import express from "express";
import { Empleado } from "../models/index.js";
import { validateEmpleadoCreate, validateEmpleadoUpdate } from "../middleware/validateEmpleado.js";


const router = express.Router();

router.get("/", async (req, res, next) => {
  try { res.json(await Empleado.findAll({ order: [["id_empleado","ASC"]] })); }
  catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    res.json(row);
  } catch (e) { next(e); }
});

// ✅ POST con validación
router.post("/", validateEmpleadoCreate, async (req, res, next) => {
  try {
    const created = await Empleado.create(req.body);
    res.status(201).json(created);
  } catch (e) { 
    next(e); 
  }
});

// ✅ PUT con validación  
router.put("/:id", validateEmpleadoUpdate, async (req, res, next) => {
  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    await row.update(req.body);
    res.json(row);
  } catch (e) { 
    next(e); 
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const row = await Empleado.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Empleado no encontrado" });
    await row.destroy();
    res.json({ ok: true, mensaje: "Empleado eliminado" });
  } catch (e) { next(e); }
});

export default router;

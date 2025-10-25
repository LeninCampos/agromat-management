import express from "express";
import { Proveedor } from "../models/index.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try { res.json(await Proveedor.findAll({ order: [["id_proveedor","ASC"]] })); }
  catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    res.json(row);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { nombre_proveedor, telefono, correo, direccion } = req.body;
    if (!nombre_proveedor || !telefono || !direccion) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }
    const created = await Proveedor.create({ nombre_proveedor, telefono, correo, direccion });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    await row.update({ ...req.body });
    res.json(row);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const row = await Proveedor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Proveedor no encontrado" });
    await row.destroy();
    res.json({ ok: true, mensaje: "Proveedor eliminado" });
  } catch (e) { next(e); }
});

export default router;

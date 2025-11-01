import express from "express";
import { Proveedor } from "../models/index.js";
import {validateProveedorCreate, validateProveedorUpdate} from "../middleware/validateProveedor.js";

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

router.post("/", validateProveedorCreate, async (req, res, next) => {
  try {
    const created = await Proveedor.create(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.put("/:id", validateProveedorUpdate, async (req, res, next) => {
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

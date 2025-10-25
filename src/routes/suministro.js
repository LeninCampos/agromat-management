import express from "express";
import { Suministro, Proveedor } from "../models/index.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const rows = await Suministro.findAll({
      include: [{ model: Proveedor, attributes: ["id_proveedor","nombre_proveedor"] }],
      order: [["id_suministro","DESC"]],
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id, {
      include: [{ model: Proveedor, attributes: ["id_proveedor","nombre_proveedor"] }],
    });
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    res.json(row);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { fecha_llegada, hora_llegada, id_proveedor } = req.body;
    if (!fecha_llegada || !hora_llegada || !id_proveedor) {
      return res.status(400).json({ error: "Faltan campos" });
    }
    const created = await Suministro.create({ fecha_llegada, hora_llegada, id_proveedor });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    await row.update({ ...req.body });
    res.json(row);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;

import express from "express";
import { Zona } from "../models/index.js";
import { Op } from "sequelize";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try { res.json(await Zona.findAll({ order: [["nombre","ASC"],["numero","ASC"]] })); }
  catch (e) { next(e); }
});

router.get("/buscar", async (req, res, next) => {
  try {
    const { nombre, numero } = req.query;
    const row = await Zona.findOne({ where: { nombre, numero } });
    if (!row) return res.status(404).json({ error: "Zona no encontrada" });
    res.json(row);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { nombre, numero, descripcion } = req.body;
    if (!nombre || numero == null) return res.status(400).json({ error: "Faltan nombre/numero" });
    const created = await Zona.create({ nombre, numero, descripcion });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.put("/", async (req, res, next) => {
  try {
    const { nombre, numero, descripcion } = req.body;
    if (!nombre || numero == null) return res.status(400).json({ error: "Faltan PK" });
    const row = await Zona.findOne({ where: { nombre, numero } });
    if (!row) return res.status(404).json({ error: "Zona no encontrada" });
    await row.update({ ...(descripcion !== undefined && { descripcion }) });
    res.json(row);
  } catch (e) { next(e); }
});

router.delete("/", async (req, res, next) => {
  try {
    const { nombre, numero } = req.body;
    const row = await Zona.findOne({ where: { nombre, numero } });
    if (!row) return res.status(404).json({ error: "Zona no encontrada" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;

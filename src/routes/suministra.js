import express from "express";
import { Suministra, Suministro, Producto } from "../models/index.js";
import {
  validateSuministraCreate,
  validateSuministraUpdate,
  validateSuministraDelete
} from "../middleware/validateDetalles.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { id_suministro } = req.query;
    const where = id_suministro ? { id_suministro } : {};
    const rows = await Suministra.findAll({
      where,
      include: [
        { model: Suministro, attributes: ["id_suministro", "fecha_llegada", "hora_llegada"] },
        { model: Producto, attributes: ["id_producto", "nombre_producto"] }
      ],
      order: [["id_suministro", "DESC"], ["id_producto", "ASC"]],
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/", validateSuministraCreate, async (req, res, next) => {
  try {
    // 3. Validación manual eliminada
    const created = await Suministra.create(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.put("/", validateSuministraUpdate, async (req, res, next) => {
  try {
    const { id_suministro, id_producto, cantidad } = req.body;
    const row = await Suministra.findOne({ where: { id_suministro, id_producto } });
    if (!row) return res.status(404).json({ error: "Registro no encontrado" });

    await row.update({ ...(cantidad !== undefined && { cantidad }) });
    res.json(row);
  } catch (e) { next(e); }
});

router.delete("/", validateSuministraDelete, async (req, res, next) => {
  try {
    const { id_suministro, id_producto } = req.body;
    const row = await Suministra.findOne({ where: { id_suministro, id_producto } });
    if (!row) return res.status(404).json({ error: "Registro no encontrado" });
    
    await row.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;

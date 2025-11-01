import express from "express";
import { SeUbica, Producto, Zona } from "../models/index.js";
import { validateSeUbica } from "../middleware/validateDetalles.js";

const router = express.Router();

// Lista por producto (opcional: ?id_producto=)
router.get("/", async (req, res, next) => {
  try {
    const { id_producto } = req.query;
    const where = id_producto ? { id_producto } : {};
    const rows = await SeUbica.findAll({
      where,
      include: [
        { model: Producto, attributes: ["id_producto","nombre_producto"] },
        // Asociación parcial a Zona por 'nombre' (ver modelos)
      ],
      order: [["id_producto","ASC"],["nombre","ASC"],["numero","ASC"]],
    });
    res.json(rows);
  } catch (e) { next(e); }
});

// Vincular producto a zona
router.post("/", validateSeUbica, async (req, res, next) => {
  try {
    const { id_producto, nombre, numero } = req.body;
    const created = await SeUbica.create({ id_producto, nombre, numero });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.delete("/", validateSeUbica, async (req, res, next) => {
  try {
    const { id_producto, nombre, numero } = req.body;
    const row = await SeUbica.findOne({ where: { id_producto, nombre, numero } });
    if (!row) return res.status(404).json({ error: "Vinculación no encontrada" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;

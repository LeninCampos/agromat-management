import express from "express";
import { Cliente } from "../models/index.js";
import { validateClienteCreate, validateClienteUpdate } from "../middleware/validateCliente.js";


const router = express.Router();

// GET /api/clientes
router.get("/", async (req, res, next) => {
  try {
    const rows = await Cliente.findAll({ order: [["id_cliente", "ASC"]] });
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/clientes/:id
router.get("/:id", async (req, res, next) => {
  try {
    const row = await Cliente.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/clientes
router.post("/", validateClienteCreate, async (req, res, next) => {
  try {
    const nuevo = await Cliente.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/clientes/:id
router.put("/:id", validateClienteUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    await cliente.update(req.body);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clientes/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const row = await Cliente.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Cliente no encontrado" });
    await row.destroy();
    res.json({ ok: true, mensaje: "Cliente eliminado" });
  } catch (err) { next(err); }
});

export default router;

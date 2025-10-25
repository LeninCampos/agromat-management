// src/routes/productos.js
import express from "express";
import { Producto, Proveedor } from "../models/index.js";
import { ValidateProducto } from "../middleware/validateProducto.js";

const router = express.Router();

/**
 * GET /api/productos
 * Lista todos los productos (incluye proveedor opcionalmente)
 */
router.get("/", async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] }],
      order: [["id_producto", "ASC"]],
    });
    res.json(productos);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/productos/:id
 * Obtiene un producto por ID
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id, {
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] }
      ],
    });
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/productos
 * Crea un producto nuevo
 * Body esperado: { nombre_producto, descripcion?, id_proveedor, precio, stock }
 */
router.post("/", ValidateProducto, async (req, res, next) => {
  try {
    const nuevo = await Producto.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/productos/:id
 * Actualiza un producto
 */
router.put("/:id", ValidateProducto, async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });

    await producto.update(req.body);
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/productos/:id
 * Elimina un producto (ojo con FKs si está en pedidos/envíos)
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });

    await producto.destroy();
    res.json({ ok: true, mensaje: "Producto eliminado" });
  } catch (err) {
    next(err);
  }
});

export default router;

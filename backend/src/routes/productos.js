import express from "express";
import { validateProductoCreate, validateProductoUpdate } from "../middleware/validateProducto.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto
} from "../controllers/producto.controller.js";

const router = express.Router();

router.get("/", getAllProductos);
router.get("/:id", getProductoById);

router.post("/", verificarAuth, validateProductoCreate, createProducto);
router.put("/:id", verificarAuth, validateProductoUpdate, updateProducto);
router.delete("/:id", verificarAuth, deleteProducto);

export default router;
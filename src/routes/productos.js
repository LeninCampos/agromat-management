import express from "express";
import { validateProductoCreate, validateProductoUpdate } from "../middleware/validateProducto.js";
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
router.post("/", validateProductoCreate, createProducto);
router.put("/:id", validateProductoUpdate, updateProducto);
router.delete("/:id", deleteProducto);

export default router;
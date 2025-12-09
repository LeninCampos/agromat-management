// backend/src/routes/producto.js
import express from "express";
import {
  validateProductoCreate,
  validateProductoUpdate,
} from "../middleware/validateProducto.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  bulkDeleteProductos,
  getMovimientosProducto,
  recalcularStock,
  exportarProductosExcel,
} from "../controllers/producto.controller.js";

const router = express.Router();

router.get("/", getAllProductos);
router.get("/exportar-excel", verificarAuth, exportarProductosExcel);
router.get("/:id/movimientos", getMovimientosProducto);
router.get("/:id", getProductoById);

router.post("/", verificarAuth, validateProductoCreate, createProducto);
router.post("/recalcular-stock", verificarAuth, recalcularStock);

router.put("/:id", verificarAuth, validateProductoUpdate, updateProducto);
router.delete("/:id", verificarAuth, deleteProducto);

// Borrado masivo
router.delete("/", verificarAuth, bulkDeleteProductos);

export default router;
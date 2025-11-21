import express from "express";
import { validateProveedorCreate, validateProveedorUpdate } from "../middleware/validateProveedor.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor
} from "../controllers/proveedor.controller.js";

const router = express.Router();

router.get("/", getAllProveedores);
router.get("/:id", getProveedorById);
router.post("/", verificarAuth, validateProveedorCreate, createProveedor);
router.put("/:id", verificarAuth, validateProveedorUpdate, updateProveedor);
router.delete("/:id", verificarAuth, deleteProveedor);

export default router;
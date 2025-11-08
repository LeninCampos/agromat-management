import express from "express";
import { validateProveedorCreate, validateProveedorUpdate } from "../middleware/validateProveedor.js";
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
router.post("/", validateProveedorCreate, createProveedor);
router.put("/:id", validateProveedorUpdate, updateProveedor);
router.delete("/:id", deleteProveedor);

export default router;
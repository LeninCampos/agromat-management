import express from "express";
import { validateEnvioCreate, validateEnvioUpdate } from "../middleware/validateEnvio.js";
import { validateEnvioDetalleCreate } from "../middleware/validateDetalles.js";
import {
  getAllEnvios,
  getEnvioById,
  createEnvio,
  addEnvioDetalle,
  updateEnvio
} from "../controllers/envio.controller.js";

const router = express.Router();

router.get("/", getAllEnvios);
router.get("/:id", getEnvioById);
router.post("/", validateEnvioCreate, createEnvio);
router.put("/:id", validateEnvioUpdate, updateEnvio);

router.post("/:id/detalles", validateEnvioDetalleCreate, addEnvioDetalle);

export default router;
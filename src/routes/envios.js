import express from "express";
import { validateEnvioCreate, validateEnvioUpdate } from "../middleware/validateEnvio.js";
import { validateEnvioDetalleCreate } from "../middleware/validateDetalles.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
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
router.post("/", verificarAuth,validateEnvioCreate, createEnvio);
router.put("/:id", verificarAuth, validateEnvioUpdate, updateEnvio);

router.post("/:id/detalles", verificarAuth, validateEnvioDetalleCreate, addEnvioDetalle);

export default router;
import express from "express";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  validateEnvioDetalleCreate,
  validateEnvioDetalleUpdate,
  validateEnvioDetalleDelete
} from "../middleware/validateDetalles.js";
import {
  getAllEnvioDetalles,
  createEnvioDetalle,
  updateEnvioDetalle,
  deleteEnvioDetalle
} from "../controllers/envioDetalle.controller.js";

const router = express.Router();

router.get("/", getAllEnvioDetalles);
router.post("/", verificarAuth, validateEnvioDetalleCreate, createEnvioDetalle);
router.put("/", verificarAuth, validateEnvioDetalleUpdate, updateEnvioDetalle);
router.delete("/", verificarAuth, validateEnvioDetalleDelete, deleteEnvioDetalle);

export default router;
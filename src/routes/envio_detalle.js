import express from "express";
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
router.post("/", validateEnvioDetalleCreate, createEnvioDetalle);
router.put("/", validateEnvioDetalleUpdate, updateEnvioDetalle);
router.delete("/", validateEnvioDetalleDelete, deleteEnvioDetalle);

export default router;
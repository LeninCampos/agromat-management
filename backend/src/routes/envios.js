import express from "express";
import { validateEnvioCreate, validateEnvioUpdate } from "../middleware/validateEnvio.js";
import { validateEnvioDetalleCreate } from "../middleware/validateDetalles.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import { upload } from "../middleware/upload.js";
import {
  getAllEnvios,
  getEnvioById,
  createEnvio,
  addEnvioDetalle,
  updateEnvio,
  uploadFotoEnvio
} from "../controllers/envio.controller.js";

const router = express.Router();

router.get("/", getAllEnvios);
router.get("/:id", getEnvioById);
router.post("/", verificarAuth, validateEnvioCreate, createEnvio);
router.put("/:id", verificarAuth, validateEnvioUpdate, updateEnvio);

router.post("/:id/detalles", verificarAuth, validateEnvioDetalleCreate, addEnvioDetalle);
router.post("/:id/foto", verificarAuth, upload.single('imagen'), uploadFotoEnvio);

export default router;
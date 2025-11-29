// backend/src/routes/envios.js
import { Router } from "express";
import {
  getAllEnvios,
  getEnvioById,
  createEnvio,
  updateEnvio,
  deleteEnvio,
  uploadFotoEnvio,
} from "../controllers/envio.controller.js";

const router = Router();

// Listar
router.get("/", getAllEnvios);

// Obtener uno
router.get("/:id", getEnvioById);

// Crear
router.post("/", createEnvio);

// Actualizar
router.put("/:id", updateEnvio);

// Eliminar
router.delete("/:id", deleteEnvio);

// Subir foto (opcional, si más adelante quieres usarlo)
// import upload from "../middleware/upload.js";
// router.post("/:id/foto", upload.single("imagen"), uploadFotoEnvio);

export default router;

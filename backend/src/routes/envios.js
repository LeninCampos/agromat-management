// backend/src/routes/envios.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getAllEnvios,
  getEnvioById,
  createEnvio,
  updateEnvio,
  deleteEnvio,
  uploadFotosEnvio,
  getFotosEnvio,
  deleteFotoEnvio,
} from "../controllers/envio.controller.js";

const router = Router();

// =====================================================
// Configuración de Multer para subir fotos
// =====================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "public", "uploads", "envios");
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `envio-${req.params.id}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido. Solo imágenes JPG, PNG, GIF, WEBP."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo por archivo
    files: 10, // Máximo 10 archivos a la vez
  },
});

// =====================================================
// Rutas CRUD básicas
// =====================================================

// Listar todos los envíos
router.get("/", getAllEnvios);

// Obtener un envío por ID
router.get("/:id", getEnvioById);

// Crear nuevo envío
router.post("/", createEnvio);

// Actualizar envío
router.put("/:id", updateEnvio);

// Eliminar envío
router.delete("/:id", deleteEnvio);

// =====================================================
// ✅ NUEVO: Rutas para fotos múltiples
// =====================================================

// Obtener todas las fotos de un envío
router.get("/:id/fotos", getFotosEnvio);

// Subir múltiples fotos a un envío
router.post("/:id/fotos", upload.array("fotos", 10), uploadFotosEnvio);

// Eliminar una foto específica
router.delete("/:id/fotos/:fotoId", deleteFotoEnvio);

export default router;
// backend/src/middleware/upload.js
import multer from "multer";
import fs from "fs";
import path from "path"; // 1. Importamos 'path' para manejar extensiones seguramente

/* =========================================================
   🛡️ FUNCIONES DE SEGURIDAD
   ========================================================= */

// Generador de nombres aleatorios (Evita colisiones y nombres maliciosos)
const generarNombreSeguro = (file) => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  // Extraemos la extensión original de forma segura y la pasamos a minúsculas
  const ext = path.extname(file.originalname).toLowerCase();
  return `file-${uniqueSuffix}${ext}`;
};

/* =========================================================
   📂 STORAGE: ENVÍOS (Excel)
   ========================================================= */
const storageEnvios = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/envios";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, generarNombreSeguro(file)); // Usamos la función segura
  },
});

const fileFilterExcel = (req, file, cb) => {
  // Verificamos MimeType Y extensión
  const mimetypesExcel = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  
  // Seguridad extra: validamos que la extensión real sea .xlsx
  const ext = path.extname(file.originalname).toLowerCase();

  if (mimetypesExcel.includes(file.mimetype) && ext === ".xlsx") {
    cb(null, true);
  } else {
    cb(new Error("⚠️ Archivo no permitido. Solo se aceptan Excel (.xlsx)"), false);
  }
};

export const uploadExcel = multer({
  storage: storageEnvios,
  fileFilter: fileFilterExcel,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB para Excels grandes
});

/* =========================================================
   📂 STORAGE: PRODUCTOS (Imágenes)
   ========================================================= */
const storageProductos = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/productos";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, generarNombreSeguro(file));
  },
});

const fileFilterImagen = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("⚠️ Formato no válido. Solo .jpg, .png o .webp"), false);
  }
};

// Middleware específico para productos
export const uploadProducto = multer({
  storage: storageProductos,
  fileFilter: fileFilterImagen,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/* =========================================================
   🛠️ UTILS EXTRAS
   ========================================================= */
// Si necesitas un upload genérico (cuidado con dónde lo usas)
export const upload = multer({
  storage: storageEnvios, // Ojo: está guardando en envíos
  fileFilter: fileFilterImagen, // Pero filtrando imágenes (?)
  limits: { fileSize: 5 * 1024 * 1024 },
});
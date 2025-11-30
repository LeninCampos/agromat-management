// backend/src/middleware/upload.js
import multer from "multer";
import fs from "fs";

/* === Storage ENVÍOS (lo que ya tenías) === */
const storageEnvios = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/envios";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + "-" + file.originalname;
    cb(null, nombreUnico);
  },
});

const fileFilterExcel = (req, file, cb) => {
  if (file.mimetype.includes("spreadsheet") || file.mimetype.includes("excel") || file.originalname.endsWith(".xlsx")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos Excel (.xlsx)"), false);
  }
};

export const uploadExcel = multer({
  storage: storageEnvios, 
  fileFilter: fileFilterExcel,
});

/* === Storage PRODUCTOS (nuevo) === */
const storageProductos = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/productos";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + "-" + file.originalname;
    cb(null, nombreUnico);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Formato de imagen no válido (solo .jpg o .png)"), false);
  }
};

// para envíos
export const upload = multer({
  storage: storageEnvios,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 },
});

// para productos
export const uploadProducto = multer({
  storage: storageProductos,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 },
});

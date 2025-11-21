import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 1. Dónde guardar los archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/envios';
    
    // Asegurarse de que el directorio exista
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // 2. Renombrar el archivo para evitar colisiones
    // Será: 1678886512345-mi-imagen.png
    const nombreUnico = Date.now() + '-' + file.originalname;
    cb(null, nombreUnico);
  }
});

// 3. Filtrar para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true); // Aceptar el archivo
  } else {
    cb(new Error('Formato de imagen no válido (solo .jpg o .png)'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // Límite de 5MB
});
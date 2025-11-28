// backend/src/routes/upload.js
import express from "express";
import { verificarAuth } from "../middleware/verificarAuth.js";
import { uploadProducto } from "../middleware/upload.js";

const router = express.Router();

// Ruta de prueba: http://localhost:4000/api/upload/ping
router.get("/ping", (req, res) => {
  res.json({ ok: true, msg: "upload router vivo" });
});

// POST /api/upload/productos
// Campo de archivo: "imagen"
router.post("/productos", verificarAuth, (req, res, next) => {
  const middleware = uploadProducto.single("imagen");

  middleware(req, res, function (err) {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({ error: "No se recibió archivo" });
    }

    const url = `/uploads/productos/${req.file.filename}`;
    return res.status(201).json({ url });
  });
});

export default router;

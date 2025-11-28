// backend/src/routes/zonas.js
import express from "express";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllZonas,
  getZonaById,
  createZona,
  updateZona,
  deleteZona,
} from "../controllers/zona.controller.js";

const router = express.Router();

// GET /api/zonas
router.get("/", getAllZonas);

// GET /api/zonas/:id
router.get("/:id", getZonaById);

// POST /api/zonas
router.post("/", verificarAuth, createZona);

// PUT /api/zonas/:id
router.put("/:id", verificarAuth, updateZona);

// DELETE /api/zonas/:id
router.delete("/:id", verificarAuth, deleteZona);

export default router;

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

router.get("/", getAllZonas);
router.get("/:id", getZonaById);
router.post("/", verificarAuth, createZona);
router.put("/:id", verificarAuth, updateZona);
router.delete("/:id", verificarAuth, deleteZona);

export default router;

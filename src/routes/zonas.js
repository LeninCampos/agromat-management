import express from "express";
import { validateZonaCreate, validateZonaUpdate, validateZonaDelete } from "../middleware/validateZona.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllZonas,
  findZona,
  createZona,
  updateZona,
  deleteZona
} from "../controllers/zona.controller.js";

const router = express.Router();

router.get("/", getAllZonas);
router.get("/buscar", findZona);
router.post("/", verificarAuth, validateZonaCreate, createZona);
router.put("/", verificarAuth, validateZonaUpdate, updateZona);
router.delete("/", verificarAuth, validateZonaDelete, deleteZona);

export default router;
import express from "express";
import { validateZonaCreate, validateZonaUpdate, validateZonaDelete } from "../middleware/validateZona.js";
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
router.post("/", validateZonaCreate, createZona);
router.put("/", validateZonaUpdate, updateZona);
router.delete("/", validateZonaDelete, deleteZona);

export default router;
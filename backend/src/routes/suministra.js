import express from "express";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  validateSuministraCreate,
  validateSuministraUpdate,
  validateSuministraDelete
} from "../middleware/validateDetalles.js";
import {
  getAllSuministra,
  createSuministra,
  updateSuministra,
  deleteSuministra
} from "../controllers/suministra.controller.js";

const router = express.Router();

router.get("/", getAllSuministra);
router.post("/", verificarAuth, validateSuministraCreate, createSuministra);
router.put("/", verificarAuth, validateSuministraUpdate, updateSuministra);
router.delete("/", verificarAuth, validateSuministraDelete, deleteSuministra);

export default router;
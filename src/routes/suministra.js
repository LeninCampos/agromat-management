import express from "express";
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
router.post("/", validateSuministraCreate, createSuministra);
router.put("/", validateSuministraUpdate, updateSuministra);
router.delete("/", validateSuministraDelete, deleteSuministra);

export default router;
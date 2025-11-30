import express from "express";
import { validateSuministroCreate, validateSuministroUpdate } from "../middleware/validateSuministro.js";
import { uploadExcel } from "../middleware/upload.js";
import { importarSuministroExcel } from "../controllers/import.controller.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllSuministros,
  getSuministroById,
  createSuministro,
  updateSuministro,
  deleteSuministro
} from "../controllers/suministro.controller.js";

const router = express.Router();

router.get("/", getAllSuministros);
router.get("/:id", getSuministroById);
router.post("/", verificarAuth, validateSuministroCreate, createSuministro);
router.post("/importar", verificarAuth, uploadExcel.single("archivo"), importarSuministroExcel);
router.put("/:id", verificarAuth, validateSuministroUpdate, updateSuministro);
router.delete("/:id", deleteSuministro);

export default router;
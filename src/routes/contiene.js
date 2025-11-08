import express from "express";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  validateContieneUpdate,
  validateContieneDelete
} from "../middleware/validateDetalles.js";
import {
  getAllContiene,
  updateContiene,
  deleteContiene
} from "../controllers/contiene.controller.js";


const router = express.Router();

router.get("/", getAllContiene);
router.put("/", verificarAuth, validateContieneUpdate, updateContiene);
router.delete("/", verificarAuth, validateContieneDelete, deleteContiene);

export default router;
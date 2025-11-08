import express from "express";
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
router.put("/", validateContieneUpdate, updateContiene);
router.delete("/", validateContieneDelete, deleteContiene);

export default router;
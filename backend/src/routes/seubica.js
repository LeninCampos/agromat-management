import express from "express";
import { validateSeUbica } from "../middleware/validateDetalles.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllSeUbica,
  createSeUbica,
  deleteSeUbica
} from "../controllers/seubica.controller.js";

const router = express.Router();

router.get("/", getAllSeUbica);
router.post("/", verificarAuth, validateSeUbica, createSeUbica);
router.delete("/", verificarAuth, validateSeUbica, deleteSeUbica);

export default router;
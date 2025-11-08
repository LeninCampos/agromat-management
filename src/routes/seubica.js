import express from "express";
import { validateSeUbica } from "../middleware/validateDetalles.js";
import {
  getAllSeUbica,
  createSeUbica,
  deleteSeUbica
} from "../controllers/seubica.controller.js";

const router = express.Router();

router.get("/", getAllSeUbica);
router.post("/", validateSeUbica, createSeUbica);
router.delete("/", validateSeUbica, deleteSeUbica);

export default router;
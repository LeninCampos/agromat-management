import express from "express";
import { validateEmpleadoCreate, validateEmpleadoUpdate } from "../middleware/validateEmpleado.js";
import {
  getAllEmpleados,
  getEmpleadoById,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado
} from "../controllers/empleado.controller.js";

const router = express.Router();

router.get("/", getAllEmpleados);
router.get("/:id", getEmpleadoById);
router.post("/", validateEmpleadoCreate, createEmpleado);
router.put("/:id", validateEmpleadoUpdate, updateEmpleado);
router.delete("/:id", deleteEmpleado);

export default router;
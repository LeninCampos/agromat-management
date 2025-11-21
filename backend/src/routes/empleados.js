import express from "express";
import { validateEmpleadoCreate, validateEmpleadoUpdate } from "../middleware/validateEmpleado.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import { esAdmin } from "../middleware/esAdmin.js"; 
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
router.post("/", verificarAuth, esAdmin, validateEmpleadoCreate, createEmpleado);
router.put("/:id", verificarAuth, validateEmpleadoUpdate, updateEmpleado);
router.delete("/:id", verificarAuth, deleteEmpleado);

export default router;
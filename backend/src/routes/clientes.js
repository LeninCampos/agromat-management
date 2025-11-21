import express from "express";
import { validateClienteCreate, validateClienteUpdate } from "../middleware/validateCliente.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente
} from "../controllers/cliente.controller.js";

const router = express.Router();

router.get("/", getAllClientes);
router.get("/:id", getClienteById);
router.post("/", verificarAuth, validateClienteCreate, createCliente);
router.put("/:id", verificarAuth,validateClienteUpdate, updateCliente);
router.delete("/:id", verificarAuth, deleteCliente);

export default router;
import express from "express";
import { validateClienteCreate, validateClienteUpdate } from "../middleware/validateCliente.js";
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
router.post("/", validateClienteCreate, createCliente);
router.put("/:id", validateClienteUpdate, updateCliente);
router.delete("/:id", deleteCliente);

export default router;
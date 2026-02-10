import express from "express";
import { validateClienteCreate, validateClienteUpdate } from "../middleware/validateCliente.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import { esAdmin } from "../middleware/esAdmin.js";
import { uploadExcel } from "../middleware/upload.js";
import {
  getAllClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  importarClientesExcel
} from "../controllers/cliente.controller.js";

const router = express.Router();

router.get("/", getAllClientes);
router.get("/:id", getClienteById);
router.post("/", verificarAuth, validateClienteCreate, createCliente);
router.post("/importar", verificarAuth, esAdmin, uploadExcel.single("archivo"), importarClientesExcel);
router.put("/:id", verificarAuth, validateClienteUpdate, updateCliente);
router.delete("/:id", verificarAuth, deleteCliente);

export default router;

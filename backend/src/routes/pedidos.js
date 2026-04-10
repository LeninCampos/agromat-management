// backend/src/routes/pedidos.js
import { Router } from "express";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllPedidos,
  getPedidoById,
  createPedido,
  updatePedido,
  deletePedido,
} from "../controllers/pedido.controller.js";

const router = Router();

// Obtener todos
router.get("/", getAllPedidos);

// Obtener uno
router.get("/:id", getPedidoById);

// Crear
router.post("/", verificarAuth, createPedido);

// Actualizar
router.put("/:id", verificarAuth, updatePedido);

// Eliminar
router.delete("/:id", verificarAuth, deletePedido);

export default router;

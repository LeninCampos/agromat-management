// backend/src/routes/pedidos.js
import { Router } from "express";
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
router.post("/", createPedido);

// Actualizar
router.put("/:id", updatePedido);

// Eliminar
router.delete("/:id", deletePedido);

export default router;

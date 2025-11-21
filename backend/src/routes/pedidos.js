import express from "express";
import { validatePedidoCreate, validatePedidoUpdate, validatePedidoItems } from "../middleware/validatePedido.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import {
  getAllPedidos,
  getPedidoById,
  createPedido,
  addPedidoItem,
  deletePedidoItem,
  updatePedido,
  deletePedido
} from "../controllers/pedido.controller.js";

const router = express.Router();

router.get("/", getAllPedidos);
router.get("/:id", getPedidoById);
router.post("/", verificarAuth, validatePedidoCreate, createPedido);
router.put("/:id", verificarAuth, validatePedidoUpdate, updatePedido);
router.delete("/:id", verificarAuth, deletePedido);

router.post("/:id/items", validatePedidoItems, addPedidoItem);
router.delete("/:id/items/:id_producto", deletePedidoItem);

export default router;
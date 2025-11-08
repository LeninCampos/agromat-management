import express from "express";
import { validatePedidoCreate, validatePedidoUpdate, validatePedidoItems } from "../middleware/validatePedido.js";
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
router.post("/", validatePedidoCreate, createPedido);
router.put("/:id", validatePedidoUpdate, updatePedido);
router.delete("/:id", deletePedido);

router.post("/:id/items", validatePedidoItems, addPedidoItem);
router.delete("/:id/items/:id_producto", deletePedidoItem);

export default router;
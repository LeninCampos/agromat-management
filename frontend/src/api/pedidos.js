import api from "./axios";

// GET pedidos
export const getPedidos = () => api.get("/pedidos");

// POST crear pedido
export const createPedido = (data) => api.post("/pedidos", data);

// PUT actualizar pedido
export const updatePedido = (id, data) => api.put(`/pedidos/${id}`, data);

// DELETE pedido
export const deletePedido = (id) => api.delete(`/pedidos/${id}`);

// Items del pedido
export const addPedidoItem = (id_pedido, data) =>
  api.post(`/pedidos/${id_pedido}/items`, data);

export const deletePedidoItem = (id_pedido, id_producto) =>
  api.delete(`/pedidos/${id_pedido}/items/${id_producto}`);
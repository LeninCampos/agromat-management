import axios from "axios";

const API_URL = "https://agromatgranjas.com/api/pedidos";

// obtener token del localStorage
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET pedidos (NO lleva token)
export const getPedidos = () => axios.get(API_URL);

// POST crear pedido (SÍ lleva token)
export const createPedido = (data) =>
  axios.post(API_URL, data, {
    headers: getAuthHeaders(),
  });

// PUT actualizar pedido
export const updatePedido = (id, data) =>
  axios.put(`${API_URL}/${id}`, data, {
    headers: getAuthHeaders(),
  });

// DELETE pedido
export const deletePedido = (id) =>
  axios.delete(`${API_URL}/${id}`, {
    headers: getAuthHeaders(),
  });

// Items del pedido
export const addPedidoItem = (id_pedido, data) =>
  axios.post(`${API_URL}/${id_pedido}/items`, data, {
    headers: getAuthHeaders(),
  });

export const deletePedidoItem = (id_pedido, id_producto) =>
  axios.delete(`${API_URL}/${id_pedido}/items/${id_producto}`, {
    headers: getAuthHeaders(),
  });

import axios from "axios";

const API_URL = "https://agromatgranjas.com/api/productos";

// 🧩 obtener token desde localStorage (o el contexto de login)
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET productos
export const getProductos = () => axios.get(API_URL);

// POST crear producto
export const createProducto = (data) =>
  axios.post(API_URL, data, { headers: getAuthHeaders() });

// PUT actualizar producto
export const updateProducto = (id, data) =>
  axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });

// DELETE eliminar producto (uno)
export const deleteProducto = (id) =>
  axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });

// DELETE eliminar productos múltiples
// Body: { ids: [...] }
export const bulkDeleteProductos = (ids) =>
  axios.delete(API_URL, {
    headers: getAuthHeaders(),
    data: { ids },
  });

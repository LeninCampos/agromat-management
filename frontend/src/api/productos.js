import api from "./axios";

// GET productos
export const getProductos = () => api.get("/productos");

// POST crear producto
export const createProducto = (data) => api.post("/productos", data);

// PUT actualizar producto
export const updateProducto = (id, data) => api.put(`/productos/${id}`, data);

// DELETE eliminar producto (uno)
export const deleteProducto = (id) => api.delete(`/productos/${id}`);

// DELETE eliminar productos múltiples
export const bulkDeleteProductos = (ids) =>
  api.delete("/productos", {
    data: { ids },
  });
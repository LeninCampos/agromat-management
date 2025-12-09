// frontend/src/api/productos.js
import api from "./axios";

// GET productos
export const getProductos = () => api.get("/productos");

// GET movimientos / historial de un producto específico
export const getMovimientosProducto = (id_producto) =>
  api.get(`/productos/${id_producto}/movimientos`);

// POST crear producto
export const createProducto = (data) => api.post("/productos", data);

// PUT actualizar producto
export const updateProducto = (id, data) => api.put(`/productos/${id}`, data);

// DELETE eliminar producto (uno)
export const deleteProducto = (id) => api.delete(`/productos/${id}`);

export const descargarInventarioExcel = () =>
  api.get("/productos/exportar-excel", {
    responseType: "blob",
  });

// DELETE eliminar productos múltiples
export const bulkDeleteProductos = (ids) =>
  api.delete("/productos", {
    data: { ids },
  });

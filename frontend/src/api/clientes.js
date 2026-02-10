//src/api/clientes.js
import api from "./axios";

export const getClientes = () => api.get("/clientes");

export const createCliente = (data) => api.post("/clientes", data);

export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data);

export const deleteCliente = (id) => api.delete(`/clientes/${id}`);

export const importarClientesExcel = (file) => {
  const formData = new FormData();
  formData.append("archivo", file);
  return api.post("/clientes/importar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

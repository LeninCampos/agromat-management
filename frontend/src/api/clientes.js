import api from "./axios";

export const getClientes = () => api.get("/clientes");

export const createCliente = (data) => api.post("/clientes", data);

export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data);

export const deleteCliente = (id) => api.delete(`/clientes/${id}`);
import api from "./axios";

export const getEnvios = () => api.get("/envios");

export const createEnvio = (data) => api.post("/envios", data);

export const updateEnvio = (id, data) => api.put(`/envios/${id}`, data);

export const deleteEnvio = (id) => api.delete(`/envios/${id}`);
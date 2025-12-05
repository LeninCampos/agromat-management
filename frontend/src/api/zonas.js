import api from "./axios";

export const getZonas = () => api.get("/zonas");

export const createZona = (data) => api.post("/zonas", data);

export const updateZona = (id, data) => api.put(`/zonas/${id}`, data);

export const deleteZona = (id) => api.delete(`/zonas/${id}`);
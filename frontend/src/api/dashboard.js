import api from "./axios";

export const getEnvios = () => api.get("/dashboard");
export const createEnvio = (d) => api.post("/dashboard", d);
export const updateEnvio = (id, d) => api.put(`/dashboard/${id}`, d);
export const deleteEnvio = (id) => api.delete(`/dashboard/${id}`);
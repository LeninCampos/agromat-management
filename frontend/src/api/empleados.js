import api from "./axios";

export const getEmpleados = () => api.get("/empleados");

export const createEmpleado = (data) => api.post("/empleados", data);

export const updateEmpleado = (id, data) => api.put(`/empleados/${id}`, data);

export const deleteEmpleado = (id) => api.delete(`/empleados/${id}`);
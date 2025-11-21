// src/api/empleados.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/empleados";

export const getEmpleados = () => axios.get(API_URL);
export const createEmpleado = (data) => axios.post(API_URL, data);
export const updateEmpleado = (id, data) => axios.put(`${API_URL}/${id}`, data);
export const deleteEmpleado = (id) => axios.delete(`${API_URL}/${id}`);

// src/api/empleados.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/empleados";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getEmpleados = () => axios.get(API_URL, { headers: getAuthHeaders() });

export const createEmpleado = (data) => 
  axios.post(API_URL, data, { headers: getAuthHeaders() });

export const updateEmpleado = (id, data) => 
  axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });

export const deleteEmpleado = (id) => 
  axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
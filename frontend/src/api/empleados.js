import axios from "axios";

const API_URL = "http://localhost:4000/api/empleados";

// 👇 1. Función para obtener el token
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 👇 2. Agregar { headers: getAuthHeaders() } a todas las peticiones que modifican datos
export const getEmpleados = () => 
  axios.get(API_URL);

export const createEmpleado = (data) => 
  axios.post(API_URL, data, { headers: getAuthHeaders() });

export const updateEmpleado = (id, data) => 
  axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });

export const deleteEmpleado = (id) => 
  axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
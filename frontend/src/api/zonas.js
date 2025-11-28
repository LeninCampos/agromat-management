// frontend/src/api/zonas.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/zonas";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET todas las zonas
export const getZonas = () => axios.get(API_URL);

// Crear zona
export const createZona = (data) =>
  axios.post(API_URL, data, {
    headers: getAuthHeaders(),
  });

// Editar zona — ahora usa id_zona real
export const updateZona = (id_zona, data) =>
  axios.put(`${API_URL}/${id_zona}`, data, {
    headers: getAuthHeaders(),
  });

// Eliminar zona
export const deleteZona = (id_zona) =>
  axios.delete(`${API_URL}/${id_zona}`, {
    headers: getAuthHeaders(),
  });

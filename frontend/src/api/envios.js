// src/api/envios.js
import axios from "axios";

const API_URL = "https://agromatgranjas.com/api/envios";

// obtener token
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET
export const getEnvios = () =>
  axios.get(API_URL, { headers: getAuthHeaders() });

// POST
export const createEnvio = (data) =>
  
  axios.post(API_URL, data, { headers: getAuthHeaders() });

// PUT
export const updateEnvio = (id, data) =>
  axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });

// DELETE
export const deleteEnvio = (id) =>
  axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });

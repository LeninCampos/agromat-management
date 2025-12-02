// frontend/src/api/zonas.js
import axios from "axios";

const API_URL = "https://agromatgranjas.com/api/zonas";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getZonas = () => axios.get(API_URL);

export const createZona = (data) =>
  axios.post(API_URL, data, { headers: getAuthHeaders() });

export const updateZona = (id, data) =>
  axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });

export const deleteZona = (id) =>
  axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });

// frontend/src/api/suministros.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/suministro"; // Ojo: en tu router es 'suministro' (singular)

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getSuministros = () => axios.get(API_URL);

export const createSuministro = (data) =>
  axios.post(API_URL, data, { headers: getAuthHeaders() });

// Si necesitas borrar o editar:
export const deleteSuministro = (id) =>
  axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
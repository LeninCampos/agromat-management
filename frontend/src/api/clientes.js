// src/api/clientes.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/clientes";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getClientes = () => axios.get(API_URL);

export const createCliente = (data) => 
  axios.post(API_URL, data, { headers: getAuthHeaders() });

export const updateCliente = (id, data) =>
  axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });

export const deleteCliente = (id) =>
  axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
// src/api/proveedores.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/proveedores";

// Obtiene el token del login (si lo necesitas después)
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET todos los proveedores
export const getProveedores = () =>
  axios.get(API_URL);

// POST crear proveedor
export const createProveedor = (data) =>
  axios.post(API_URL, data, { headers: getAuthHeaders() });

// PUT actualizar proveedor
export const updateProveedor = (id, data) =>
  axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });

// DELETE eliminar proveedor
export const deleteProveedor = (id) =>
  axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });

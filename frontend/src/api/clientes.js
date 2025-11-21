// src/api/clientes.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/clientes";

// Si luego usas login/JWT puedes adaptar esto igual que en productos
export const getClientes = () => axios.get(API_URL);

export const createCliente = (data) => axios.post(API_URL, data);

export const updateCliente = (id, data) =>
  axios.put(`${API_URL}/${id}`, data);

export const deleteCliente = (id) =>
  axios.delete(`${API_URL}/${id}`);

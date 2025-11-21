// src/api/zonas.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/zonas";

export const getZonas = () => axios.get(API_URL);
export const createZona = (data) => axios.post(API_URL, data);
export const updateZona = (id, data) => axios.put(`${API_URL}/${id}`, data);
export const deleteZona = (id) => axios.delete(`${API_URL}/${id}`);

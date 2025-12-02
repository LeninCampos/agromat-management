import axios from "axios";

const API_URL = "https://agromatgranjas.com/api/dashboard";

export const getEnvios = () => axios.get(API_URL);
export const createEnvio = (d) => axios.post(API_URL, d);
export const updateEnvio = (id, d) => axios.put(`${API_URL}/${id}`, d);
export const deleteEnvio = (id) => axios.delete(`${API_URL}/${id}`);

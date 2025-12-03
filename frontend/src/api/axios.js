// frontend/src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://agromatgranjas.com/api", // 👈 NADA de localhost aquí
});

// Adjuntar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// frontend/src/api/uploads.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/upload";

// Reusar la misma lógica de auth que en productos
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Sube una imagen de producto (campo "imagen")
export const uploadProductoImagen = (file) => {
  const formData = new FormData();
  formData.append("imagen", file);

  return axios.post(`${API_URL}/productos`, formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });
};

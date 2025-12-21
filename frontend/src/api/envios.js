// frontend/src/api/envios.js
import api from "./axios";

// CRUD básico de envíos
export const getEnvios = () => api.get("/envios");

export const getEnvioById = (id) => api.get(`/envios/${id}`);

export const createEnvio = (data) => api.post("/envios", data);

export const updateEnvio = (id, data) => api.put(`/envios/${id}`, data);

export const deleteEnvio = (id) => api.delete(`/envios/${id}`);

// =====================================================
// ✅ NUEVO: Endpoints para fotos múltiples
// =====================================================

// Obtener fotos de un envío
export const getFotosEnvio = (idEnvio) => api.get(`/envios/${idEnvio}/fotos`);

// Subir múltiples fotos a un envío
export const uploadFotosEnvio = (idEnvio, formData) => {
  return api.post(`/envios/${idEnvio}/fotos`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Eliminar una foto de un envío
export const deleteFotoEnvio = (idEnvio, fotoId) => {
  return api.delete(`/envios/${idEnvio}/fotos/${fotoId}`);
};
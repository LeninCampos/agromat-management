import api from "./axios";

const UPLOAD_URL = "https://agromatgranjas.com/api/upload/productos";

export const uploadProductoImagen = (file) => {
  const formData = new FormData();
  formData.append("imagen", file);

  return api.post(UPLOAD_URL, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

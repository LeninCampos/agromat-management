import api from "./axios";

export const uploadProductoImagen = (file) => {
  const formData = new FormData();
  formData.append("imagen", file);

  return api.post("/upload/productos", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
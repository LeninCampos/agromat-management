import api from "./axios";

export const getSuministros = () => api.get("/suministro");

export const createSuministro = (data) => api.post("/suministro", data);

export const deleteSuministro = (id) => api.delete(`/suministro/${id}`);
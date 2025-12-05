import api from "./axios";

export const loginRequest = (data) => api.post("/auth/login", data);
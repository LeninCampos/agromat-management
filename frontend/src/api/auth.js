// src/api/auth.js
import axios from "axios";

const API_URL = "https://agromatgranjas.com/api/auth";

export const loginRequest = (data) => axios.post(`${API_URL}/login`, data);

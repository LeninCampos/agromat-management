// src/api/auth.js
import axios from "axios";

const API_URL = "http://localhost:4000/api/auth";

export const loginRequest = (data) => axios.post(`${API_URL}/login`, data);

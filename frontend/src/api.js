import axios from "axios";

const api = axios.create({
  baseURL: "https://agromatgranjas.com/api"
});

export default api;

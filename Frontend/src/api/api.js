import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;

// src/api.js
import axios from "axios";

// 1. Smart Detection (Declared only ONCE)
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const API_BASE = isLocal 
  ? "http://localhost:5000/api" 
  : "https://yokaku-backend.onrender.com/api";

export const SOCKET_URL = isLocal 
  ? "http://localhost:5000" 
  : "https://yokaku-backend.onrender.com";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Automated Token Attachment (The Interceptor)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
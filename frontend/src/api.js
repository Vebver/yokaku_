// src/api.js
import axios from "axios";

// 1. Smart Detection
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const API_URL = isLocal 
  ? "http://localhost:5000/api" 
  : "https://yokaku-backend.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
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
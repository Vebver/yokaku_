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
  // NOTE: Do NOT set a default Content-Type header.
  // Axios auto-detects the correct Content-Type:
  // - "application/json" for plain objects
  // - "multipart/form-data" for FormData (file uploads)
  // A forced "application/json" breaks FormData uploads.
});

// 2. Automated Token Attachment (Request Interceptor)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Response Interceptor — Auto-logout on 401 (Session Expired / Invalid Token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if we're NOT on a public auth-related request (login, signup, verify-otp, forgot-password)
      const url = error.config?.url || "";
      const isAuthRoute = url.includes("/auth/");
      
      // Only auto-logout for protected routes, not for login/signup auth attempts
      if (!isAuthRoute) {
        console.warn("🔒 Session expired or invalid token — logging out.");
        
        // Clear all session data
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
        localStorage.removeItem("role");
        localStorage.removeItem("firstName");
        localStorage.removeItem("lastName");
        localStorage.removeItem("email");
        
        // Redirect to home page (force reload to reset state)
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

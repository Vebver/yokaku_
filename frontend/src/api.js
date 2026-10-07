// src/api.js
// ============================================================================
// SINGLE SOURCE OF TRUTH FOR THE BACKEND URL
// Every component must import API_BASE / SOCKET_URL / the `api` instance from
// here. Do NOT re-declare these constants in a component, and do NOT hardcode
// a localhost or render URL — that previously caused pages to break whenever
// the backend host changed.
// ============================================================================
import axios from "axios";

// Vite's build mode determines whether to use the development backend.
const isDevelopment = import.meta.env.DEV;

// Deployed backend. Vite inlines import.meta.env at build time, so these are
// replaced with real values in the production bundle and fall back to the
// localhost values during local development.
const DEV_API = "http://localhost:5000/api";
const DEV_SOCKET = "http://localhost:5000";
const PROD_API = "https://yokaku-backend.onrender.com/api";
const PROD_SOCKET = "https://yokaku-backend.onrender.com";

export const API_BASE =
  import.meta.env.VITE_API_URL || (isDevelopment ? DEV_API : PROD_API);

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || (isDevelopment ? DEV_SOCKET : PROD_SOCKET);

// Root of the backend (no trailing slash, no /api). Use this for uploaded
// files and socket connections, which are not served under /api.
export const SERVER_URL = SOCKET_URL.replace(/\/+$/, "");

// Turn a stored DB path (e.g. "/uploads/x.png") into a loadable URL.
// Absolute URLs and data URIs are returned untouched.
export const resolveAssetUrl = (path) => {
  if (!path) return null;
  const value = String(path);
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${SERVER_URL}/${value.replace(/^\/+/, "")}`;
};

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

// Response interceptor — Auto-logout on 401 (Session Expired / Invalid Token)
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

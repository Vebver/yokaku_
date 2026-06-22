const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const API_BASE = isLocal 
  ? "http://localhost:5000/api" 
  : "https://yokaku-backend.onrender.com/api";

export const SOCKET_URL = isLocal 
  ? "http://localhost:5000" 
  : "https://yokaku-backend.onrender.com";
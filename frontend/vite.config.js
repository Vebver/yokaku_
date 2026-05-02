import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true,
        rewriteWsOrigin: true,
      },
    },
  },
  // For production build, the proxy is not used
  // API calls will go to the URL defined in VITE_API_URL env variable
});

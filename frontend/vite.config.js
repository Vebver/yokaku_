import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // These settings only run when you are working LOCALLY (npm run dev)
    // Vercel ignores this entire "server" block.
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    // Reduce the warning threshold noise (real fix is the code-splitting below)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into separate chunks so no single
        // chunk exceeds the size limit after minification.
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("scheduler")
            ) {
              return "vendor-react";
            }
            if (id.includes("chart.js") || id.includes("react-chartjs-2")) {
              return "vendor-charts";
            }
            if (id.includes("socket.io-client")) {
              return "vendor-socket";
            }
            if (id.includes("bootstrap")) {
              return "vendor-bootstrap";
            }
            if (id.includes("framer-motion")) {
              return "vendor-framer";
            }
            if (id.includes("html5-qrcode")) {
              return "vendor-qrcode";
            }
            if (id.includes("qrcode.react")) {
              return "vendor-qrcode";
            }
            if (
              id.includes("react-slick") ||
              id.includes("slick-carousel")
            ) {
              return "vendor-carousel";
            }
            if (id.includes("react-datepicker")) {
              return "vendor-datepicker";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
if (id.includes("axios")) {
              return "vendor-axios";
            }
          }
        },
      },
    },
  },
});

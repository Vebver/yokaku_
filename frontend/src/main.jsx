import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
// Shared helpers (spin keyframes, .x-small, .min-w-0, etc.) that used to be
// duplicated inside six separate components. Loaded once, up front.
import "./Style/utilities.css";
import App from "./App.jsx";
import { ToastProvider } from "./components/ToastContext";
import { ConfirmationProvider } from "./components/ConfirmationContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmationProvider>
        <App />
      </ConfirmationProvider>
    </ToastProvider>
  </React.StrictMode>,
);

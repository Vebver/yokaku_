import React, { createContext, useContext, useState, useEffect } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: "", type: "", id: null });

  const showToast = (message, type = "error") => {
    setToast({ message, type, id: Date.now() });
  };

  const hideToast = () => {
    setToast({ message: "", type: "", id: null });
  };

  useEffect(() => {
    if (toast.id) {
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.id]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.message && (
        <div
          className={`sticky-toast right ${toast.type}`}
          style={{
            position: "fixed",
            top: "30px",
            right: "30px",
            zIndex: 999999, // Guarantees it floats over modals
            minWidth: "280px",
            maxWidth: "380px",
            padding: "14px 18px",
            borderRadius: "6px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            color: "#ffffff",
            fontFamily: "sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            backgroundColor: toast.type === "success" ? "#1a3a2a" : "#3d1c1c",
            borderLeft: toast.type === "success" ? "5px solid #2ecc71" : "5px solid #e74c3c",
            boxSizing: "border-box"
          }}
        >
          <div style={{ flexGrow: 1, lineHeight: "1.4" }}>
            {toast.message}
          </div>
          <button
            onClick={hideToast}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: "20px",
              cursor: "pointer",
              lineHeight: "1",
              padding: "0 0 0 5px",
            }}
          >
            &times;
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
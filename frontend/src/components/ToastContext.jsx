import React, { createContext, useContext, useState, useEffect } from "react";
import "../Style/Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: "", type: "", id: null });

  const showToast = (message, type = "error") => {
    // Generates a unique ID (timestamp) to allow re-triggering the same error message consecutively
    setToast({ message, type, id: Date.now() });
  };

  const hideToast = () => {
    setToast({ message: "", type: "", id: null });
  };

  useEffect(() => {
    if (toast.id) {
      const timer = setTimeout(() => {
        hideToast();
      }, 4000); // Popup automatically hides after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [toast.id]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.message && (
        <div className={`sticky-toast right ${toast.type}`}>
          <div className="toast-content">{toast.message}</div>
          <button className="toast-close" onClick={hideToast}>
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
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";
import "../Style/AdminDashboard.css";

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [request, setRequest] = useState(null);
  const [typedValue, setTypedValue] = useState("");
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setTypedValue("");
      setRequest(options);
    });
  }, []);

  const close = useCallback((approved) => {
    resolver.current?.(approved);
    resolver.current = null;
    setRequest(null);
    setTypedValue("");
  }, []);

  useEffect(() => {
    if (!request) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [request, close]);

  const requiredText = request?.requireText;
  const canApprove = !requiredText || typedValue === requiredText;

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {request && (
        <div
          className="admin-confirm-backdrop"
          role="presentation"
        >
          <div className="admin-confirm-dialog">
            <div
              className="admin-confirm-content"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmation-title"
            >
              <div className="admin-confirm-header">
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <AlertTriangle
                    size={22}
                    className={`flex-shrink-0 ${
                      request.variant === "primary" ? "text-primary" : "text-danger"
                    }`}
                  />
                  <h5 className="modal-title admin-confirm-title" id="confirmation-title">
                    {request.title || "Confirm action"}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close flex-shrink-0 ms-auto"
                  aria-label="Cancel"
                  onClick={() => close(false)}
                />
              </div>
              <div className="admin-confirm-body">
                <p className="admin-confirm-message">{request.message}</p>
                {requiredText && (
                  <div className="mt-3 text-start">
                    <label
                      className="form-label small fw-semibold"
                      htmlFor="confirmation-phrase"
                    >
                      Type <span className="font-monospace">{requiredText}</span> to continue
                    </label>
                    <input
                      autoFocus
                      id="confirmation-phrase"
                      className="form-control"
                      value={typedValue}
                      onChange={(event) => setTypedValue(event.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="admin-confirm-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary admin-confirm-btn"
                  onClick={() => close(false)}
                >
                  {request.cancelLabel || "Cancel"}
                </button>
                <button
                  type="button"
                  className={`btn admin-confirm-btn ${
                    request.variant === "primary" ? "btn-primary" : "btn-danger"
                  }`}
                  disabled={!canApprove}
                  onClick={() => close(true)}
                >
                  {request.confirmLabel || "Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used within ConfirmationProvider");
  }
  return context;
}
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";

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
          className="modal show d-block"
          role="presentation"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", zIndex: 3000 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border-0 shadow-lg"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmation-title"
            >
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-2">
                  <AlertTriangle
                    size={20}
                    className={request.variant === "primary" ? "text-primary" : "text-danger"}
                  />
                  <h5 className="modal-title fw-bold" id="confirmation-title">
                    {request.title || "Confirm action"}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cancel"
                  onClick={() => close(false)}
                />
              </div>
              <div className="modal-body">
                <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
                  {request.message}
                </p>
                {requiredText && (
                  <div className="mt-3">
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
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => close(false)}
                >
                  {request.cancelLabel || "Cancel"}
                </button>
                <button
                  type="button"
                  className={`btn ${request.variant === "primary" ? "btn-primary" : "btn-danger"}`}
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
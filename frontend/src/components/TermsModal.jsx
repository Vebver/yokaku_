import React, { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const TermsModal = ({ isOpen, onAccept, onClose }) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="res-modal-overlay"
      style={{ display: "flex", zIndex: 99999 }}
    >
      <div
        className="res-modal-content fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "500px",
          padding: "30px",
          position: "relative",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          margin: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#666",
          }}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <ShieldCheck
            size={40}
            color="#ffcc00"
            style={{ marginBottom: "10px" }}
          />
          <h2 style={{ margin: 0, fontSize: "1.5rem", color: "#333" }}>
            Terms and Conditions
          </h2>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "15px",
            background: "#f9f9f9",
            borderRadius: "10px",
            fontSize: "0.85rem",
            lineHeight: "1.6",
            color: "#555",
            border: "1px solid #eee",
            marginBottom: "20px",
          }}
        >
          <p>
            <strong>1. Cancellation Policy:</strong> Cancellations must be made
            at least 24 hours before the reservation time.
          </p>
          <p>
            <strong>2. Late Arrival:</strong> Tables will be held for a maximum
            of 15 minutes past the reserved time. After 15 minutes, the
            reservation may be cancelled.
          </p>
          <p>
            <strong>3. Payment Rules:</strong> For packages, a down payment may
            be required to confirm the slot. All remaining balances must be
            settled after the event.
          </p>
          <p>
            <strong>4. Guest Count:</strong> The final number of guests must not
            exceed the maximum capacity specified in your selected package.
          </p>
          <p>
            <strong>5. Conduct:</strong> Hangout Resto Bar reserves the right to
            refuse service to anyone violating establishment policies.
          </p>
          <p>
            <strong>6. No Refund Policy:</strong> Downpayments are
            non-refundable for no-shows or late cancellations.
          </p>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          <span
            style={{ fontSize: "0.9rem", color: "#333", fontWeight: "500" }}
          >
            I have read and agree to the Terms and Conditions
          </span>
        </label>

        <div
          className="res-footer"
          style={{ padding: 0, background: "none", border: "none" }}
        >
          <button
            className="res-btn-continue"
            disabled={!agreed}
            onClick={onAccept}
            style={{
              width: "100%",
              opacity: agreed ? 1 : 0.5,
              cursor: agreed ? "pointer" : "not-allowed",
              background: "#f38d31",
              border: "none",
              padding: "14px",
              borderRadius: "14px",
              color: "white",
              fontWeight: "bold",
              lineHeight: "1.5",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;

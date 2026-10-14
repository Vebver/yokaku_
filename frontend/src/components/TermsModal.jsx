import React, { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const TermsModal = ({ isOpen, onAccept, onClose }) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (!agreed) return;
    if (onAccept) onAccept();
  };

  const handleClose = () => {
    setAgreed(false); // reset so next open starts unchecked
    if (onClose) onClose();
  };

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
          onClick={handleClose}
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

        {/* SCROLLABLE TERMS TEXT */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "15px",
            background: "#f9f9f9",
            borderRadius: "10px",
            fontSize: "1rem",
            lineHeight: "1.6",
            color: "#555",
            border: "1px solid #eee",
            marginBottom: "15px",
          }}
        >
          {/* ... your existing terms list, unchanged ... */}
          <p>
            <strong>1. Cancellation Policy:</strong> Customers can cancel their
            reservations, but please note that the Hangout Policy has{" "}
            <span style={{ color: "red" }}>
              NO REFUND, if you want a REFUND kindly click in "File a Refund"
              Button in My Reservation and Fill up and wait for approval of the
              store.
            </span>
          </p>
          <p>
            <strong>2. Late Arrival:</strong> Tables will be held for a maximum
            of 1 hour past the reserved time. After 1 hour, the reservation may
            be cancelled.
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
            <strong>6. No Refund Policy:</strong> Down payments are
            non-refundable for cancellations made less than 3 days before
            reservation time.
          </p>
          <p>
            <strong>7. Unlimited Policy:</strong>
          </p>
          <ul
            style={{
              marginTop: "8px",
              marginBottom: "16px",
              paddingLeft: "20px",
            }}
          >
            <li>
              Strictly <span style={{ color: "red" }}>SAME</span> unlimited
              promo price per <strong>TABLE</strong>. Unlimited serving is{" "}
              <span style={{ color: "red" }}>NO SHARING</span>.
            </li>
            <li>
              Once order is served, unlimited refills are valid for{" "}
              <span style={{ color: "red" }}>1.5 Hours</span>.
            </li>
            <li>
              Children <span style={{ color: "green" }}>4ft and below</span> can
              eat for <span style={{ color: "green" }}>FREE</span> if
              accompanied by paying adults.
            </li>
            <li>
              Ordering per head: Maximum of 6 pieces of chicken at a time
              (different flavors or your choice). If with pasta, either
              Carbonara or Bolognese (one flavor at a time).
            </li>
            <li>
              Food and drinks from <span style={{ color: "red" }}>OUTSIDE</span>{" "}
              are not allowed to be consumed inside.
            </li>
            <li>
              Cooking and preparation time is{" "}
              <span style={{ color: "green" }}>10 to 15 minutes</span>.
            </li>
            <li>
              Sharing an unlimited promo may result in termination of your
              unlimited promo. The servings for{" "}
              <span style={{ color: "red" }}>UNLIMITED</span> will be{" "}
              <span style={{ color: "red" }}>STOPPED</span>.
            </li>
            <li>
              <strong>
                For Sharing, Take-out, and Leftovers, charges are as follows:
              </strong>
              <ul
                style={{
                  marginTop: "8px",
                  marginLeft: "20px",
                  paddingLeft: "0",
                }}
              >
                <li>Wings - ₱40/pc</li>
                <li>Pasta - ₱100 per serving</li>
                <li>Nachos/Fries - ₱80 per order</li>
                <li>Rice - ₱25/cup</li>
                <li>Drinks - ₱85 per order</li>
              </ul>
            </li>
          </ul>
        </div>

        {/* CHECKBOX */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            marginBottom: "15px",
            cursor: "pointer",
            fontSize: "0.9rem",
            color: "#333",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{
              marginTop: "3px",
              width: "18px",
              height: "18px",
              cursor: "pointer",
              accentColor: "#ffcc00",
              flexShrink: 0,
            }}
          />
          <span>
            I have read and agree to the Terms and Conditions, including the No
            Refund Policy and Unlimited Promo rules.
          </span>
        </label>

        {/* BUTTONS */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "1.5px solid #ddd",
              background: "#fff",
              color: "#666",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!agreed}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: agreed ? "#ffcc00" : "#e0e0e0",
              color: agreed ? "#000" : "#999",
              fontWeight: "800",
              cursor: agreed ? "pointer" : "not-allowed",
              fontSize: "1rem",
              transition: "background 0.2s",
            }}
          >
            I Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;

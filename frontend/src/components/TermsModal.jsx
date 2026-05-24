import React, { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const TermsModal = ({ isOpen, onAccept, onClose }) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    setAgreed(true);
    if (onAccept) onAccept();
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
            <strong>1. Cancellation Policy:</strong> Customers can cancel their
            reservations, but please note that the Hangout Policy has{" "}
            <span style={{ color: "red" }}>NO REFUND</span>.
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
                <li>• Wings - ₱40/pc</li>
                <li>• Pasta - ₱100 per serving</li>
                <li>• Nachos/Fries - ₱80 per order</li>
                <li>• Rice - ₱25/cup</li>
                <li>• Drinks - ₱85 per order</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;

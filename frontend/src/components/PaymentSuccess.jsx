import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const [status, setStatus] = useState("processing");
  const navigate = useNavigate();
  const hasSaved = useRef(false); // Prevents double-saving if React StrictMode runs twice

  useEffect(() => {
    const saveToDatabase = async () => {
      // Prevent double execution
      if (hasSaved.current) return;

      const pendingData = localStorage.getItem("pendingReservation");
      const userId = localStorage.getItem("userId");

      if (!pendingData) {
        setStatus("error");
        return;
      }

      // Inside saveToDatabase function in PaymentSuccess.jsx
      try {
        const reservation = JSON.parse(pendingData);

        await axios.post("http://localhost:5000/api/reservations/table", {
          ...reservation,
          userId: userId,
          guests: reservation.guestCount, // Map guestCount to guests
          tableIds:
            reservation.tableIds ||
            JSON.stringify([
              reservation.selectedId,
              ...(reservation.linkedIds || []),
            ]),
          status: "Confirmed",
          paymentStatus: "verified",
          paymentMethod: "Gcash",
          receiptPath: "PAID_VIA_GCASH_AUTOMATED",
        });

        // ... rest of code

        localStorage.removeItem("pendingReservation"); // Clear data after success
        hasSaved.current = true;
        setStatus("success");
      } catch (err) {
        console.error("Database Save Error:", err);
        setStatus("error");
      }
    };

    // Small delay to make the transition feel smoother
    const timer = setTimeout(() => {
      saveToDatabase();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="floor-plan-wrapper"
      style={{
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
      }}
    >
      <div
        className="res-panel fade-in"
        style={{
          textAlign: "center",
          maxWidth: "500px",
          width: "90%",
          padding: "50px 30px",
        }}
      >
        {status === "processing" && (
          <div className="processing-box">
            <Loader2
              size={60}
              color="#f38d31"
              className="animate-spin"
              style={{ margin: "0 auto" }}
            />
            <h2 style={{ marginTop: "20px", fontFamily: "Playfair Display" }}>
              Verifying Payment...
            </h2>
            <p style={{ color: "#666" }}>
              Please do not close this window while we finalize your
              reservation.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="success-box">
            <CheckCircle
              size={80}
              color="#52b788"
              style={{ margin: "0 auto" }}
            />
            <h1
              style={{
                marginTop: "20px",
                fontFamily: "Playfair Display",
                color: "#1a1a1a",
              }}
            >
              Reservation Confirmed!
            </h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Your payment via GCash was successful. A confirmation has been
              recorded in our system.
            </p>
            <button
              onClick={() => navigate("/")}
              className="btn-confirm"
              style={{ width: "100%", padding: "16px" }}
            >
              Return to Home
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="error-box">
            <AlertTriangle
              size={80}
              color="#e63946"
              style={{ margin: "0 auto" }}
            />
            <h1 style={{ marginTop: "20px", fontFamily: "Playfair Display" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              We couldn't find your pending reservation data or there was a
              server error. If you have already paid, please contact support.
            </p>
            <button
              onClick={() => navigate("/")}
              className="btn-confirm"
              style={{
                width: "100%",
                padding: "16px",
                backgroundColor: "#333",
              }}
            >
              Back to Safety
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

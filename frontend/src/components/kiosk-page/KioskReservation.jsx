import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, UtensilsCrossed, RefreshCw } from "lucide-react";
import axios from "axios";
import "../../Style/KioskReservation.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const KioskReservation = () => {
  const navigate = useNavigate();
  const [resId, setResId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Track if an event has locked down the entry interface
  const [eventMode, setEventMode] = useState("default"); // "default" | "event_waiting"

  // 1. Parse physical table config from URL parameters
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const setupTable = queryParams.get("setupTable");
 // ==================== RESTAURANT-WIDE EVENT MONITORING ====================
  useEffect(() => {
    const checkActiveEventState = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reservations/active-kiosk`, {
          params: { tableId: setupTable }
        });

        if (res.data && res.data.success) {
          const { mode, reservation } = res.data;

          if (mode === "event_waiting") {
            // Lock this entry interface down into the event waiting screen
            setEventMode("event_waiting");
          } 
          // EXCLUSIVELY FOR PRIVATE EVENTS: Auto-unlocks and enters the menu
          else if (mode === "event_active") {
            localStorage.setItem("resId", reservation.reservation_id);
            if (reservation.table_id) {
              localStorage.setItem("tableId", reservation.table_id.toString());
            }
            const searchString = setupTable ? `?setupTable=${setupTable}` : "";
            navigate(`/kiosk-selection/kiosk-reservation-menu${searchString}`);
          } 
          else {
            // "table_default" / "table_assigned" - Stay on the manual check-in screen
            setEventMode("default");
          }
        }
      } catch (err) {
        console.error("Kiosk event polling error:", err);
      }
    };

    checkActiveEventState();
    const pollInterval = setInterval(checkActiveEventState, 3000);
    return () => clearInterval(pollInterval);
  }, [setupTable, navigate]);

  // Function to validate custom table reservation ID manually with database
  const validateAndProceed = async (id) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/reservations/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("resId", id);
        localStorage.setItem("kiosk_mode", "reservation");

        const searchString = setupTable ? `?setupTable=${setupTable}` : "";
        navigate(`/kiosk-selection/kiosk-reservation-menu${searchString}`);
      } else {
        setError(
          data.message || "Reservation not found. Please check your ID.",
        );
      }
    } catch (err) {
      setError("Server connection failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = () => {
    if (resId.trim()) {
      validateAndProceed(resId.trim());
    }
  };

  // ==================== 1. EVENT LOCKOUT VIEW (BLOCKS ENTRY FORM) ====================
  if (eventMode === "event_waiting") {
    return (
      <div className="kiosk-resting-screen" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#080808",
        color: "#fff",
        textAlign: "center",
        padding: "20px"
      }}>
        <div style={{
          background: "#111",
          border: "2px solid #222",
          padding: "40px 60px",
          borderRadius: "20px",
          maxWidth: "600px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        }}>
          <UtensilsCrossed size={80} color="#ffcc00" style={{ margin: "0 auto 20px" }} />
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "#fff", margin: "10px 0" }}>
            Event Setup Active
          </h1>
          <p style={{ color: "#888", fontSize: "1.2rem", margin: "15px 0 30px" }}>
            This kiosk is temporarily locked during our private event. Please wait for our staff to activate your session.
          </p>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            background: "#1e1a05",
            border: "1px solid #443c0c",
            padding: "10px 20px",
            borderRadius: "50px"
          }}>
            <RefreshCw size={18} color="#ffcc00" className="spinner-loader" />
            <span style={{ color: "#ffcc00", fontWeight: "bold" }}>
              Waiting for host activation...
            </span>
          </div>
        </div>
        <style>{` .spinner-loader { animation: spin 1.5s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  // ==================== 2. THE USUAL LOOK (TABLE CHECK-IN FORM) ====================
  return (
    <div className="kiosk-res-wrapper">
      <div className="kiosk-background-overlay"></div>

      {loading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px"
        }}>
          <Loader2 className="spinner-loader" color="#ffcc00" size={60} style={{ animation: "spin 1.2s linear infinite" }} />
          <h2 style={{ color: "#ffcc00", fontSize: "1.5rem", fontWeight: "bold" }}>Verifying Reservation...</h2>
        </div>
      )}

      <button className="back-btn" onClick={() => navigate(`/kiosk-selection${setupTable ? "?setupTable=" + setupTable : ""}`)}>
        <ArrowLeft size={24} />
        <span>BACK</span>
      </button>

      <div className="kiosk-res-content">
        <div className="kiosk-logo-small">
          <h1 className="logo-main">HANGOUT</h1>
          <p className="logo-sub">Resto Bar</p>
        </div>

        <div className="res-header">
          <h2 className="res-title">Reservation</h2>
          <p className="res-subtitle">Enter your Reservation ID to continue</p>
        </div>

        <div className="res-card fade-in">
          {error && (
            <div className="res-error-msg">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-section">
            <input
              type="text"
              className="res-input"
              placeholder="Enter Reservation ID"
              value={resId}
              onChange={(e) => setResId(e.target.value)}
              disabled={loading}
            />
            <button
              className="confirm-res-btn"
              disabled={!resId.trim() || loading}
              onClick={handleConfirmClick}
            >
              Confirm Reservation
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default KioskReservation;
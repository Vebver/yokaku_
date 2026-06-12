import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import "../../Style/KioskReservation.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const KioskReservation = () => {
  const navigate = useNavigate();
  const [resId, setResId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1. Parse and preserve the physical table config (e.g. ?setupTable=2)
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const setupTable = queryParams.get("setupTable");

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

        // 2. Append setupTable to the path so the menu page doesn't lose the config
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

  return (
    <div className="kiosk-res-wrapper">
      <div className="kiosk-background-overlay"></div>

      {/* 3. Full-Screen Loading Overlay */}
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
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UtensilsCrossed, RefreshCw } from "lucide-react";
import axios from "axios";
import "../../Style/KioskSelection.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const KioskSelection = () => {
  const navigate = useNavigate();
  const [eventMode, setEventMode] = useState("loading"); // "loading" | "event_waiting" | "default"
  
  // Track active reservation/event data details from backend polling
  const [kioskDetails, setKioskDetails] = useState(null);

  // 1. Extract physical table config from URL parameters
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const setupTable = queryParams.get("setupTable");

  // ==================== RESTAURANT-WIDE MONITORING ====================
  useEffect(() => {
    const checkActiveEventState = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reservations/active-kiosk`, {
          params: { tableId: setupTable }
        });

        if (res.data && res.data.success) {
          const { mode, reservation } = res.data;
          setKioskDetails(res.data); // Save the active state details locally

          if (mode === "event_waiting") {
            setEventMode("event_waiting");
          } 
          else if (mode === "event_active") {
            // Event has been activated by the admin, auto-redirect directly to menu using sessionStorage
            sessionStorage.setItem("resId", reservation.reservation_id);
            if (reservation.table_id) {
              sessionStorage.setItem("tableId", reservation.table_id.toString());
            }
            const searchString = setupTable ? `?setupTable=${setupTable}` : "";
            navigate(`/kiosk-selection/kiosk-reservation-menu${searchString}`);
          } 
          else {
            setEventMode("default");
          }
        }
      } catch (err) {
        console.error("Kiosk event polling error:", err);
        setEventMode("default");
      }
    };

    checkActiveEventState();
    const pollInterval = setInterval(checkActiveEventState, 3000);
    return () => clearInterval(pollInterval);
  }, [setupTable, navigate]);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 18) return "Good Afternoon!";
    return "Good Evening!";
  };

  // ==================== SELECTION CLICK HANDLER ====================
  const handleSelection = (type) => {
    const searchString = setupTable ? `?setupTable=${setupTable}` : "";

    if (type === 'menu') {
      // MODE: WALK-IN (sessionStorage)
      sessionStorage.removeItem("resId"); 
      sessionStorage.setItem("kiosk_mode", "walkin");
      navigate(`/kiosk-selection/kiosk-menu${searchString}`); 
    } 
    else if (type === 'reservation') {
      sessionStorage.setItem("kiosk_mode", "reservation");

      // BYPASS CHECK: If admin has already assigned a Table Reservation on the dashboard
      if (kioskDetails && kioskDetails.mode === "table_assigned") {
        const { reservation_id, table_id } = kioskDetails.reservation;
        
        // Write to sessionStorage so the menu page can read it successfully
        sessionStorage.setItem("resId", reservation_id);
        if (table_id) {
          sessionStorage.setItem("tableId", table_id.toString());
        }
        
        // Auto-unlock: Skip the ID typing page and open the menu immediately
        navigate(`/kiosk-selection/kiosk-reservation-menu${searchString}`);
      } else {
        // Normal Flow: Let the customer manually type their ID on the next screen
        navigate(`/kiosk-selection/kiosk-reservation${searchString}`); 
      }
    }
  };

  // ==================== LOADING VIEW ====================
  if (eventMode === "loading") {
    return (
      <div className="kiosk-selection-wrapper" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ textProject: "center" }}>
          <RefreshCw size={40} className="spinner-loader" color="#ffcc00" />
          <p style={{ marginTop: "15px", color: "#fff" }}>Loading Kiosk System...</p>
        </div>
        <style>{` .spinner-loader { animation: spin 1.5s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  // ==================== EVENT LOCKOUT VIEW ====================
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

  // ==================== STANDARD SELECTION CARDS ====================
  return (
    <div className="kiosk-selection-wrapper">
      <div className="kiosk-overlay"></div>

      <div className="selection-content fade-in">
        {/* Logo Section */}
        <div className="kiosk-logo-small">
          <h1 className="logo-main">HANGOUT</h1>
          <p className="logo-sub">Resto Bar</p>
        </div>

        {/* Greeting Section */}
        <div className="greeting-container">
          <h2 className="greeting-text">{getGreeting()}</h2>
          <p className="sub-greeting">
            What would you like to do today? {setupTable && <span style={{ color: "#ffcc00" }}>(Table {setupTable})</span>}
          </p>
        </div>

        {/* Options Grid */}
        <div className="options-container">
          
          {/* View Menu Card */}
          <div className="selection-card" onClick={() => handleSelection('menu')}>
            <h3 className="card-label">WALK-IN</h3>
            <div className="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" stroke="white" fill="rgba(255,255,255,0.1)" />
                <path d="M6 7v10M18 7v10" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Reservation Card */}
          <div className="selection-card" onClick={() => handleSelection('reservation')}>
            <h3 className="card-label">RESERVATION</h3>
            <div className="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2" />
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default KioskSelection;
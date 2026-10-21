import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../Style/KioskSelection.css";
import { API_BASE } from "../../api";

const KioskSelection = () => {
  const navigate = useNavigate();

  // 1. Extract physical table config from URL parameters
  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const setupTable = queryParams.get("setupTable");
  const kioskTableId =
    setupTable ||
    sessionStorage.getItem("tableId") ||
    localStorage.getItem("tableId");
  const searchString = kioskTableId
    ? `?setupTable=${encodeURIComponent(kioskTableId)}`
    : "";

  useEffect(() => {
    let disposed = false;

    const checkAdminOpenedKiosk = async () => {
      // IF the user clicked BACK, check WHICH ID they backed out of
      const ignoredId = sessionStorage.getItem("kiosk_ignored_res_id");

      try {
        const { data } = await axios.get(
          `${API_BASE}/reservations/active-kiosk`,
          {
            params: { tableId: kioskTableId },
          },
        );

        if (
          disposed ||
          !data?.success ||
          !["single_active", "event_active"].includes(data.mode) ||
          !data.reservation?.reservation_id ||
          data.reservation.is_kiosk_active !== 1
        ) {
          return;
        }

        // 🚨 THE FIX: If the backend tries to redirect to the ID we just backed out of, STOP.
        if (ignoredId && data.reservation.reservation_id === ignoredId) {
          return;
        }

        const { reservation_id, table_id } = data.reservation;
        sessionStorage.setItem("resId", reservation_id);
        sessionStorage.setItem("kiosk_mode", "reservation");
        if (table_id) {
          sessionStorage.setItem("tableId", String(table_id));
        }

        navigate(`/kiosk-selection/kiosk-reservation-menu${searchString}`);
      } catch (error) {
        console.error("Could not check admin-opened kiosk:", error);
      }
    };

    // Check ONCE on load.
    checkAdminOpenedKiosk();

    return () => {
      disposed = true;
    };
  }, [kioskTableId, navigate, searchString]);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 18) return "Good Afternoon!";
    return "Good Evening!";
  };

  // ==================== SELECTION CLICK HANDLER ====================
  const handleSelection = (type) => {
    if (type === "menu") {
      sessionStorage.removeItem("kiosk_reservation_checkin");
      sessionStorage.removeItem("kiosk_exit_to_selection");
      sessionStorage.removeItem("kiosk_ignored_res_id"); // <-- Add this
      sessionStorage.removeItem("resId");
      sessionStorage.setItem("kiosk_mode", "walkin");
      navigate(`/kiosk-selection/kiosk-menu${searchString}`);
    } else if (type === "reservation") {
      sessionStorage.setItem("kiosk_reservation_checkin", "true");
      sessionStorage.setItem("kiosk_mode", "reservation");
      sessionStorage.removeItem("kiosk_exit_to_selection");
      sessionStorage.removeItem("kiosk_ignored_res_id"); // <-- Add this
      navigate(`/kiosk-selection/kiosk-reservation${searchString}`);
    }
  };

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
            What would you like to do today?{" "}
            {setupTable && <span style={{ color: "#ffcc00" }}></span>}
          </p>
        </div>

        {/* Options Grid */}
        <div className="options-container">
          {/* View Menu Card */}
          <div
            className="selection-card"
            onClick={() => handleSelection("menu")}
          >
            <h3 className="card-label">DINE-IN</h3>
            <div className="icon-circle">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="9" />
                <circle
                  cx="12"
                  cy="12"
                  r="5"
                  stroke="white"
                  fill="rgba(255,255,255,0.1)"
                />
                <path d="M6 7v10M18 7v10" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Reservation Card */}
          <div
            className="selection-card"
            onClick={() => handleSelection("reservation")}
          >
            <h3 className="card-label">RESERVATION</h3>
            <div className="icon-circle">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path
                  d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskSelection;

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import axios from "axios";
import "../../Style/KioskSelection.css";
import { API_BASE } from "../../api";


const KioskSelection = () => {
  const navigate = useNavigate();

  // 1. Extract physical table config from URL parameters
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const setupTable = queryParams.get("setupTable");

  // ==================== RESTAURANT-WIDE MONITORING ====================
  useEffect(() => {
    const openMenu = () => {
      sessionStorage.removeItem("resId");
      sessionStorage.setItem("kiosk_mode", "walkin");
      const searchString = setupTable ? `?setupTable=${setupTable}` : "";
      navigate(`/kiosk-selection/kiosk-menu${searchString}`);
    };

    const checkActiveEventState = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reservations/active-kiosk`, {
          params: { tableId: setupTable }
        });

        if (res.data && res.data.success) {
          const { mode, reservation } = res.data;

          if (mode === "event_active" || mode === "single_active") {
            // Active reservations open their assigned menu without a mode prompt.
            sessionStorage.setItem("resId", reservation.reservation_id);
            if (reservation.table_id) {
              sessionStorage.setItem("tableId", reservation.table_id.toString());
            }
            const searchString = setupTable ? `?setupTable=${setupTable}` : "";
            navigate(`/kiosk-selection/kiosk-reservation-menu${searchString}`);
          } 
          else {
            openMenu();
          }
        } else {
          openMenu();
        }
      } catch (err) {
        console.error("Kiosk event polling error:", err);
        openMenu();
      }
    };

    checkActiveEventState();
    const pollInterval = setInterval(checkActiveEventState, 3000);
    return () => clearInterval(pollInterval);
  }, [setupTable, navigate]);

  return (
    <div className="kiosk-selection-wrapper" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <RefreshCw size={40} className="spinner-loader-slow" color="#ffcc00" />
        <p style={{ marginTop: "15px", color: "#fff" }}>Loading Kiosk System...</p>
      </div>
    </div>
  );
};

export default KioskSelection;

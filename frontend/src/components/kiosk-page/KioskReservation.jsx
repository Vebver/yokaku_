import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import "../../Style/KioskReservation.css";
import { API_BASE } from "../../api";


// Reservation dates arrive as YYYY-MM-DD, which the browser would otherwise
// parse as UTC and shift a day backwards for some timezones.
const formatDate = (value) => {
  if (!value) return "-";
  const raw = String(value);
  const iso = raw.length > 10 ? raw.slice(0, 10) : raw;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  const raw = String(value).slice(0, 5);
  const [h, m] = raw.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return String(value);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

const KioskReservation = () => {
  const navigate = useNavigate();
  const [resId, setResId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeResId, setActiveResId] = useState(sessionStorage.getItem("resId") || null);
  // Holds the looked-up reservation while the guest confirms it is theirs.
  const [pending, setPending] = useState(null);

  // Track if an event has locked down the entry interface
  const [eventMode, setEventMode] = useState("default"); // "default" | "event_waiting"

  // 1. Parse physical table config from URL parameters
  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const setupTable = queryParams.get("setupTable");
  // ==================== RESTAURANT-WIDE EVENT MONITORING ====================
  useEffect(() => {
    const checkActiveEventState = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reservations/active-kiosk`, {
          params: { tableId: setupTable },
        });

        if (res.data && res.data.success) {
          const { mode, reservation } = res.data;

          if (mode === "event_waiting") {
            // Lock this entry interface down into the event waiting screen
            setEventMode("event_waiting");
          }
          // Opened event and single-customer sessions both enter the menu directly.
          else if (mode === "event_active" || mode === "single_active") {
            sessionStorage.setItem("resId", reservation.reservation_id);
            if (reservation.table_id) {
              sessionStorage.setItem(
                "tableId",
                reservation.table_id.toString(),
              );
            }
            const searchString = setupTable ? `?setupTable=${setupTable}` : "";
            navigate(`/kiosk-selection/kiosk-reservation-menu${searchString}`);
          } else {
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

      // Step 1: side-effect-free lookup. This only reads the reservation so the
      // guest can confirm it is theirs BEFORE anything is written to it.
      const response = await fetch(`${API_BASE}/reservations/${id}/preview`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        setPending({ id, reservation: data.reservation, tables: data.tables || [] });
        setResId("");
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

  // Step 2: the guest confirms the details are theirs. Only now do we call the
  // endpoint that actually seats the reservation and opens the menu.
  const confirmAndEnter = async () => {
    if (!pending) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/reservations/${pending.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        sessionStorage.setItem("resId", pending.id);
        sessionStorage.setItem("kiosk_mode", "reservation");
        if (pending.tables.length > 0) {
          sessionStorage.setItem("tableNames", pending.tables.join(", "));
        }

        const searchString = setupTable ? `?setupTable=${setupTable}` : "";
        navigate(`/kiosk-selection/kiosk-reservation-menu${searchString}`);
      } else {
        setError(data.message || "Unable to start this reservation.");
        setPending(null);
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
      <div
        className="kiosk-resting-screen"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#080808",
          color: "#fff",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#111",
            border: "2px solid #222",
            padding: "40px 60px",
            borderRadius: "20px",
            maxWidth: "600px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <UtensilsCrossed
            size={80}
            color="#ffcc00"
            style={{ margin: "0 auto 20px" }}
          />
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "900",
              color: "#fff",
              margin: "10px 0",
            }}
          >
            Event Setup Active
          </h1>
          <p
            style={{ color: "#888", fontSize: "1.2rem", margin: "15px 0 30px" }}
          >
            This kiosk is temporarily locked during our private event. Please
            wait for our staff to activate your session.
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "#1e1a05",
              border: "1px solid #443c0c",
              padding: "10px 20px",
              borderRadius: "50px",
            }}
          >
            <RefreshCw size={18} color="#ffcc00" className="spinner-loader" />
            <span style={{ color: "#ffcc00", fontWeight: "bold" }}>
              Waiting for host activation...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 2. THE USUAL LOOK (TABLE CHECK-IN FORM) ====================
  return (
    <div className="kiosk-res-wrapper">
      <div className="kiosk-background-overlay"></div>

      {loading && (
        <div
          style={{
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
            gap: "20px",
          }}
        >
          <Loader2
            className="spinner-loader"
            color="#ffcc00"
            size={60}
            style={{ animation: "spin 1.2s linear infinite" }}
          />
          <h2
            style={{ color: "#ffcc00", fontSize: "1.5rem", fontWeight: "bold" }}
          >
            Verifying Reservation...
          </h2>
        </div>
      )}

      <button
        className="back-btn"
        onClick={() => {
          if (pending) {
            setPending(null);
            setError("");
            return;
          }
          navigate(
            `/kiosk-selection${setupTable ? "?setupTable=" + setupTable : ""}`,
          );
        }}
      >
        <ArrowLeft size={24} />
        <span>BACK</span>
      </button>

      <div className="kiosk-res-content">
        <div className="kiosk-logo-small">
          <h1 className="logo-main">HANGOUT</h1>
          <p className="logo-sub">Resto Bar</p>
        </div>

        <div className="res-header">
          <h2 className="res-title">
            {pending ? "Confirm Reservation" : "Reservation"}
          </h2>
          <p className="res-subtitle">
            {pending
              ? "Please confirm these details are yours before ordering"
              : "Enter your Reservation ID to continue"}
          </p>
        </div>

        {pending ? (
          <div className="res-card fade-in">
            {error && (
              <div className="res-error-msg">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ textAlign: "center", padding: "10px 0 5px" }}>
              <div
                style={{
                  fontSize: "1.9rem",
                  fontWeight: "900",
                  color: "#ffcc00",
                  marginBottom: "6px",
                }}
              >
                {[pending.reservation.first_name, pending.reservation.last_name]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "(no name)"}
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#1e1a05",
                  border: "1px solid #443c0c",
                  color: "#ffcc00",
                  padding: "6px 14px",
                  borderRadius: "50px",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                  marginBottom: "18px",
                }}
              >
                <UtensilsCrossed size={16} />
                {pending.reservation.num_guests || 1} pax
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  background: "#151515",
                  border: "1px solid #262626",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#888",
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: "4px",
                  }}
                >
                  Date
                </div>
                <div style={{ color: "#fff", fontWeight: "bold" }}>
                  {formatDate(pending.reservation.reservation_date)}
                </div>
              </div>
              <div
                style={{
                  background: "#151515",
                  border: "1px solid #262626",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#888",
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: "4px",
                  }}
                >
                  Time
                </div>
                <div style={{ color: "#fff", fontWeight: "bold" }}>
                  {formatTime(pending.reservation.reservation_time)}
                </div>
              </div>
              <div
                style={{
                  background: "#151515",
                  border: "1px solid #262626",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#888",
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: "4px",
                  }}
                >
                  {pending.reservation.is_event ? "Event Space" : "Table"}
                </div>
                <div style={{ color: "#fff", fontWeight: "bold" }}>
                  {pending.reservation.is_event
                    ? "All Tables"
                    : pending.tables.length > 0
                      ? pending.tables.join(", ")
                      : "Assigned on arrival"}
                </div>
              </div>
            </div>

            <p
              style={{
                color: "#aaa",
                fontSize: "0.9rem",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              Is this you? If not, tap Back and enter the correct ID.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="confirm-res-btn"
                style={{
                  flex: 1,
                  background: "#333",
                  color: "#fff",
                }}
                onClick={() => {
                  setPending(null);
                  setError("");
                }}
                disabled={loading}
              >
                Not me
              </button>
              <button
                className="confirm-res-btn"
                style={{ flex: 2 }}
                onClick={confirmAndEnter}
                disabled={loading}
              >
                Yes, start ordering
              </button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default KioskReservation;

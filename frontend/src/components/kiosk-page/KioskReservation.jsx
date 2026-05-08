import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, ArrowLeft, X, Loader2, AlertCircle } from "lucide-react"; // Added icons for feedback
import { Html5Qrcode } from "html5-qrcode";
import "../../Style/KioskReservation.css";
import alertMusicFile from "../../assets/alert-sound.mp3";

const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const KioskReservation = () => {
  const navigate = useNavigate();
  const [resId, setResId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false); // New state for API check
  const [error, setError] = useState(""); // New state for error messages
  const scannerRef = useRef(null);
  const audioRef = useRef(new Audio(alertMusicFile));

  //AUDIO
  const unlockAudio = () => {
    audioRef.current
      .play()
      .then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      })
      .catch(() => {}); // Ignore errors
  };
  // --- NEW: FUNCTION TO VALIDATE ID WITH DATABASE ---
  const validateAndProceed = async (id) => {
    unlockAudi();
    setLoading(true);
    setError("");
    try {
      // We try to get the token, but if it's a public kiosk, it might be null
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/reservations/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }), // Only add if token exists
        },
      });

      const data = await response.json();

      if (response.ok) {
        // SUCCESS: Save the valid reservation ID
        localStorage.setItem("resId", id);
        localStorage.setItem("kiosk_mode", "reservation"); // Mark mode
        navigate("/kiosk-selection/kiosk-reservation-menu");
      } else {
        setError(
          data.message || "Reservation not found. Please check your ID.",
        );
        if (isScanning) stopScanner();
      }
    } catch (err) {
      setError("Server connection failed. Please try again later.");
      if (isScanning) stopScanner();
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setError("");
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            stopScanner();
            validateAndProceed(decodedText); // Validate scan result
          },
          (errorMessage) => {
            /* Scanning... */
          },
        );
      } catch (err) {
        console.error("Unable to start scanner", err);
        setIsScanning(false);
        setError("Could not access camera.");
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  const handleConfirmClick = () => {
    if (resId.trim()) {
      validateAndProceed(resId.trim()); // Validate manual input
    }
  };

  return (
    <div className="kiosk-res-wrapper">
      <div className="kiosk-background-overlay"></div>

      <button className="back-btn" onClick={() => navigate("/kiosk-selection")}>
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
          <p className="res-subtitle">
            Scan your QR code or enter your Reservation ID
          </p>
        </div>

        <div className="res-card fade-in">
          {/* Error Message Display */}
          {error && (
            <div
              className="res-error-msg"
              style={{
                color: "#ff4d4d",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "15px",
                justifyContent: "center",
                background: "rgba(255,0,0,0.1)",
                padding: "10px",
                borderRadius: "10px",
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!isScanning ? (
            <div className="qr-section" onClick={loading ? null : startScanner}>
              <div
                className={`qr-scanner-glow ${loading ? "loading" : "clickable"}`}
              >
                <div className="qr-inner-circle">
                  {loading ? (
                    <Loader2
                      className="animate-spin"
                      size={60}
                      color="#ffcc00"
                    />
                  ) : (
                    <QrCode size={80} color="#ffcc00" strokeWidth={1.5} />
                  )}
                </div>
              </div>
              <p className="qr-label">
                {loading ? "Verifying..." : "Tap to Scan QR Code"}
              </p>
            </div>
          ) : (
            <div className="scanner-container">
              <div id="reader"></div>
              <button className="close-scanner-btn" onClick={stopScanner}>
                <X size={20} /> Close Camera
              </button>
            </div>
          )}

          <div className="or-divider">
            <div className="line"></div>
            <span>OR</span>
            <div className="line"></div>
          </div>

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
              {loading ? "Verifying..." : "Confirm Reservation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskReservation;

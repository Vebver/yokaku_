import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowLeft, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode'; // Changed this line
import '../../Style/KioskReservation.css';

const KioskReservation = () => {
  const navigate = useNavigate();
  const [resId, setResId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null); // Used to store the scanner instance

  const startScanner = async () => {
    setIsScanning(true);
    // Give React time to render the #reader div
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        // Start the camera (environment means back camera)
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            setResId(decodedText);
            stopScanner(); // Stop on success
            alert("QR Code Detected: " + decodedText);
          },
          (errorMessage) => {
            // Constant searching... ignore errors
          }
        );
      } catch (err) {
        console.error("Unable to start scanner", err);
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear(); // Clean up the DOM
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
    setIsScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  // Function to handle manual confirmation
  const handleConfirmClick = () => {
    if (resId.trim()) {
      // Directs to the Reservation Menu page
      navigate('/kiosk-selection/kiosk-reservation-menu');
    }
  };

  return (
    <div className="kiosk-res-wrapper">
      <div className="kiosk-background-overlay"></div>

      <button className="back-btn" onClick={() => navigate('/kiosk-selection')}>
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
          <p className="res-subtitle">Scan your QR code or enter your Reservation ID</p>
        </div>

        <div className="res-card fade-in">
          {!isScanning ? (
            <div className="qr-section" onClick={startScanner}>
              <div className="qr-scanner-glow clickable">
                <div className="qr-inner-circle">
                  <QrCode size={80} color="#ffcc00" strokeWidth={1.5} />
                </div>
              </div>
              <p className="qr-label">Tap to Scan QR Code</p>
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
            />
            <button className="confirm-res-btn" disabled={!resId.trim()} onClick={handleConfirmClick}>
              Confirm Reservation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskReservation;
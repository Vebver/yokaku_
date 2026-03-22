import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../../Style/KioskLanding.css";

const KioskLanding = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    // Navigate to your menu or selection page
    navigate('/kiosk/selection'); 
  };

  return (
    <div className="kiosk-wrapper" onClick={handleStart}>
      {/* Background Image is handled via CSS for better control */}
      <div className="kiosk-overlay"></div>
      
      <div className="kiosk-content fade-in">
        <div className="brand-container">
          <h1 className="kiosk-logo-main">HANGOUT</h1>
          <p className="kiosk-logo-sub">Resto Bar</p>
        </div>
      </div>

      <div className="kiosk-footer pulse">
        <p>Touch to begin</p>
      </div>
    </div>
  );
};

export default KioskLanding;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Style/KioskSelection.css';

const KioskSelection = () => {
  const navigate = useNavigate();

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 18) return "Good Afternoon!";
    return "Good Evening!";
  };

  const handleSelection = (type) => {
    if (type === 'menu') {
      // Directs to the ordering/menu page
      navigate('/kiosk-selection/kiosk-menu'); 
    } else if (type === 'reservation') {
      // Directs to the table reservation flow
      navigate('/kiosk-selection/kiosk-reservation'); 
    }
  };

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
          <p className="sub-greeting">What would you like to do today?</p>
        </div>

        {/* Options Grid */}
        <div className="options-container">
          
          {/* View Menu Card */}
          <div className="selection-card" onClick={() => handleSelection('menu')}>
            <h3 className="card-label">VIEW MENU</h3>
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
              {/* New Reservation/Calendar Icon */}
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
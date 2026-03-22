import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Style/CashierSelection.css';

const CashierSelection = () => {
  const navigate = useNavigate();

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 18) return "Good Afternoon!";
    return "Good Evening!";
  };

  const handleSelection = (type) => {
    if (type === 'dine-in') {
      navigate('/cashier-selection/dinein'); // Or your menu page
    } else {
      navigate('/menu');
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
          <p className="sub-greeting">Where would you like to eat?</p>
        </div>

        {/* Options Grid */}
        <div className="options-container">
          {/* Dine In Card */}
          <div className="selection-card" onClick={() => handleSelection('dine-in')}>
            <h3 className="card-label">DINE IN</h3>
            <div className="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
                {/* Simplified Plate/Utensil Shape */}
                <circle cx="12" cy="12" r="5" stroke="white" fill="rgba(255,255,255,0.1)" />
                <path d="M6 7v10M18 7v10" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Take Out Card */}
          <div className="selection-card" onClick={() => handleSelection('take-out')}>
            <h3 className="card-label">TAKE OUT</h3>
            <div className="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M6 8h12l1 12H5L6 8z" />
                <path d="M9 8V5a3 3 0 0 1 6 0v3" />
                <rect x="9" y="12" width="6" height="4" rx="1" fill="rgba(255,255,255,0.1)" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierSelection;
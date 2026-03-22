import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../Style/KioskOrderActive.css';

const KioskOrderActive = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderItems = location.state?.orderItems || [];

  // --- 1. PERSISTENT TIMER LOGIC ---
  const SESSION_KEY = "kiosk_end_time";

  const [secondsLeft, setSecondsLeft] = useState(() => {
    // Check if we already have a saved end time in the browser
    const savedEndTime = localStorage.getItem(SESSION_KEY);
    
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    } else {
      // First time starting: set end time to 1hr 30min from now
      const endTime = Date.now() + 5400 * 1000; 
      localStorage.setItem(SESSION_KEY, endTime.toString());
      return 5400;
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEndSession = () => {
    if(window.confirm("Are you sure you want to end the session?")) {
      localStorage.removeItem(SESSION_KEY); // Delete the timer
      navigate('/kiosk'); // Go back to landing
    }
  };

  // Formatting Logic
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- 2. MULTI-FLAVOR LOGIC (MAX 4) ---
  const flavors = ["Classic", "Teriyaki", "Barbeque", "Honey Mustard", "Sisig", "Sweet & Chili", "Garlic Mayo", "Hot Buffalo"];
  const [selectedFlavors, setSelectedFlavors] = useState([]);

  const handleFlavorClick = (flavor) => {
    setSelectedFlavors((prev) => {
      if (prev.includes(flavor)) return prev.filter(f => f !== flavor);
      if (prev.length < 4) return [...prev, flavor];
      alert("Maximum of 4 flavors only!");
      return prev;
    });
  };

  const calculateTotal = () => {
    return orderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  };

  return (
    <div className="kiosk-order-wrapper active-session-bg">
      <div className="active-layout">
        
        {/* LEFT PANEL */}
        <div className="active-left-panel">
          <div className="brand-small">
            <h2>HANGOUT</h2>
            <p>Table Dashboard</p>
          </div>
          
          <div className="bill-card">
            <label>CURRENT BILL</label>
            <h1>₱{calculateTotal().toLocaleString()}</h1>
          </div>

          <div className="active-order-list">
            <h4 className="gold-text">Items Ordered:</h4>
            {orderItems.map((item, idx) => (
              <div key={idx} className="active-item-row">
                <span>{item.qty}x {item.name}</span>
                <span>₱{(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
            <h1>Tips on how to cook this dish:</h1>
          </div>

          <button 
            className="add-more-btn" 
            onClick={() => navigate('/kiosk/order', { state: { isAddOnMode: true, currentOrder: orderItems } })}
          >
            + Add Drinks / Sides / Extras
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="active-right-panel">
          
          <div className="timer-container">
            <p>REMAINING TIME (UNLI)</p>
            <div className="digital-clock">{formatTime(secondsLeft)}</div>
            <button className="end-time-btn" onClick={handleEndSession}>
              End Session
            </button>
          </div>

          <div className="flavor-selection-card">
            <h3>SELECT YOUR FLAVORS <small>(Max 4)</small></h3>
            <p>Selected: <span className="gold-text">
              {selectedFlavors.length > 0 ? selectedFlavors.join(", ") : "None"}
            </span></p>
            
            <div className="flavor-grid-active">
              {flavors.map(f => (
                <button 
                  key={f} 
                  className={`flavor-pill ${selectedFlavors.includes(f) ? 'active' : ''}`}
                  onClick={() => handleFlavorClick(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <button 
              className="confirm-flavor-btn" 
              disabled={selectedFlavors.length === 0}
              onClick={() => alert(`Kitchen notified: Preparing batch with ${selectedFlavors.join(", ")}`)}
            >
              REQUEST BATCH ({selectedFlavors.length}/4)
            </button>
          </div>

          <button className="confirm-flavor-btn">🔔 CALL ASSISTANCE</button>
        </div>

      </div>
    </div>
  );
};

export default KioskOrderActive;
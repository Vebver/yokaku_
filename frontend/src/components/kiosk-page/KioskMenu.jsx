import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Bell, ChevronUp, ChevronDown, AlertCircle } from "lucide-react";
import "../../Style/KioskMenu.css";

const KioskMenu = () => {
  const navigate = useNavigate();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Wings & More");
  const [selectedCard, setSelectedCard] = useState(null);

  // --- TOGGLE LOGIC FIXED ---
  const handleCardClick = (id) => {
    if (selectedCard === id) {
      setSelectedCard(null); // Deselect if already selected
    } else {
      setSelectedCard(id); // Select new item
    }
  };

  const handleCancelClick = () => setShowCancelModal(true);
  const confirmCancel = () => navigate("/kiosk-selection");

  const steps = [
    { id: 1, label: "View Menu", completed: true },
    { id: 2, label: "Select Order", completed: true },
    { id: 3, label: "View Order", completed: false },
  ];

  const categories = [
    "What's Popular", "Wings & More", "Budget Meals",
    "Pizzas", "Burgers", "Hangout Specials",
  ];

  // --- MENU ITEMS ARRAY ---
  const menuItems = [
    { id: 1, name: "Bbq Wings", image: "/Menu/Chicken/BbqW - Edited.png"},
    { id: 2, name: "Classic Wings", image: "/Menu/Chicken/ClassicW - Edited.png" },
    { id: 3, name: "Garlic Mayo Wings", image: "/Menu/Chicken/GarlicMayoW - Edited.png" },
    { id: 4, name: "Hot & Spicy Wings", image: "/Menu/Chicken/Hot&SpicyW - Edited.png" },
    { id: 5, name: "Sisig Wings", image: "/Menu/Chicken/SisigW - Edited.png" },
    { id: 6, name: "Sweet Chili Wings", image: "/Menu/Chicken/SweetChiliW - Edited.png" },
    { id: 7, name: "Teriyaki Wings", image: "/Menu/Chicken/TeriyakiW - Edited.png" }
  ];

  return (
    <div className="kiosk-container">
      {/* --- TOP STEP INDICATOR --- */}
      <nav className="step-indicator">
        {steps.map((step, index) => (
          <div key={step.id} className={`step-item ${step.completed ? "completed" : "pending"}`}>
            <div className="step-icon">
              {step.completed ? <Check size={16} strokeWidth={4} /> : <span>{step.id}</span>}
            </div>
            <div className="step-text">
              <span className="step-label">{step.label}</span>
            </div>
            {index !== steps.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </nav>

      <div className="main-layout">
        {/* --- SIDEBAR --- */}
        <aside className="sidebar">
          <div className="brand">
            <h1 className="logo-main">HANGOUT</h1>
            <p className="logo-sub">Resto Bar</p>
          </div>

          <div className="category-list">
            <div className="scroll-arrow top"><ChevronUp size={20} /></div>
            <div className="cat-scroll-wrapper">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`cat-btn ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  <div className="cat-icon-placeholder" />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
            <div className="scroll-arrow bottom"><ChevronDown size={20} /></div>
          </div>

          <button className="assist-btn" onClick={() => navigate('/kiosk-selection')}>
            <Bell size={18} fill="currentColor" />
            <span>Assist Me</span>
          </button>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="content-area">
          <div className="grid-container">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`food-card ${selectedCard === item.id ? "selected" : ""}`}
                /* CALL THE TOGGLE FUNCTION HERE */
                onClick={() => handleCardClick(item.id)}
              >
                <div className="card-image-container">
                  <img src={item.image} alt={item.name} className="food-img" />
                </div>
                <div className="card-info">
                  <h4 className="food-label">{item.name}</h4>
                </div>
                
                {/* Visual indicator for selection */}
                {selectedCard === item.id && (
                  <div className="selected-check">
                    <Check size={18} color="white" strokeWidth={4} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* --- BOTTOM BAR --- */}
      <footer className="bottom-bar">
        <div className="action-btns">
          <button className="btn-cancel" onClick={handleCancelClick}>Cancel</button>
          {/* Disable button if no item is selected */}
          <button 
            className="btn-view" 
            disabled={selectedCard === null}
            onClick={() => navigate('/kiosk-selection')}
          >
            View Order
          </button>
        </div>
      </footer>

      {/* --- CANCEL MODAL --- */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-card fade-in-scale" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon"><AlertCircle size={48} color="#ffcc00" /></div>
            <h2>Discard Order?</h2>
            <p>Your current selections will be cleared.</p>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setShowCancelModal(false)}>No, Keep Ordering</button>
              <button className="modal-btn-primary" onClick={confirmCancel}>Yes, Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskMenu;
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusSquare, Drumstick, CupSoda,
  Check, Bell, ChevronUp, ChevronDown, AlertCircle
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";

const categoryIcons = {
  "Chicken Wings": <Drumstick />,
  "Extra": <PlusSquare />,
  "Drinks": <CupSoda />
};

// --- 1. ORGANIZE YOUR DATA BY CATEGORY ---
const menuData = {
  "Chicken Wings": [
    { id: "unli-1", name: "Bbq Wings", image: "/Menu/Chicken/BbqW - Edited.png" },
    { id: "unli-2", name: "Classic Wings", image: "/Menu/Chicken/ClassicW - Edited.png" },
    { id: "unli-3", name: "Garlic Mayo", image: "/Menu/Chicken/GarlicMayoW - Edited.png" },
    { id: "unli-4", name: "Hot & Spicy", image: "/Menu/Chicken/Hot&SpicyW - Edited.png" },
    { id: "unli-5", name: "Sisig Wings", image: "/Menu/Chicken/SisigW - Edited.png" },
    { id: "unli-6", name: "Sweet Chili", image: "/Menu/Chicken/SweetChiliW - Edited.png" },
    { id: "unli-7", name: "Teriyaki Wings", image: "/Menu/Chicken/TeriyakiW - Edited.png" },
  ],

  "Extra": [
    { id: "piz-1", name: "Rice", image: "/logo.png" },
    { id: "piz-2", name: "Fries", image: "/logo.png" },
  ],

  "Drinks": [
    { id: "burg-1", name: "Cheese Burger", image: "/logo.png" },
    { id: "burg-2", name: "Bacon Burger", image: "/logo.png" },
  ]
};

const KioskReservationMenu = () => {
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Chicken Wings"); 
  const [selectedCard, setSelectedCard] = useState(null);

  const categories = Object.keys(menuData);
  const currentItems = menuData[activeCategory] || [];

  const handleCardClick = (id) => {
    setSelectedCard(prev => prev === id ? null : id);
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSelectedCard(null); 
  };

  const handleCancelClick = () => setShowCancelModal(true);
  const confirmCancel = () => navigate("/kiosk-selection");

  const steps = [
    { id: 1, label: "Reservation", completed: true },
    { id: 2, label: "Select Order", completed: true },
    { id: 3, label: "View Order", completed: false },
  ];

  return (
    <div className="res-kiosk-container">
      <nav className="res-step-indicator">
        {steps.map((step, index) => (
          <div key={step.id} className={`res-step-item ${step.completed ? "res-completed" : "res-pending"}`}>
            <div className="res-step-icon">
              {step.completed ? <Check size={16} strokeWidth={4} /> : <span>{step.id}</span>}
            </div>
            <div className="res-step-text"><span className="res-step-label">{step.label}</span></div>
            {index !== steps.length - 1 && <div className="res-step-line" />}
          </div>
        ))}
      </nav>

      <div className="res-main-layout">
        <aside className="res-sidebar">
          <div className="res-brand">
            <h1 className="res-logo-main">HANGOUT</h1>
            <p className="res-logo-sub">Resto Bar</p>
          </div>

          <div className="res-category-list">
            <div className="res-scroll-arrow res-top"><ChevronUp size={20} /></div>
            <div className="res-cat-scroll-wrapper">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`res-cat-btn ${activeCategory === cat ? "res-active" : ""}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  <div className="res-cat-icon-placeholder">
                    {categoryIcons[cat] || <Star size={20} />}
                  </div>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
            <div className="res-scroll-arrow res-bottom"><ChevronDown size={20} /></div>
          </div>

          <button className="res-assist-btn" onClick={() => navigate("/kiosk-selection")}>
            <Bell size={18} fill="currentColor" />
            <span>Assist Me</span>
          </button>
        </aside>

        <main className="res-content-area">
          <div className="res-grid-container">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className={`res-food-card ${selectedCard === item.id ? "res-selected" : ""}`}
                onClick={() => handleCardClick(item.id)}
              >
                <div className="res-card-image-container">
                  <img src={item.image} alt={item.name} className="res-food-img" />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                </div>

                {selectedCard === item.id && (
                  <div className="res-selected-check">
                    <Check size={18} color="white" strokeWidth={4} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer className="res-bottom-bar">
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={handleCancelClick}>Cancel</button>
          <button
            className="res-btn-view"
            disabled={selectedCard === null}
            onClick={() => navigate("/kiosk-selection")}
          >
            View Order
          </button>
        </div>
      </footer>

      {showCancelModal && (
        <div className="res-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="res-modal-card res-fade-in-scale" onClick={(e) => e.stopPropagation()}>
            <div className="res-modal-icon"><AlertCircle size={48} color="#ffcc00" /></div>
            <h2>Discard Order?</h2>
            <p>Your current selections will be cleared.</p>
            <div className="res-modal-actions">
              <button className="res-modal-btn-secondary" onClick={() => setShowCancelModal(false)}>No, Keep Ordering</button>
              <button className="res-modal-btn-primary" onClick={confirmCancel}>Yes, Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskReservationMenu;
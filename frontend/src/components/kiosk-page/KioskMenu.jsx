import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Flame, Wallet, Infinity as InfinityIcon, Pizza, Beef, Package,
  Check, Bell, ChevronUp, ChevronDown, AlertCircle
} from "lucide-react";
import "../../Style/KioskMenu.css";

const categoryIcons = {
  "Best Seller": <Flame />,
  "Budget Meals": <Wallet />,
  "Unlimited": <InfinityIcon />,
  "Pizzas": <Pizza />,
  "Burgers": <Beef />,
  "Bundle": <Package />,
};

// --- 1. ORGANIZE YOUR DATA BY CATEGORY ---
const menuData = {

  "Best Seller": [
    { id: "best-1", name: "Platter A", image: "/logo.png" },
  ],

  "Bundle": [
    { id: "spec-1", name: "Giant Nachos", image: "/logo.png" },
  ],

  "Budget Meals": [
    { id: "bud-1", name: "Chicken Solo", image: "/logo.png" },
  ],

  "Unlimited": [
    { id: "unli-1", name: "Bbq Wings", image: "/Menu/Chicken/BbqW - Edited.png" },
    { id: "unli-2", name: "Classic Wings", image: "/Menu/Chicken/ClassicW - Edited.png" },
    { id: "unli-3", name: "Garlic Mayo", image: "/Menu/Chicken/GarlicMayoW - Edited.png" },
    { id: "unli-4", name: "Hot & Spicy", image: "/Menu/Chicken/Hot&SpicyW - Edited.png" },
    { id: "unli-5", name: "Sisig Wings", image: "/Menu/Chicken/SisigW - Edited.png" },
    { id: "unli-6", name: "Sweet Chili", image: "/Menu/Chicken/SweetChiliW - Edited.png" },
    { id: "unli-7", name: "Teriyaki Wings", image: "/Menu/Chicken/TeriyakiW - Edited.png" },
  ],

  "Pizzas": [
    { id: "piz-1", name: "Pepperoni", image: "/logo.png" }, // Replace with actual paths
    { id: "piz-2", name: "Hawaiian", image: "/logo.png" },
  ],

  "Burgers": [
    { id: "burg-1", name: "Cheese Burger", image: "/logo.png" },
    { id: "burg-2", name: "Bacon Burger", image: "/logo.png" },
  ]
};

const KioskMenu = () => {
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Best Seller"); // Default to Unlimited
  const [selectedCard, setSelectedCard] = useState(null);

  const categories = Object.keys(menuData);

  // --- 2. LOGIC TO GET ITEMS BASED ON ACTIVE CATEGORY ---
  const currentItems = menuData[activeCategory] || [];

  const handleCardClick = (id) => {
    setSelectedCard(prev => prev === id ? null : id);
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSelectedCard(null); // Reset selection when changing category
  };

  const handleCancelClick = () => setShowCancelModal(true);
  const confirmCancel = () => navigate("/kiosk-selection");

  const steps = [
    { id: 1, label: "View Menu", completed: true },
    { id: 2, label: "Select Order", completed: true },
    { id: 3, label: "View Order", completed: false },
  ];

  return (
    <div className="kiosk-container">
      <nav className="step-indicator">
        {steps.map((step, index) => (
          <div key={step.id} className={`step-item ${step.completed ? "completed" : "pending"}`}>
            <div className="step-icon">
              {step.completed ? <Check size={16} strokeWidth={4} /> : <span>{step.id}</span>}
            </div>
            <div className="step-text"><span className="step-label">{step.label}</span></div>
            {index !== steps.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </nav>

      <div className="main-layout">
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
                  onClick={() => handleCategoryChange(cat)}
                >
                  <div className="cat-icon-placeholder">
                    {categoryIcons[cat] || <Star size={20} />}
                  </div>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
            <div className="scroll-arrow bottom"><ChevronDown size={20} /></div>
          </div>

          <button className="assist-btn" onClick={() => navigate("/kiosk-selection")}>
            <Bell size={18} fill="currentColor" />
            <span>Assist Me</span>
          </button>
        </aside>

        <main className="content-area">
          <div className="grid-container">
            {/* --- 3. MAP THE DYNAMIC ARRAY --- */}
            {currentItems.map((item) => (
              <div
                key={item.id}
                className={`food-card ${selectedCard === item.id ? "selected" : ""}`}
                onClick={() => handleCardClick(item.id)}
              >
                <div className="card-image-container">
                  <img src={item.image} alt={item.name} className="food-img" />
                </div>
                <div className="card-info">
                  <h4 className="food-label">{item.name}</h4>
                </div>

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

      <footer className="bottom-bar">
        <div className="action-btns">
          <button className="btn-cancel" onClick={handleCancelClick}>Cancel</button>
          <button
            className="btn-view"
            disabled={selectedCard === null}
            onClick={() => navigate("/kiosk-selection")}
          >
            View Order
          </button>
        </div>
      </footer>

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
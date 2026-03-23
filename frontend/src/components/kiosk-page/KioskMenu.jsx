import React, { useState } from 'react';
import { Check, Bell, ChevronUp, ChevronDown } from 'lucide-react';
import '../../Style/KioskMenu.css';

const KioskMenu = () => {
  const [activeCategory, setActiveCategory] = useState('Wings & More');
  const [selectedCard, setSelectedCard] = useState(1);

  const steps = [
    { id: 1, label: 'Select Order', completed: true },
    { id: 2, label: 'Select Order', completed: true },
    { id: 3, label: 'Payment', completed: false },
    { id: 4, label: 'Checkout', completed: false },
  ];

  const categories = [
    "What's Popular", "Wings & More", "Budget Meals", 
    "Pizzas", "Burgers", "Hangout Specials", "Example 1", "Example 2"
  ];

  const menuItems = Array.from({ length: 8 });

  return (
    <div className="kiosk-container">
      {/* --- TOP STEP INDICATOR --- */}
      <nav className="step-indicator">
        {steps.map((step, index) => (
          <div key={step.id} className={`step-item ${step.completed ? 'completed' : 'pending'}`}>
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
            <div className="scroll-arrow top"><ChevronUp size={20}/></div>
            <div className="cat-scroll-wrapper">
                {categories.map((cat) => (
                <button 
                    key={cat}
                    className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                >
                    <div className="cat-icon-placeholder" />
                    <span>{cat}</span>
                </button>
                ))}
            </div>
            <div className="scroll-arrow bottom"><ChevronDown size={20}/></div>
          </div>

          <button className="assist-btn">
            <Bell size={18} fill="currentColor" />
            <span>Assist Me</span>
          </button>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="content-area">
          <div className="grid-container">
            {menuItems.map((_, i) => (
              <div 
                key={i} 
                className={`food-card ${selectedCard === i ? 'selected' : ''}`}
                onClick={() => setSelectedCard(i)}
              >
                <div className="card-image-placeholder" />
                <div className="card-details">
                  <div className="skeleton-title" />
                  <div className="skeleton-price" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* --- BOTTOM BAR --- */}
      <footer className="bottom-bar">
        <div className="total-section">
          <span className="total-label">Total Price</span>
          <span className="total-value">0.00</span>
        </div>
        
        <div className="action-btns">
          <button className="btn-cancel">Cancel</button>
          <button className="btn-view">View Order</button>
        </div>
      </footer>
    </div>
  );
};

export default KioskMenu;
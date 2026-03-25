import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Wallet,
  Infinity as InfinityIcon,
  Pizza,
  Beef,
  Package,
  Check,
  Bell,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  PlusSquare,
  Star,
  CupSoda,
  Utensils,
  Soup,
  Salad
} from "lucide-react";
import "../../Style/KioskMenu.css";

const categoryIcons = {
  "Best Seller": <Flame />,
  "Budget Meals": <Wallet />,
  Unlimited: <InfinityIcon />,
  Pizzas: <Pizza />,
  Burgers: <Beef />,
  Bundle: <Package />,
  Extra: <PlusSquare />,
  "Rice Bowl Combo": <Soup />,
  Beverages: <CupSoda/>,
  "Side Dish": <Utensils/>,
  Pasta: <Salad/>
};

const menuData = {
  "Best Seller": [
    { id: "best-1", name: "Platter A", image: "/logo.png" }
  ],

  Bundle: [
    { id: "spec-1", name: "Family Bundle A", image: "/logo.png" },
    { id: "spec-2", name: "Family Bundle B", image: "/logo.png" },
    { id: "spec-3", name: "Family Bundle C", image: "/logo.png" },
    { id: "spec-4", name: "Family Bundle D", image: "/logo.png" },
    { id: "spec-5", name: "Hangout Bundle (8 Inches burger, 6pcs Chicken wings, Iced tea)", image: "/logo.png" },
    { id: "spec-6", name: "Hangout Bundle A (8 Inches burger, 9pcs Chicken wings, 1 Bundle Fries, 1 Pitcher of Juice)", image: "/logo.png" },
    { id: "spec-7", name: "Hangout Bundle B (8 Inches burger, 15pcs Chicken wings, 1 Bundle Fries, 1 Pitcher of Juice)", image: "/logo.png" },
    { id: "spec-8", name: "Barkada Meal (4 Mini burgers, 1 Bundle Fries, 1 Bundle Nachos)", image: "/logo.png"},
    { id: "spec-9", name: "Barkada Bundle (6 Mini burgers, 1 Bundle Fries, 1 Bundle Nachos, Iced Tea)", image:"/logo.png"},
    { id: "spec-10", name: "Burger Bundle (6 Mini burgers)", image: "/logo.png"},
    { id: "spec-11", name: "Fries Bundle", image:"/logo.png"},
    { id: "spec-12", name: "Nachos Bundle", image:"/logo.png"},
  ],

  "Budget Meals": [
    { id: "bud-1", name: "1PC Chicken Wing w/ Rice", image: "/logo.png" },
    { id: "bud-2", name: "2PCS Chicken Wings w/ Rice", image: "/logo.png"},
    { id: "bud-3", name: "Crispy Pork Sisig w/ Rice", image: "/logo.png"},
    { id: "bud-4", name: "Crispy Chicken Sisig w/ Rice", image: "/logo.png"}
  ],

  Unlimited: [
    { id: "unli-1", name: "Unli Rice, 6pcs Chicken Wings & 1 Drink", image: "/logo.png" },
    { id: "unli-2", name: "Unli Wings Rice & Juice", image: "/logo.png" },
    { id: "unli-3", name: "Unli All-in Chicken Wings, Pasta, Fries, Nachos & Juice", image: "/logo.png" },
  ],

  "Rice Bowl Combo": [
    { id: "bowl-1", name: "Tapa Bacon w/ EGG", image:"/logo.png"},
    { id: "bowl-2", name: "Ham Bacon w/ EGG", image:"/logo.png"},
    { id: "bowl-3", name: "Spam Bacon w/ EGG", image:"/logo.png"},
    { id: "bowl-4", name: "Tocino Tapa w/ EGG", image:"/logo.png"},
    { id: "bowl-5", name: "Bacon Tocino w/ EGG", image:"/logo.png"},
    { id: "bowl-6", name: "Tocino Spam w/ EGG", image:"/logo.png"},
  ],

  Pizzas: [
    { id: "piz-1", name: "Pepperoni", image: "/logo.png" },
    { id: "piz-2", name: "Hawaiian", image: "/logo.png" },
    { id: "piz-3", name: "Vegetarian", image: "/logo.png" },
    { id: "piz-4", name: "Bacon & Mushroom", image: "/logo.png" },
    { id: "piz-5", name: "Ham & Cheese", image: "/logo.png" },
    { id: "piz-6", name: "Overload", image: "/logo.png" },
    { id: "piz-7", name: "Cheesy Spinach", image: "/logo.png" },
    { id: "piz-8", name: "Mozarella (Pizza Burger)", image: "/logo.png" },
    { id: "piz-9", name: "Hawaiian (Pizza Burger)", image: "/logo.png" },
    { id: "piz-10", name: "Pepperoni (Pizza Burger)", image: "/logo.png" },
    { id: "piz-11", name: "Bacon & Mushroom (Pizza Burger)", image: "/logo.png" },
    { id: "piz-12", name: "Cheesy Spinach (Pizza Burger)", image: "/logo.png" },
    { id: "piz-13", name: "Premium 2 in 1 (Pizza Burger)", image: "/logo.png" },
    { id: "piz-14", name: "Premium 4 in 1 (Pizza Burger)", image: "/logo.png" }
  ],



  Burgers: [
    { id: "burg-1", name: "Regular Burgers (Single Patty, TLC, Mayo, Cheese Sauce, White Onion) ", image: "/logo.png" },
    { id: "burg-2", name: "Cheese Burger (Single Patty, TLC, Mayo, Cheese Sauce, Square Cheese, White Onion)", image: "/logo.png" },
    { id: "burg-3", name: "Double Patty (Double Patties, TLC, Mayo, Cheese Sauce, White Onion)", image: "/logo.png"},
    { id: "burg-4", name: "Special Burger (Double Patties, TLC, Ham, Bacon, Mayo, Cheese Sauce, White Onion)"},
    { id: "burg-5", name: "Monster Burger (4 Patties, TLC, Ham, Mayo, Cheese Sauce, White Onion)"},
    { id: "burg-6", name: "Tower Burger (5 Patties, TLC, Mayo, Cheese Sauce)"},
    { id: "burg-7", name: "8 Inches Giant Burger (Patties, TLC, Mayo, Cheese Sauce)"}

  ],

  Pasta: [
    { id: "pasta-1", name: "Creamy Spaghetti", image: "/logo.png"},
    { id: "pasta-2", name: "Spaghetti Bolognese", image: "/logo.png"},
    { id: "pasta-3", name: "Creamy Carbonara", image: "/logo.png"},
    { id: "pasta-4", name: "Chicken Pesto", image: "/logo.png"},
    { id: "pasta-5", name: "Lasagna Roll", image: "/logo.png"}
  ],

  Extra: [
    { id: "ex-1", name: "Rice", image:"/logo.png"},
  ],
  
  "Side Dish": [
    {id: "side-1", name: "Plain Fries (SOLO)", image: "/logo.png"},
    { id: "side-2", name: "Plain Fries (SOLO)", image:"/logo.png"},
    { id: "side-3", name: "Flavored Fries (Cheese, BBQ, Sweet & Sour)", image:"/logo.png"},
    { id: "side-5", name: "Nachos (SOLO)", image:"/logo.png"},
    { id: "side-7", name: "Nachos Overload", image:"/logo.png"},
    { id: "side-8", name: "Fish & Fries", image:"/logo.png"}
  ],

  Beverages: [
    {id: "bev-1", name: "Hot Tea", image: "/logo.png"},
  ]

};

const KioskMenu = () => {
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Best Seller"); 
  const [selectedCard, setSelectedCard] = useState(null);

  const categories = Object.keys(menuData);
  const currentItems = menuData[activeCategory] || [];

  const handleCardClick = (id) => {
    setSelectedCard((prev) => (prev === id ? null : id));
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSelectedCard(null); 
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
            onClick={() => navigate("/kiosk/order")}
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
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  PlusSquare, Drumstick, CupSoda, Check, Bell, 
  ChevronUp, ChevronDown, AlertCircle, Clock, Timer, Star 
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from './ReservationOrderModal';
import OrderSummary from './OrderSummary'; 

const categoryIcons = {
  "Chicken Wings": <Drumstick />,
  "Extra": <PlusSquare />,
  "Drinks": <CupSoda />
};

const menuData = {
  "Chicken Wings": [
    { id: "unli-1", name: "Bbq Wings", image: "/Menu/Chicken/BbqW - Edited.png", description: "Sweet and tangy BBQ glaze on crispy wings." },
    { id: "unli-2", name: "Classic Wings", image: "/Menu/Chicken/ClassicW - Edited.png", description: "Our signature original crispy fried wings." },
    { id: "unli-3", name: "Garlic Mayo", image: "/Menu/Chicken/GarlicMayoW - Edited.png", description: "Crispy wings tossed in creamy garlic mayo sauce." },
    { id: "unli-4", name: "Hot & Spicy", image: "/Menu/Chicken/Hot&SpicyW - Edited.png", description: "Wings with a spicy kick for those who love heat." },
    { id: "unli-5", name: "Sisig Wings", image: "/Menu/Chicken/SisigW - Edited.png", description: "Unique Filipino sisig-flavored crispy wings." },
    { id: "unli-6", name: "Sweet Chili", image: "/Menu/Chicken/SweetChiliW - Edited.png", description: "Glazed in a perfect balance of sweet and spicy." },
    { id: "unli-7", name: "Teriyaki Wings", image: "/Menu/Chicken/TeriyakiW - Edited.png", description: "Savory and sweet Japanese-style teriyaki glaze." },
  ],
  "Extra": [
    { id: "ex-1", name: "Rice", image: "/logo.png", description: "Extra serving of steamed white rice." },
    { id: "ex-2", name: "Fries", image: "/logo.png", description: "A side of crispy golden potato fries." }
  ],
  "Drinks": [
    { id: "dr-1", name: "Coke", image: "/logo.png", description: "Ice-cold 330ml soda." },
    { id: "dr-2", name: "Sprite", image: "/logo.png", description: "Refreshing lemon-lime soda." }
  ]
};

const KioskReservationMenu = () => {
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false); 
  const [activeCategory, setActiveCategory] = useState("Chicken Wings"); 
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);

  // --- TIMER STATE LOGIC ---
  const [timeLeft, setTimeLeft] = useState(5400); // 1:30:00 in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false); // New state to control start

  useEffect(() => {
    let timerInterval;

    if (isTimerRunning) {
      timerInterval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 0) {
            clearInterval(timerInterval);
            return 0;
          }
          // Notify at exactly 30 minutes (1800 seconds)
          if (prevTime === 1800) {
            setShowTimeModal(true);
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerInterval);
  }, [isTimerRunning]); // Only runs/reruns when isTimerRunning changes

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const categories = Object.keys(menuData);
  const currentItems = menuData[activeCategory] || [];

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    setSelectedCard(item.id);
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSelectedCard(null); 
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  const addToOrder = (itemWithQty) => {
    setCart((prevCart) => {
      const isExisting = prevCart.find((i) => i.id === itemWithQty.id);
      if (isExisting) {
        return prevCart.map((item) =>
          item.id === itemWithQty.id
            ? { ...item, quantity: item.quantity + itemWithQty.quantity }
            : item
        );
      }
      return [...prevCart, itemWithQty];
    });
    setSelectedCard(null);
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  // --- HANDLER FOR SEND REQUEST ---
  const handleSendRequest = () => {
    if (cart.length > 0) {
      // Start the timer
      setIsTimerRunning(true);
      // Optional: Logic to send order to backend here
      console.log("Request sent to kitchen, timer started.");
    }
  };

  const handleCancelClick = () => setShowCancelModal(true);
  const confirmCancel = () => navigate("/kiosk-selection");

  return (
    <div className="res-kiosk-container">
      <div className="kiosk-timer-wrapper">
        <div className="timer-box">
          <Clock size={20} color="#ffcc00" />
          <span className="timer-text">{formatTime(timeLeft)}</span>
          <span className="timer-label">
            {isTimerRunning ? "TIME REMAINING" : "TIMER READY"}
          </span>
        </div>
      </div>

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
                  <div className="res-cat-icon-placeholder">{categoryIcons[cat] || <Star size={20} />}</div>
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
                onClick={() => handleCardClick(item)}
              >
                <div className="res-card-image-container"><img src={item.image} alt={item.name} className="res-food-img" /></div>
                <div className="res-card-info"><h4 className="res-food-label">{item.name}</h4></div>
                {selectedCard === item.id && (
                  <div className="res-selected-check"><Check size={18} color="white" strokeWidth={4} /></div>
                )}
              </div>
            ))}
          </div>
        </main>

        <OrderSummary cart={cart} onRemoveItem={removeFromCart} />
      </div>

      <footer className="res-bottom-bar">
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={handleCancelClick}>Cancel</button>
          
          {/* UPDATED BUTTON: Label and Logic changed */}
          <button 
            className="res-btn-view" 
            disabled={cart.length === 0 || isTimerRunning} 
            onClick={handleSendRequest}
          >
            {isTimerRunning ? "Request Sent" : "Send Request"}
          </button>
        </div>
      </footer>

      <ReservationOrderModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        item={selectedItem} 
        onAdd={addToOrder} 
      />

      {showTimeModal && (
        <div className="res-modal-overlay">
          <div className="res-modal-card res-fade-in-scale">
            <div className="res-modal-icon"><Timer size={48} color="#ffcc00" /></div>
            <h2>Time Reminder</h2>
            <p>You have <strong>30 minutes</strong> left to finish your meal. Enjoy!</p>
            <div className="res-modal-actions">
              <button className="res-modal-btn-primary" onClick={() => setShowTimeModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

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
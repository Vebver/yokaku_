import React, { useState, useEffect, useRef } from "react"; // Added useRef
import { useNavigate } from "react-router-dom";
import {
  PlusSquare,
  Drumstick,
  CupSoda,
  Check,
  Bell,
  AlertCircle,
  Star,
  ShoppingBag,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  Flame,
  Wallet,
  Infinity as InfinityIcon,
  Pizza,
  Beef,
  Package,
  Utensils,
  Soup,
  Salad,
  Clock,
  User,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import PortalModal from "./PortalModal"; // Import the Portal component

const categoryIcons = {
  "Best Seller": <Flame />,
  "Budget Meals": <Wallet />,
  Unlimited: <InfinityIcon />,
  Pizzas: <Pizza />,
  Burgers: <Beef />,
  Bundle: <Package />,
  Extra: <PlusSquare />,
  "Rice Bowl Combo": <Soup />,
  Beverages: <CupSoda />,
  "Side Dish": <Utensils />,
  Pasta: <Salad />,
  "Chicken Wings": <Drumstick />,
};

const KioskMenu = () => {
  const navigate = useNavigate();
  const timerRef = useRef(null); // Added for strict timer control
  const TIMER_KEY = "kiosk_walkin_timer_end";

  // --- STATE ---
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);

  // Timer States (1:30:00 = 5400s)
  const [timeLeft, setTimeLeft] = useState(5400); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);

  // --- 1. NUCLEAR STOP (Kiosk Reset) ---
  const handleEndSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.clear(); // Clear all kiosk data
    setIsTimerRunning(false);
    setShowEndModal(false);
    window.location.href = "/kiosk-selection"; // Hard refresh to kill all JS memory
  };

  // --- 2. TIMER PERSISTENCE & TICK ---
  useEffect(() => {
    const savedEndTime = localStorage.getItem(TIMER_KEY);
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsTimerRunning(true);
      } else {
        handleEndSession();
      }
    }
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        const savedEndTime = localStorage.getItem(TIMER_KEY);
        if (!savedEndTime) {
          handleEndSession();
          return;
        }
        const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
        if (remaining <= 0) {
          handleEndSession();
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  // --- 3. FETCH MENU (Fixed Image Paths) ---
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/products");
        const data = await response.json();
        const grouped = data.reduce((acc, item) => {
          const cat = item.category_name || "General";
          if (!acc[cat]) acc[cat] = [];
          
          // Construct absolute URL for images
          const fullImage = item.image_url 
            ? (item.image_url.startsWith("http") 
                ? item.image_url 
                : `http://localhost:5000${item.image_url.startsWith('/') ? '' : '/'}${item.image_url}`)
            : "https://via.placeholder.com/150";

          acc[cat].push({
            id: item.item_id,
            name: item.name,
            image: fullImage,
            description: item.description,
            price: item.price,
            category: cat,
          });
          return acc;
        }, {});
        setMenuData(grouped);
        const keys = Object.keys(grouped);
        if (keys.length > 0) setActiveCategory(keys[0]);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const addToOrder = (itemWithQty) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === itemWithQty.id);
      if (exists) {
        return prev.map((i) => i.id === itemWithQty.id ? { ...i, quantity: i.quantity + itemWithQty.quantity } : i);
      }
      return [...prev, itemWithQty];
    });
  };

 const handlePlaceOrder = async () => {
    if (cart.length > 0) {
      try {
        // 1. Send the order to the backend
        const response = await fetch("http://localhost:5000/api/orders/place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reservation_id: "WALKIN", // Or your dynamic ID
            items: cart.map(item => ({
              item_id: item.id,
              quantity: item.quantity
            }))
          })
        });

        const result = await response.json();

        if (response.ok) {
          // 2. Start timer if it's the first order
          if (!localStorage.getItem(TIMER_KEY)) {
            const endTime = Date.now() + 5400 * 1000;
            localStorage.setItem(TIMER_KEY, endTime.toString());
            setIsTimerRunning(true);
          }
          
          // 3. Clear UI and show success
          setCart([]);
          setShowOrderSuccessModal(true);
        } else {
          alert("Error: " + result.error); // e.g., "Out of stock!"
        }
      } catch (error) {
        console.error("Order failed:", error);
        alert("Server error. Please try again.");
      }
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return "0:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return <div className="loading-container">Loading Kiosk Menu...</div>;

  return (
    <div className="res-kiosk-container">
      {/* 1. HEADER (Timer & ID) */}
      <div className="kiosk-timer-wrapper" style={{ zIndex: 5000 }}>
        <div className="header-id-section">
          <ShoppingBag size={20} color="#ffcc00" />
          <div className="id-details">
            <span className="id-label">MODE</span>
            <span className="id-value">WALK-IN GUEST</span>
          </div>
        </div>

        <div className="timer-box" style={{ pointerEvents: 'auto' }}>
          <Clock size={20} color="#ffcc00" />
          <span className="timer-text">{formatTime(timeLeft)}</span>
          {(isTimerRunning || localStorage.getItem(TIMER_KEY)) && (
            <button
              className="finish-session-header-btn"
              onPointerDown={() => setShowEndModal(true)} // onPointerDown for instant kiosk response
              style={{
                background: "#ffcc00",
                border: "none",
                color: "#000",
                padding: "5px 15px",
                borderRadius: "5px",
                marginLeft: "12px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              FINISH
            </button>
          )}
        </div>
        <div className="header-right-spacer"></div>
      </div>

      <div className="res-main-layout">
        <aside className="res-sidebar">
          <div className="res-brand"><h1>HANGOUT</h1><p>Resto Bar</p></div>
          <div className="res-category-list">
            <div className="res-cat-scroll-wrapper">
              {Object.keys(menuData).map((cat) => (
                <button
                  key={cat}
                  className={`res-cat-btn ${activeCategory === cat ? "res-active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  <div className="res-cat-icon-placeholder">{categoryIcons[cat] || <Star size={20} />}</div>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="res-assist-btn" onClick={() => (window.location.href = "/kiosk-selection")}><Bell size={18} /><span>Assist Me</span></button>
        </aside>

        <main className="res-content-area">
          <div className="res-grid-container">
            {(menuData[activeCategory] || []).map((item) => (
              <div
                key={item.id}
                className={`res-food-card ${selectedCard === item.id ? "res-selected" : ""}`}
                onClick={() => { setSelectedItem(item); setIsModalOpen(true); setSelectedCard(item.id); }}
              >
                <div className="res-card-image-container">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="res-food-img"
                    onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }}
                  />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>₱{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </main>

        <OrderSummary cart={cart} onRemoveItem={(id) => setCart(cart.filter((i) => i.id !== id))} />
      </div>

      <footer className="res-bottom-bar">
        <button className="res-btn-view-all" onClick={() => (window.location.href = "/kiosk-selection")}>Back</button>
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={() => setCart([])}>Clear Tray</button>
          <button className="res-btn-view" disabled={cart.length === 0} onClick={handlePlaceOrder}>Place Order</button>
        </div>
      </footer>

      {/* --- PORTAL MODAL (Attached to document.body) --- */}
      <PortalModal 
        isOpen={showEndModal} 
        onClose={() => setShowEndModal(false)} 
        onConfirm={handleEndSession} 
      />

      {/* Item Details Modal */}
      {isModalOpen && (
        <ReservationOrderModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedCard(null); }}
          item={selectedItem}
          onAdd={addToOrder}
        />
      )}

      {/* Success Overlay */}
      {showOrderSuccessModal && (
        <div className="res-modal-overlay" style={{ zIndex: 100000, display: 'flex' }} onClick={() => setShowOrderSuccessModal(false)}>
          <div className="res-modal-card res-fade-in-scale" style={{ textAlign: "center" }}>
            <CheckCircle size={60} color="#ffcc00" style={{ margin: "0 auto 20px" }} />
            <h2 style={{ color: "#ffcc00" }}>Order Sent!</h2>
            <button className="res-modal-btn-primary" onClick={() => setShowOrderSuccessModal(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskMenu;
import React, { useState, useEffect } from "react";
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
  const TIMER_KEY = "kiosk_walkin_timer_end";

  // --- STATE ---
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);

  // Timer States
  const [timeLeft, setTimeLeft] = useState(5400); // 1:30:00
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);

  // --- 1. TIMER PERSISTENCE ---
  useEffect(() => {
    const savedEndTime = localStorage.getItem(TIMER_KEY);
    if (savedEndTime) {
      const remaining = Math.floor(
        (parseInt(savedEndTime) - Date.now()) / 1000,
      );
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsTimerRunning(true);
      } else {
        handleEndSession();
      }
    }
  }, []);

  // --- 2. TIMER TICK ---
  useEffect(() => {
    let timerInterval;
    if (isTimerRunning) {
      timerInterval = setInterval(() => {
        const savedEndTime = localStorage.getItem(TIMER_KEY);
        if (savedEndTime) {
          const remaining = Math.floor(
            (parseInt(savedEndTime) - Date.now()) / 1000,
          );
          if (remaining <= 0) {
            handleEndSession();
            clearInterval(timerInterval);
          } else {
            setTimeLeft(remaining);
          }
        }
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [isTimerRunning]);

  // --- 3. FETCH MENU ---
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/products");
        const data = await response.json();
        const grouped = data.reduce((acc, item) => {
          const cat = item.category_name || "General";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push({
            id: item.item_id,
            name: item.name,
            image: item.image_url?.startsWith("http")
              ? item.image_url
              : `/Menu/Images/${item.image_url}`,
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

  // --- 4. ADD TO ORDER ---
  const addToOrder = (itemWithQty) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === itemWithQty.id);
      if (exists) {
        return prev.map((i) =>
          i.id === itemWithQty.id
            ? { ...i, quantity: i.quantity + itemWithQty.quantity }
            : i,
        );
      }
      return [...prev, itemWithQty];
    });
  };

  const handlePlaceOrder = () => {
    if (cart.length > 0) {
      if (!localStorage.getItem(TIMER_KEY)) {
        const endTimee = Date.now() + 5400 * 1000;
        localStorage.setItem(TIMER_KEY, endTimee.toString());
        setIsTimerRunning(true);
      }

      setCart([]);
      setShowOrderSuccessModal(true);
    }
  };

  const handleEndSession = () => {
    localStorage.removeItem(TIMER_KEY);
    setCart([]);
    setIsTimerRunning(false);
    setShowEndModal(false);
    navigate("/kiosk-selection");
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return <div className="loading-container">Loading...</div>;

  return (
    <div className="res-kiosk-container">
      {/* 1. HEADER (Timer & ID) */}
      <div className="kiosk-timer-wrapper">
        <div className="header-id-section">
          <ShoppingBag size={20} color="#ffcc00" />
          <div className="id-details">
            <span className="id-label">MODE</span>
            <span className="id-value">WALK-IN GUEST</span>
          </div>
        </div>

        <div className="timer-box">
          <Clock size={20} color="#ffcc00" />
          <span className="timer-text">{formatTime(timeLeft)}</span>
          {isTimerRunning && (
            <button
              className="finish-session-header-btn"
              onClick={() => setShowEndModal(true)}
              style={{
                background: "none",
                border: "1px solid #ffcc00",
                color: "#ffcc00",
                padding: "2px 10px",
                borderRadius: "5px",
                marginLeft: "12px",
                fontSize: "0.75rem",
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
        {/* 2. SIDEBAR */}
        <aside className="res-sidebar">
          <div className="res-brand">
            <h1>HANGOUT</h1>
            <p>Resto Bar</p>
          </div>
          <div className="res-category-list">
            <div className="res-cat-scroll-wrapper">
              {Object.keys(menuData).map((cat) => (
                <button
                  key={cat}
                  className={`res-cat-btn ${activeCategory === cat ? "res-active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  <div className="res-cat-icon-placeholder">
                    {categoryIcons[cat] || <Star size={20} />}
                  </div>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            className="res-assist-btn"
            onClick={() => navigate("/kiosk-selection")}
          >
            <Bell size={18} />
            <span>Assist Me</span>
          </button>
        </aside>

        {/* 3. GRID */}
        <main className="res-content-area">
          <div className="res-grid-container">
            {(menuData[activeCategory] || []).map((item) => (
              <div
                key={item.id}
                className={`res-food-card ${selectedCard === item.id ? "res-selected" : ""}`}
                onClick={() => {
                  setSelectedItem(item);
                  setIsModalOpen(true);
                  setSelectedCard(item.id);
                }}
              >
                <div className="res-card-image-container">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="res-food-img"
                  />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>
                    ₱{item.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* 4. SUMMARY */}
        <OrderSummary
          cart={cart}
          onRemoveItem={(id) => setCart(cart.filter((i) => i.id !== id))}
        />
      </div>

      {/* 5. FOOTER */}
      <footer className="res-bottom-bar">
        {" "}
        <button
          className="res-btn-view-all"
          onClick={() => navigate("/kiosk-selection")}
        >
          Back
        </button>
        <div className="res-action-btns">
          <button
            className="res-btn-cancel"
            onClick={() => setShowCancelModal(true)}
          >
            Clear Tray
          </button>
          <button
            className="res-btn-view"
            disabled={cart.length === 0}
            onClick={handlePlaceOrder}
          >
            Place Order
          </button>
        </div>
      </footer>

      {/* MODAL COMPONENTS */}
      <ReservationOrderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
        item={selectedItem}
        onAdd={addToOrder}
      />

      {/* End Session Confirmation */}
      {showEndModal && (
        <div
          className="res-modal-overlay"
          onClick={() => setShowEndModal(false)}
        >
          <div
            className="res-modal-card res-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: "center" }}
          >
            <CheckCircle
              size={48}
              color="#ffcc00"
              style={{ margin: "0 auto 10px" }}
            />
            <h2 style={{ color: "#ffcc00" }}>Finish Eating?</h2>
            <p style={{ color: "white" }}>
              This will clear your timer and close the session.
            </p>
            <div className="res-modal-actions">
              <button
                className="res-modal-btn-secondary"
                onClick={() => setShowEndModal(false)}
              >
                Stay
              </button>
              <button
                className="res-modal-btn-primary"
                onClick={handleEndSession}
              >
                Yes, I'm Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showOrderSuccessModal && (
        <div
          className="res-modal-overlay"
          onClick={() => setShowOrderSuccessModal(false)}
        >
          <div
            className="res-modal-card res-fade-in-scale"
            style={{ textAlign: "center" }}
          >
            <CheckCircle
              size={60}
              color="#ffcc00"
              style={{ margin: "0 auto 20px" }}
            />
            <h2 style={{ color: "#ffcc00" }}>Order Sent!</h2>
            <button
              className="res-modal-btn-primary"
              onClick={() => setShowOrderSuccessModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskMenu;

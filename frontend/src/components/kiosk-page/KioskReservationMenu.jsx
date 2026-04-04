import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare,
  Drumstick,
  CupSoda,
  Check,
  Bell,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Clock,
  Timer,
  Star,
  User,
  CheckCircle,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";

const categoryIcons = {
  "Chicken Wings": <Drumstick />,
  Extra: <PlusSquare />,
  Drinks: <CupSoda />,
};

const menuData = {
  "Chicken Wings": [
    {
      id: "unli-1",
      name: "Bbq Wings",
      image: "/Menu/Chicken/BbqW - Edited.png",
      description: "Sweet and tangy BBQ glaze on crispy wings.",
    },
    {
      id: "unli-2",
      name: "Classic Wings",
      image: "/Menu/Chicken/ClassicW - Edited.png",
      description: "Our signature original crispy fried wings.",
    },
    {
      id: "unli-3",
      name: "Garlic Mayo",
      image: "/Menu/Chicken/GarlicMayoW - Edited.png",
      description: "Crispy wings tossed in creamy garlic mayo sauce.",
    },
    {
      id: "unli-4",
      name: "Hot & Spicy",
      image: "/Menu/Chicken/Hot&SpicyW - Edited.png",
      description: "Wings with a spicy kick for those who love heat.",
    },
    {
      id: "unli-5",
      name: "Sisig Wings",
      image: "/Menu/Chicken/SisigW - Edited.png",
      description: "Unique Filipino sisig-flavored crispy wings.",
    },
    {
      id: "unli-6",
      name: "Sweet Chili",
      image: "/Menu/Chicken/SweetChiliW - Edited.png",
      description: "Glazed in a perfect balance of sweet and spicy.",
    },
    {
      id: "unli-7",
      name: "Teriyaki Wings",
      image: "/Menu/Chicken/TeriyakiW - Edited.png",
      description: "Savory and sweet Japanese-style teriyaki glaze.",
    },
  ],
  Extra: [
    {
      id: "ex-1",
      name: "Rice",
      image: "/logo.png",
      description: "Extra serving of steamed white rice.",
    },
    {
      id: "ex-2",
      name: "Fries",
      image: "/logo.png",
      description: "A side of crispy golden potato fries.",
    },
  ],
  Drinks: [
    {
      id: "dr-1",
      name: "Coke",
      image: "/logo.png",
      description: "Ice-cold 330ml soda.",
    },
    {
      id: "dr-2",
      name: "Sprite",
      image: "/logo.png",
      description: "Refreshing lemon-lime soda.",
    },
  ],
};

const KioskReservationMenu = () => {
  const navigate = useNavigate();
  const reservationId = localStorage.getItem("resId") || "GUEST";
  const TIMER_SESSION_KEY = `kiosk_timer_end_${reservationId}`;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Chicken Wings");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [timeLeft, setTimeLeft] = useState(5400);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Timer persistence logic
  useEffect(() => {
    const savedEndTime = localStorage.getItem(TIMER_SESSION_KEY);
    if (savedEndTime) {
      const remaining = Math.floor(
        (parseInt(savedEndTime) - Date.now()) / 1000,
      );
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsTimerRunning(true);
      }
    }
  }, [TIMER_SESSION_KEY]);

  useEffect(() => {
    let timerInterval;
    if (isTimerRunning) {
      timerInterval = setInterval(() => {
        const savedEndTime = localStorage.getItem(TIMER_SESSION_KEY);
        if (savedEndTime) {
          const remaining = Math.floor(
            (parseInt(savedEndTime) - Date.now()) / 1000,
          );
          if (remaining <= 0) {
            setTimeLeft(0);
            clearInterval(timerInterval);
          } else {
            setTimeLeft(remaining);
            if (remaining === 1800) setShowTimeModal(true);
          }
        }
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [isTimerRunning, TIMER_SESSION_KEY]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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

  const addToOrder = (itemWithQty) => {
    const currentTotalWings = cart
      .filter((i) => i.id.startsWith("unli"))
      .reduce((sum, i) => sum + i.quantity, 0);
    if (
      itemWithQty.id.startsWith("unli") &&
      currentTotalWings + itemWithQty.quantity > 24
    ) {
      alert("Maximum 24 wings allowed.");
      return;
    }

    setCart((prev) => {
      const isExisting = prev.find((i) => i.id === itemWithQty.id);
      if (isExisting) {
        return prev.map((i) =>
          i.id === itemWithQty.id
            ? { ...i, quantity: i.quantity + itemWithQty.quantity }
            : i,
        );
      }
      return [...prev, itemWithQty];
    });
    setSelectedCard(null);
  };

  const handleSendRequest = () => {
    if (cart.length > 0) {
      if (!localStorage.getItem(TIMER_SESSION_KEY)) {
        const endTime = Date.now() + 5400 * 1000;
        localStorage.setItem(TIMER_SESSION_KEY, endTime.toString());
      }
      setIsTimerRunning(true);
      setCart([]);
      setShowOrderSuccessModal(true);
    }
  };

  // --- ADDED FUNCTIONALITY: CONFIRM CANCEL ---
  const confirmCancel = () => {
    localStorage.removeItem("resId");
    localStorage.removeItem(TIMER_SESSION_KEY);
    setCart([]);
    setShowCancelModal(false);
    navigate("/kiosk-selection");
  };

  return (
    <div className="res-kiosk-container">
      {/* HEADER */}
      <div className="kiosk-timer-wrapper">
        <div className="header-id-section">
          <User size={20} color="#ffcc00" />
          <div className="id-details">
            <span className="id-label">RESERVATION ID</span>
            <span className="id-value">{reservationId}</span>
          </div>
        </div>
        <div className="timer-box">
          <Clock size={20} color="#ffcc00" />
          <span className="timer-text">{formatTime(timeLeft)}</span>
          <span className="timer-label">
            {isTimerRunning ? "TIME REMAINING" : "TIMER READY"}
          </span>
        </div>
        <div className="header-right-spacer"></div>
      </div>

      <div className="res-main-layout">
        <aside className="res-sidebar">
          <div className="res-brand">
            <h1>HANGOUT</h1>
            <p>Resto Bar</p>
          </div>
          <div className="res-category-list">
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
          </div>
          <button
            className="res-assist-btn"
            onClick={() => navigate("/kiosk-selection")}
          >
            <Bell size={18} />
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
                <div className="res-card-image-container">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="res-food-img"
                  />
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

        <OrderSummary
          cart={cart}
          onRemoveItem={(id) => setCart(cart.filter((i) => i.id !== id))}
        />
      </div>

      {/* FOOTER */}
      <footer className="res-bottom-bar" style={{ zIndex: 100 }}>
        <button
          className="res-btn-view-all"
          onClick={() => navigate("/kiosk-selection/kiosk-menu")}
        >
          View All Menu
        </button>
        <div className="res-action-btns">
          <button
            className="res-btn-cancel"
            onClick={() => setShowCancelModal(true)}
          >
            Cancel
          </button>
          <button className="res-btn-view" onClick={handleSendRequest}>
            {isTimerRunning ? "Send Request Again" : "Send Request"}
          </button>
        </div>
      </footer>

      {/* MODALS */}
      {isModalOpen && (
        <ReservationOrderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCard(null);
          }}
          item={selectedItem}
          onAdd={addToOrder}
        />
      )}

      {/* ADDED: CANCEL MODAL */}
      {showCancelModal && (
        <div
          className="res-modal-overlay"
          style={{
            display: "flex",
            position: "fixed",
            zIndex: 999999,
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            className="res-modal-card"
            style={{
              backgroundColor: "#1a1a1a",
              padding: "40px",
              borderRadius: "30px",
              border: "1px solid #333",
            }}
          >
            <AlertCircle
              size={48}
              color="#ffcc00"
              style={{ marginBottom: "10px" }}
            />
            <h2 style={{ color: "#ffcc00" }}>Discard Order?</h2>
            <p style={{ color: "white", margin: "10px 0" }}>
              Your current selections will be cleared.
            </p>
            <div
              className="res-modal-actions"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                className="res-modal-btn-secondary"
                onClick={() => setShowCancelModal(false)}
              >
                No
              </button>
              <button className="res-modal-btn-primary" onClick={confirmCancel}>
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrderSuccessModal && (
        <div
          className="res-modal-overlay"
          style={{
            display: "flex",
            position: "fixed",
            zIndex: 999999,
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            className="res-modal-card"
            style={{
              backgroundColor: "#1a1a1a",
              textAlign: "center",
              padding: "40px",
              borderRadius: "30px",
            }}
          >
            <CheckCircle
              size={60}
              color="#ffcc00"
              style={{ marginBottom: "20px" }}
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

export default KioskReservationMenu;

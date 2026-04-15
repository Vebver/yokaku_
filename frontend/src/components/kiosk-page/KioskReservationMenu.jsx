import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare, Drumstick, CupSoda, Check, Bell, 
  AlertCircle, Clock, Star, User, CheckCircle,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import { io } from "socket.io-client";
import PortalModal from "./PortalModal";

let socket;

const categoryIcons = {
  "Chicken Wings": <Drumstick />,
  Extra: <PlusSquare />,
  Drinks: <CupSoda />,
};

const KioskReservationMenu = () => {
  const timerRef = useRef(null);
  const reservationId = localStorage.getItem("resId") || "GUEST";
  const TIMER_SESSION_KEY = `kiosk_timer_end_${reservationId}`;

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setOrderCart] = useState([]);

  // 1 Hour 30 Minutes = 5400 Seconds
  const [timeLeft, setTimeLeft] = useState(5400); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const stopAndClearEverything = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.clear(); 
    window.location.href = "/kiosk-selection"; 
  };

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        const savedEndTime = localStorage.getItem(TIMER_SESSION_KEY);
        if (!savedEndTime) {
          stopAndClearEverything();
          return;
        }
        const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
        if (remaining <= 0) {
          stopAndClearEverything();
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  useEffect(() => {
    socket = io("http://localhost:5000");

    const savedEndTime = localStorage.getItem(TIMER_SESSION_KEY);
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsTimerRunning(true);
      }
    } else {
        setTimeLeft(5400); // Default UI display
    }

    fetch("http://localhost:5000/api/products")
      .then(res => res.json())
      .then(data => {
        const grouped = data.reduce((acc, item) => {
          const cat = item.category_name || "Uncategorized";
          if (!acc[cat]) acc[cat] = [];
          const img = item.image_url || "";
          const finalImg = img.startsWith("http") ? img : `http://localhost:5000${img.startsWith("/") ? "" : "/"}${img}`;
          acc[cat].push({ id: item.item_id, name: item.name, image: finalImg });
          return acc;
        }, {});
        setMenuData(grouped);
        const cats = Object.keys(grouped);
        if (cats.length > 0) setActiveCategory(cats[0]);
        setLoading(false);
      });

    return () => { if (socket) socket.disconnect(); };
  }, []);

  const formatTime = (seconds) => {
    if (seconds <= 0) return "0:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSendRequest = () => {
    if (cart.length > 0) {
      socket.emit("send_order", { table: reservationId, items: cart.map(i => ({ name: i.name, qty: i.quantity })) });
      if (!localStorage.getItem(TIMER_SESSION_KEY)) {
        const endTime = (Date.now() + 5400 * 1000).toString();
        localStorage.setItem(TIMER_SESSION_KEY, endTime);
        setIsTimerRunning(true);
      }
      setOrderCart([]);
    }
  };

  if (loading) return <div className="loading-container">Loading Kiosk...</div>;

  return (
    <div className="res-kiosk-container" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      <header className="kiosk-timer-wrapper" style={{ 
        position: 'absolute', top: 0, left: 0, width: '100%', height: '80px', 
        zIndex: 5000, display: 'flex', alignItems: 'center', pointerEvents: 'auto' 
      }}>
        <div className="header-id-section">
          <User size={20} color="#ffcc00" />
          <div className="id-details">
            <span className="id-label">RESERVATION ID</span>
            <span className="id-value">{reservationId}</span>
          </div>
        </div>

        <div className="timer-box" style={{ margin: '0 auto', pointerEvents: 'auto' }}>
          <Clock size={20} color="#ffcc00" />
          <span className="timer-text">{formatTime(timeLeft)}</span>
          <button 
            className="finish-session-header-btn"
            onPointerDown={() => setShowEndModal(true)} 
            style={{ 
                background: "#ffcc00", color: "#000", border: 'none', 
                padding: "8px 20px", borderRadius: '8px', fontWeight: "900", 
                cursor: "pointer", position: 'relative', zIndex: 6000 
            }}
          >
            FINISH
          </button>
        </div>
        <div className="header-right-spacer"></div>
      </header>

      <div className="res-main-layout" style={{ display: 'flex', height: '100vh', paddingTop: '80px' }}>
        <aside className="res-sidebar">
          <div className="res-brand"><h1>HANGOUT</h1><p>Resto Bar</p></div>
          <div className="res-category-list">
            <div className="res-cat-scroll-wrapper">
              {Object.keys(menuData).map((cat) => (
                <button key={cat} className={`res-cat-btn ${activeCategory === cat ? "res-active" : ""}`} onClick={() => setActiveCategory(cat)}>
                   <div className="res-cat-icon-placeholder">{categoryIcons[cat] || <Star size={20} />}</div>
                   <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="res-content-area" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="res-grid-container">
            {menuData[activeCategory]?.map((item) => (
              <div key={item.id} className="res-food-card" onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}>
                <div className="res-card-image-container">
                    <img src={item.image} alt={item.name} className="res-food-img" onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }} />
                </div>
                <div className="res-card-info"><h4 className="res-food-label">{item.name}</h4></div>
              </div>
            ))}
          </div>
        </main>
        
        <OrderSummary cart={cart} onRemoveItem={(id) => setOrderCart(cart.filter(i => i.id !== id))} />
      </div>

      <footer className="res-bottom-bar" style={{ zIndex: 4000 }}>
        <button className="res-btn-view-all" onClick={() => (window.location.href = "/kiosk-selection")}>Back</button>
        <div className="res-action-btns">
          <button className="res-btn-view" onClick={handleSendRequest} style={{ background: '#ffcc00' }}>Send Request</button>
        </div>
      </footer>

      {/* PORTAL MODAL - This will always be on top */}
      <PortalModal 
        isOpen={showEndModal} 
        onClose={() => setShowEndModal(false)} 
        onConfirm={stopAndClearEverything} 
      />

      {isModalOpen && <ReservationOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selectedItem} onAdd={(item) => setOrderCart([...cart, item])} />}
    </div>
  );
};

export default KioskReservationMenu;
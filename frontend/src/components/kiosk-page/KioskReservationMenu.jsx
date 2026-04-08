import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare,
  Drumstick,
  CupSoda,
  Check,
  Bell,
  AlertCircle,
  Clock,
  Star,
  User,
  CheckCircle,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";

const categoryIcons = {
  "Chicken Wings": <Drumstick />,
  "Extra": <PlusSquare />,
  "Drinks": <CupSoda />,
};

const KioskReservationMenu = () => {
  const navigate = useNavigate();
  const reservationId = localStorage.getItem("resId") || "GUEST";
  const TIMER_SESSION_KEY = `kiosk_timer_end_${reservationId}`;
  
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [timeLeft, setTimeLeft] = useState(5400);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Timer logic
  useEffect(() => {
    const savedEndTime = localStorage.getItem(TIMER_SESSION_KEY);
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsTimerRunning(true);
      } else {
        handleEndSession(); 
      }
    }
  }, [TIMER_SESSION_KEY]);

  useEffect(() => {
    let timerInterval;
    if (isTimerRunning) {
      timerInterval = setInterval(() => {
        const savedEndTime = localStorage.getItem(TIMER_SESSION_KEY);
        if (savedEndTime) {
          const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
          if (remaining <= 0) {
            handleEndSession();
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

  // Fetch menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/products");
        const data = await response.json();
        const groupedMenu = data.reduce((acc, item) => {
          const category = item.category_name || "Uncategorized";
          if (!acc[category]) acc[category] = [];
          
          const rawImage = item.image_url || "";
          const finalImage = rawImage.startsWith("http") ? rawImage : `/Menu/Images/${rawImage}`;

          acc[category].push({
            id: item.item_id,
            name: item.name,
            image: finalImage,
            description: item.description,
            category: category,
          });
          return acc;
        }, {});

        setMenuData(groupedMenu);
        const cats = Object.keys(groupedMenu);
        if (cats.length > 0) setActiveCategory(cats[0]);
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleEndSession = () => {
    localStorage.removeItem("resId");
    localStorage.removeItem(TIMER_SESSION_KEY);
    setCart([]);
    setShowEndModal(false);
    navigate("/kiosk-selection");
  };

  const addToOrder = (itemWithQty) => {
    const currentTotalWings = cart
      .filter((i) => i.category === "Chicken Wings")
      .reduce((sum, i) => sum + i.quantity, 0);

    if (itemWithQty.category === "Chicken Wings" && currentTotalWings + itemWithQty.quantity > 24) {
      alert("Maximum 24 wings allowed.");
      return;
    }

    setCart((prev) => {
      const isExisting = prev.find((i) => i.id === itemWithQty.id);
      if (isExisting) {
        return prev.map((i) => i.id === itemWithQty.id ? { ...i, quantity: i.quantity + itemWithQty.quantity } : i);
      }
      return [...prev, itemWithQty];
    });
  };

  const handleSendRequest = () => {
    if (cart.length > 0) {
      if (!localStorage.getItem(TIMER_SESSION_KEY)) {
        localStorage.setItem(TIMER_SESSION_KEY, (Date.now() + 5400 * 1000).toString());
      }
      setIsTimerRunning(true);
      setCart([]);
      setShowOrderSuccessModal(true);
    }
  };

  if (loading) return <div className="loading-container">Loading Menu...</div>;

  const categories = Object.keys(menuData);
  const currentItems = menuData[activeCategory] || [];

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
          {isTimerRunning && (
            <button 
              className="finish-session-header-btn"
              onClick={() => setShowEndModal(true)}
              style={{ background: 'none', border: '1px solid #ffcc00', color: '#ffcc00', padding: '2px 8px', borderRadius: '5px', marginLeft: '10px', fontSize: '0.7rem', cursor: 'pointer' }}
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
              {categories.map((cat) => (
                <button key={cat} className={`res-cat-btn ${activeCategory === cat ? "res-active" : ""}`} onClick={() => setActiveCategory(cat)}>
                  <div className="res-cat-icon-placeholder">{categoryIcons[cat] || <Star size={20} />}</div>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="res-assist-btn" onClick={() => navigate("/kiosk-selection")}><Bell size={18} /><span>Assist Me</span></button>
        </aside>

        <main className="res-content-area">
          <div className="res-grid-container">
            {currentItems.map((item) => (
              <div key={item.id} className={`res-food-card ${selectedCard === item.id ? "res-selected" : ""}`} onClick={() => { setSelectedItem(item); setIsModalOpen(true); setSelectedCard(item.id); }}>
                <div className="res-card-image-container"><img src={item.image} alt={item.name} className="res-food-img" /></div>
                <div className="res-card-info"><h4 className="res-food-label">{item.name}</h4></div>
                {selectedCard === item.id && <div className="res-selected-check"><Check size={18} color="white" strokeWidth={4} /></div>}
              </div>
            ))}
          </div>
        </main>
        <OrderSummary cart={cart} onRemoveItem={(id) => setCart(cart.filter((i) => i.id !== id))} />
      </div>

      {/* FOOTER */}
      <footer className="res-bottom-bar" style={{ zIndex: 100 }}>
        <button className="res-btn-view-all" onClick={() => navigate("/kiosk-selection")}>Back</button>
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={() => setShowCancelModal(true)}>Cancel Order</button>
          <button className="res-btn-view" onClick={handleSendRequest}>{isTimerRunning ? "Send Request Again" : "Send Request"}</button>
        </div>
      </footer>

      {/* MODALS */}
      {isModalOpen && (
        <ReservationOrderModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setSelectedCard(null); }} 
          item={selectedItem} 
          onAdd={addToOrder} 
          timeLeft={timeLeft}
        />
      )}

      {/* END SESSION MODAL */}
      {showEndModal && (
        <div className="res-modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 999999, top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <div className="res-modal-card" style={{ backgroundColor: '#1a1a1a', padding: '40px', borderRadius: '30px', border: '1px solid #333', textAlign: 'center' }}>
            <CheckCircle size={48} color="#ffcc00" style={{ marginBottom: '10px' }} />
            <h2 style={{ color: '#ffcc00' }}>Finish Session?</h2>
            <p style={{ color: 'white', margin: '10px 0' }}>Are you sure you want to end your reservation?</p>
            <div className="res-modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button className="res-modal-btn-primary" onClick={handleEndSession}>Yes, I'm Finished</button>
              <button className="res-modal-btn-secondary" onClick={() => setShowEndModal(false)}>Stay and Order More</button>
            </div>
          </div>
        </div>
      )}

      {/* DISCARD/CANCEL MODAL */}
      {showCancelModal && (
        <div className="res-modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 999999, top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <div className="res-modal-card" style={{ backgroundColor: '#1a1a1a', padding: '40px', borderRadius: '30px', border: '1px solid #333' }}>
            <AlertCircle size={48} color="#ffcc00" style={{ marginBottom: '10px' }} />
            <h2 style={{ color: '#ffcc00' }}>Discard Order?</h2>
            <p style={{ color: 'white', margin: '10px 0' }}>Your current selections will be cleared.</p>
            <div className="res-modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button className="res-modal-btn-secondary" onClick={() => setShowCancelModal(false)}>No</button>
              <button className="res-modal-btn-primary" onClick={() => { setCart([]); setShowCancelModal(false); }}>Yes, Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showOrderSuccessModal && (
        <div className="res-modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 999999, top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <div className="res-modal-card" style={{ backgroundColor: '#1a1a1a', textAlign: 'center', padding: '40px', borderRadius: '30px' }}>
            <CheckCircle size={60} color="#ffcc00" style={{ marginBottom: '20px' }} /><h2 style={{ color: '#ffcc00' }}>Order Sent!</h2>
            <button className="res-modal-btn-primary" onClick={() => setShowOrderSuccessModal(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskReservationMenu;
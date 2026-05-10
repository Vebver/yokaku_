import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare, Drumstick, CupSoda, Check, Bell, AlertCircle, Clock, 
  Star, User, CheckCircle, PackageSearch,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import { io } from "socket.io-client";
import PortalModal from "./PortalModal";
import alertMusicFile from "../../assets/alert-sound.mp3";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let socket;

const categoryIcons = {
  "My Reserved Items": <PackageSearch color="#ffcc00" />,
  "Chicken Wings": <Drumstick />,
  Extra: <PlusSquare />,
  Drinks: <CupSoda />,
};

const KioskReservationMenu = () => {
  const timerRef = useRef(null);
  const reservationId = localStorage.getItem("resId") || "GUEST";
  const TIMER_SESSION_KEY = `kiosk_timer_end_${reservationId}`;
  const OFFLINE_QUEUE_KEY = "kiosk_res_offline_orders";

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setOrderCart] = useState([]);
  const [allProductsLookup, setAllProductsLookup] = useState({});
  const [timeLeft, setTimeLeft] = useState(5400);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const audioRef = useRef(new Audio(alertMusicFile));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- MONITOR ONLINE STATUS ---
  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) syncOfflineOrders();
    };
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  // --- SYNC QUEUED ORDERS ---
  const syncOfflineOrders = async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    if (queue.length === 0) return;

    for (const order of queue) {
      try {
        await axios.post(`${API_BASE}/orders/place`, order);
      } catch (err) { console.error("Sync failed", err); }
    }
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    alert("Reconnected: Orders synced with Kitchen.");
  };

  const stopAndClearEverything = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.clear();
    window.location.href = "/kiosk-selection";
  };

  const unlockAudio = () => {
    audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }).catch(() => {});
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        const savedEndTime = localStorage.getItem(TIMER_SESSION_KEY);
        if (!savedEndTime) { stopAndClearEverything(); return; }
        
        const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
        
        // 30 MINUTE ALERT
        if (remaining === 1800) { 
            audioRef.current.currentTime = 0; 
            audioRef.current.play().catch(e => console.log("Audio blocked"));
        }

        if (remaining <= 0) stopAndClearEverything();
        else setTimeLeft(remaining);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  // --- DATA FETCHING ---
  useEffect(() => {
    socket = io(SOCKET_URL);

    const fetchData = async () => {
      try {
        const prodRes = await fetch(`${API_BASE}/products`);
        const allProducts = await prodRes.json();
        const resItemsRes = await fetch(`${API_BASE}/orders/reservation-items/${reservationId}`);
        const reservedItems = await resItemsRes.json();

        localStorage.setItem("kiosk_res_cached_menu", JSON.stringify({ allProducts, reservedItems }));
        processMenu(allProducts, reservedItems);
      } catch (err) {
        const cached = localStorage.getItem("kiosk_res_cached_menu");
        if (cached) {
          const { allProducts, reservedItems } = JSON.parse(cached);
          processMenu(allProducts, reservedItems);
        }
      } finally { setLoading(false); }
    };

    const processMenu = (allProducts, reservedItems) => {
      const grouped = {};
      const productLookup = {};

      allProducts.forEach((p) => {
        const cat = p.category_name || "Uncategorized";
        if (!productLookup[cat]) productLookup[cat] = [];
        productLookup[cat].push({ id: p.item_id, name: p.name, price: p.price, image: p.image_url });
      });

      if (reservedItems.length > 0) {
        grouped["My Reserved Items"] = reservedItems.map((item) => {
          let savedCustoms = item.customizations;
          if (typeof savedCustoms === "string") {
            try { savedCustoms = JSON.parse(savedCustoms); } catch (e) { savedCustoms = null; }
          }
          // Online -> Cloudinary (local_path) | Offline -> Local (image_url)
          const targetPath = (navigator.onLine && item.local_path) ? item.local_path : item.image_url;
          const finalImg = targetPath?.startsWith("http") ? targetPath : `${BASE_URL}${targetPath?.startsWith("/") ? "" : "/"}${targetPath}`;
          return { id: item.item_id, name: item.name, price: item.price, customizations: savedCustoms, image: finalImg };
        });
      }

      allProducts.forEach((item) => {
        const cat = item.category_name || "Uncategorized";
        if (!grouped[cat]) grouped[cat] = [];
        const targetPath = (navigator.onLine && item.local_path) ? item.local_path : item.image_url;
        const finalImg = targetPath?.startsWith("http") ? targetPath : `${BASE_URL}${targetPath?.startsWith("/") ? "" : "/"}${targetPath}`;
        grouped[cat].push({ id: item.item_id, name: item.name, price: item.price, image: finalImg, category: cat });
      });

      setMenuData(grouped);
      setAllProductsLookup(productLookup);
      const cats = Object.keys(grouped);
      if (cats.length > 0) setActiveCategory(cats[0]);
    };

    fetchData();

    const savedEndTime = localStorage.getItem(TIMER_SESSION_KEY);
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      if (remaining > 0) { setTimeLeft(remaining); setIsTimerRunning(true); }
    }
    return () => { if (socket) socket.disconnect(); };
  }, [reservationId]);

  // --- ORDER SUBMISSION ---
  const handleSendRequest = async () => {
    unlockAudio();
    if (cart.length === 0) return;

    const orderData = {
      reservation_id: reservationId,
      items: cart.map((i) => ({ item_id: i.id, quantity: i.quantity })),
    };

    if (!navigator.onLine) {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
        queue.push(orderData);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        setOrderCart([]);
        setShowSuccessModal(true);
        alert("Offline: Order saved locally. It will sync when Wi-Fi returns.");
        return;
    }

    try {
      const response = await fetch(`${API_BASE}/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        if (socket) socket.emit("send_order", { table: reservationId, items: cart.map((i) => ({ name: i.name, qty: i.quantity })) });
        if (!localStorage.getItem(TIMER_SESSION_KEY)) {
          const endTime = (Date.now() + 5400 * 1000).toString();
          localStorage.setItem(TIMER_SESSION_KEY, endTime);
          setIsTimerRunning(true);
        }
        setOrderCart([]);
        setShowSuccessModal(true);
      } else {
        const err = await response.json();
        alert("Order failed: " + err.error);
      }
    } catch (err) {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
        queue.push(orderData);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        setOrderCart([]);
        setShowSuccessModal(true);
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return "0:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return <div className="loading-container">Loading Kiosk...</div>;

  return (
    <div className="res-kiosk-container" style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      
      {!isOnline && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#ff4444', color: '#fff', textAlign: 'center', zIndex: 10001, fontSize: '12px', fontWeight: 'bold', padding: '2px' }}>
          OFFLINE MODE - USING CACHED IMAGES
        </div>
      )}

      <header className="kiosk-timer-wrapper" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "80px", zIndex: 5000, display: "flex", alignItems: "center", pointerEvents: "auto" }}>
        <div className="header-id-section">
          <User size={20} color="#ffcc00" />
          <div className="id-details">
            <span className="id-label">RESERVATION ID</span>
            <span className="id-value">{reservationId}</span>
          </div>
        </div>

        <div className="timer-box" style={{ margin: "0 auto", pointerEvents: "auto" }}>
          <Clock size={20} color="#ffcc00" />
          <span className="timer-text">{formatTime(timeLeft)}</span>
          <button
            className="finish-session-header-btn"
            onPointerDown={() => setShowEndModal(true)}
            style={{ background: "#ffcc00", color: "#000", border: "none", padding: "8px 20px", borderRadius: "8px", fontWeight: "900", cursor: "pointer", position: "relative", zIndex: 6000 }}
          >
            FINISH
          </button>
        </div>
        <div className="header-right-spacer"></div>
      </header>

      <div className="res-main-layout" style={{ display: "flex", height: "calc(100vh - 80px)", marginTop: "80px" }}>
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
          <button className="res-assist-btn" onClick={() => (window.location.href = "/kiosk-selection")}>
            <Bell size={18} /><span>Assist Me</span>
          </button>
        </aside>

        <main className="res-content-area" style={{ flex: 1, overflowY: "auto" }}>
          <div className="res-grid-container">
            {menuData[activeCategory]?.map((item) => (
              <div key={item.id} className="res-food-card" onClick={() => { unlockAudio(); setSelectedItem(item); setIsModalOpen(true); }}>
                <div className="res-card-image-container">
                  <img src={item.image} alt={item.name} className="res-food-img" onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }} />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  <p style={{ color: "#ffcc00", fontSize: "0.9rem" }}>₱{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary cart={cart} onRemoveItem={(id) => setOrderCart(cart.filter((i) => i.id !== id))} />
      </div>

      <footer className="res-bottom-bar" style={{ zIndex: 4000 }}>
        <button className="res-btn-view-all" onClick={() => (window.location.href = "/kiosk-selection")}>Back</button>
        <div className="res-action-btns">
          <button className="res-btn-view" disabled={cart.length === 0} onClick={handleSendRequest} style={{ background: "#ffcc00" }}>Place Order</button>
        </div>
      </footer>

      {showSuccessModal && (
        <div className="res-modal-overlay" style={{ zIndex: 10000, display: "flex" }} onClick={() => setShowSuccessModal(false)}>
          <div className="res-modal-card res-fade-in-scale" style={{ textAlign: "center" }}>
            <CheckCircle size={60} color="#ffcc00" style={{ margin: "0 auto 20px" }} />
            <h2 style={{ color: "#ffcc00" }}>Order Sent!</h2>
            <p style={{ color: "#fff", marginBottom: "20px" }}>Your items are being prepared.</p>
            <button className="res-modal-btn-primary" onClick={() => setShowSuccessModal(false)}>OK</button>
          </div>
        </div>
      )}

      <PortalModal isOpen={showEndModal} onClose={() => setShowEndModal(false)} onConfirm={stopAndClearEverything} />

      {isModalOpen && (
        <ReservationOrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={selectedItem}
          allProducts={allProductsLookup}
          onAdd={(item) => setOrderCart([...cart, item])}
        />
      )}
    </div>
  );
};

export default KioskReservationMenu;
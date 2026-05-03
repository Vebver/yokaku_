import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare, Drumstick, CupSoda, Check, Bell, AlertCircle, Star,
  ShoppingBag, CheckCircle, ChevronUp, ChevronDown, Flame, Wallet,
  Infinity as InfinityIcon, Pizza, Beef, Package, Utensils, Soup,
  Salad, Clock, User
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import PortalModal from "./PortalModal";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// CONFIG: These categories will NOT show up in the sidebar
const HIDDEN_CATEGORIES = ["Chicken Wings", "Beverages", "Drinks", "Chicken"];

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
  const timerRef = useRef(null);
  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_TABLE_ID = "kiosk_active_table_id"; // Key to remember the table
  const SAVED_RES_ID = "kiosk_active_res_id";     // Key to remember the session

  // --- STATE ---
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);

  const [timeLeft, setTimeLeft] = useState(5400);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [showEndModal, setShowEndModal] = useState(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false); 
  const [showTablePicker, setShowTablePicker] = useState(false); 
  const [availableTables, setAvailableTables] = useState([]); 

  // --- 1. END SESSION & CLEAR TABLE ---
  const handleEndSession = async () => {
    const tableId = localStorage.getItem(SAVED_TABLE_ID);
    
    // Optional: Call backend to release table
    try {
      if (tableId && tableId !== "takeout") {
        await axios.put(`${API_BASE}/admin/tables/${tableId}/release`);
      }
    } catch (err) {
      console.error("Error releasing table:", err);
    }

    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.clear(); 
    setIsTimerRunning(false);
    setShowEndModal(false);
    window.location.href = "/kiosk-selection"; 
  };

  // --- 2. TIMER PERSISTENCE ---
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
        if (!savedEndTime) { handleEndSession(); return; }
        const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
        if (remaining <= 0) handleEndSession();
        else setTimeLeft(remaining);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  // --- 3. FETCH MENU (With Sidebar Filtering) ---
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        const grouped = data.reduce((acc, item) => {
          const cat = item.category_name || "General";
          if (!acc[cat]) acc[cat] = [];

          const fullImage = item.image_url
            ? item.image_url.startsWith("http")
              ? item.image_url
              : `${BASE_URL}${item.image_url.startsWith("/") ? "" : "/"}${item.image_url}`
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
        
        // Find the first category that is NOT hidden to set as default
        const firstVisibleCat = Object.keys(grouped).find(cat => !HIDDEN_CATEGORIES.includes(cat));
        if (firstVisibleCat) setActiveCategory(firstVisibleCat);
        
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const addToOrder = (itemWithQty) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === itemWithQty.id);
      if (exists) {
        return prev.map((i) =>
          i.id === itemWithQty.id
            ? { ...i, quantity: i.quantity + itemWithQty.quantity }
            : i
        );
      }
      return [...prev, itemWithQty];
    });
  };

  // --- 4. PERSISTENT TABLE LOGIC ---
  const handlePlaceOrder = () => {
    const existingTable = localStorage.getItem(SAVED_TABLE_ID);
    
    if (existingTable) {
        // Table already selected earlier, go straight to submission
        const idToSubmit = existingTable === "takeout" ? null : existingTable;
        submitOrderToDatabase(idToSubmit);
    } else {
        // First order of the session, ask for type/table
        setShowTypeModal(true); 
    }
  };

  const handleDineInSelection = async () => {
    setShowTypeModal(false);
    try {
      const res = await axios.get(`${API_BASE}/admin/getTable`);
      setAvailableTables(res.data);
      setShowTablePicker(true);
    } catch (err) {
      alert("Could not load tables.");
    }
  };

  const submitOrderToDatabase = async (tableId = null) => {
    try {
      // Keep the same Reservation ID for the whole session
      const dynamicResId = localStorage.getItem(SAVED_RES_ID) || `WALK-${Date.now()}`;
      
      const response = await fetch(`${API_BASE}/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: dynamicResId,
          table_id: tableId,
          items: cart.map((item) => ({
            item_id: item.id,
            quantity: item.quantity,
            customizations: item.customizations || null,
          })),
        }),
      });

      if (response.ok) {
        // Save Table and Session ID so we don't ask again
        localStorage.setItem(SAVED_TABLE_ID, tableId || "takeout");
        localStorage.setItem(SAVED_RES_ID, dynamicResId);

        if (!localStorage.getItem(TIMER_KEY)) {
          const endTime = Date.now() + 5400 * 1000;
          localStorage.setItem(TIMER_KEY, endTime.toString());
          setIsTimerRunning(true);
        }

        setCart([]);
        setShowTablePicker(false);
        setShowTypeModal(false);
        setShowOrderSuccessModal(true);
      }
    } catch (error) {
      alert("Connection error. Please try again.");
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return <div className="loading-container">Loading Kiosk Menu...</div>;

  return (
    <div className="res-kiosk-container">
      <div className="kiosk-timer-wrapper" style={{ zIndex: 5000 }}>
        <div className="header-id-section">
          <ShoppingBag size={20} color="#ffcc00" />
          <div className="id-details">
            <span className="id-label">MODE</span>
            <span className="id-value">
                {localStorage.getItem(SAVED_TABLE_ID) === "takeout" ? "TAKE-OUT" : 
                 localStorage.getItem(SAVED_TABLE_ID) ? `TABLE ${localStorage.getItem(SAVED_TABLE_ID)}` : "WALK-IN GUEST"}
            </span>
          </div>
        </div>

        <div className="timer-box" style={{ pointerEvents: "auto" }}>
          <Clock size={20} color="#ffcc00" />
          <span className="timer-text">{formatTime(timeLeft)}</span>
          <button
            className="finish-session-header-btn"
            onPointerDown={() => setShowEndModal(true)}
            style={{
              background: "#ffcc00", border: "none", color: "#000",
              padding: "5px 15px", borderRadius: "5px", marginLeft: "12px",
              fontWeight: "bold", cursor: "pointer",
            }}
          >
            FINISH
          </button>
        </div>
      </div>

      <div className="res-main-layout">
        <aside className="res-sidebar">
          <div className="res-brand">
            <h1>HANGOUT</h1>
            <p>Resto Bar</p>
          </div>
          <div className="res-category-list">
            <div className="res-cat-scroll-wrapper">
              {Object.keys(menuData)
                .filter(cat => !HIDDEN_CATEGORIES.includes(cat)) // <--- HIDES UNLI CATS FROM SIDEBAR
                .map((cat) => (
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
          <button className="res-assist-btn" onClick={() => (window.location.href = "/kiosk-selection")}>
            <Bell size={18} />
            <span>Assist Me</span>
          </button>
        </aside>

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
                  <img src={item.image} alt={item.name} className="res-food-img" onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }} />
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
          <button className="res-btn-view" disabled={cart.length === 0} onClick={handlePlaceOrder}>
            {localStorage.getItem(SAVED_TABLE_ID) ? "Add Items" : "Place Order"}
          </button>
        </div>
      </footer>

      {/* MODALS (Kept Original Design) */}
      <PortalModal isOpen={showEndModal} onClose={() => setShowEndModal(false)} onConfirm={handleEndSession} />
      
      {showTypeModal && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}>
          <div className="res-modal-card">
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>Order Mode</h2>
            <div className="res-action-btns" style={{ flexDirection: "column", gap: "15px" }}>
              <button className="res-modal-btn-primary" onClick={handleDineInSelection}>DINE-IN (Eat Here)</button>
              <button className="res-btn-view" style={{ background: "#444" }} onClick={() => submitOrderToDatabase(null)}>TAKE-OUT (To-go)</button>
              <button className="res-btn-cancel" onClick={() => setShowTypeModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

     {isModalOpen && (
  <ReservationOrderModal
    isOpen={isModalOpen}
    onClose={() => {
      setIsModalOpen(false);
      setSelectedCard(null);
    }}
    item={selectedItem}
    onAdd={addToOrder}
    // PASS THE FULL MENU DATA HERE
    allProducts={menuData} 
  />
)}

      {showOrderSuccessModal && (
        <div className="res-modal-overlay" style={{ zIndex: 100000, display: "flex" }} onClick={() => setShowOrderSuccessModal(false)}>
          <div className="res-modal-card res-fade-in-scale" style={{ textAlign: "center" }}>
            <CheckCircle size={60} color="#ffcc00" style={{ margin: "0 auto 20px" }} />
            <h2 style={{ color: "#ffcc00" }}>Order Sent!</h2>
            <button className="res-modal-btn-primary" onClick={() => setShowOrderSuccessModal(false)}>OK</button>
          </div>
        </div>
      )}

      {showTablePicker && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}>
          <div className="res-modal-card" style={{ maxWidth: "600px", width: "90%" }}>
            <h2 style={{ color: "#ffcc00" }}>Select a Table</h2>
            <div className="table-grid-kiosk" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", margin: "20px 0" }}>
              {availableTables.map((table) => {
                const isOccupied = table.bridge_status === "seated" || table.bridge_status === "confirmed";
                return (
                  <button
                    key={table.table_id}
                    disabled={isOccupied}
                    onClick={() => submitOrderToDatabase(table.table_id)}
                    style={{
                      padding: "20px 10px", borderRadius: "8px", border: "none",
                      background: isOccupied ? "#333" : "#ffcc00",
                      color: isOccupied ? "#666" : "#000", fontWeight: "bold",
                      cursor: isOccupied ? "not-allowed" : "pointer",
                    }}
                  >
                    {table.table_number}
                    <div style={{ fontSize: "10px" }}>{isOccupied ? "FULL" : "OPEN"}</div>
                  </button>
                );
              })}
            </div>
            <button className="res-btn-cancel" onClick={() => setShowTablePicker(false)}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskMenu;
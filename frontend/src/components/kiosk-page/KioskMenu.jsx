import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare, Drumstick, CupSoda, Check, Bell, Star, ShoppingBag, 
  CheckCircle, ChevronUp, ChevronDown, Flame, Wallet,
  Infinity as InfinityIcon, Pizza, Beef, Package, Utensils, Soup,
  Salad, Clock, Receipt, UtensilsCrossed, RefreshCw
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import PortalModal from "./PortalModal";
import axios from "axios";
import alertMusicFile from "../../assets/alert-sound.mp3"; 

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const HIDDEN_CATEGORIES = ["Chicken Wings", "Beverages", "Drinks", "Chicken"];

const categoryIcons = {
  "Best Seller": <Flame />, "Budget Meals": <Wallet />, Unlimited: <InfinityIcon />,
  Pizzas: <Pizza />, Burgers: <Beef />, Bundle: <Package />, Extra: <PlusSquare />,
  "Rice Bowl Combo": <Soup />, Beverages: <CupSoda />, "Side Dish": <Utensils />,
  Pasta: <Salad />, "Chicken Wings": <Drumstick />,
};

const KioskMenu = () => {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio(alertMusicFile));
  
  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_TABLE_ID = "kiosk_active_table_id";
  const SAVED_RES_ID = "kiosk_active_res_id";
  const OFFLINE_QUEUE_KEY = "kiosk_offline_orders";

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);
  const [timeLeft, setTimeLeft] = useState(1860);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [isRefillMode, setIsRefillMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- ONLINE/OFFLINE MONITOR ---
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

  // --- SYNC OFFLINE ORDERS ---
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

  // --- FETCH MENU WITH DUAL IMAGE PATHS ---
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        localStorage.setItem("kiosk_cached_menu", JSON.stringify(data));
        processMenu(data);
      } catch (e) {
        const cached = localStorage.getItem("kiosk_cached_menu");
        if (cached) processMenu(JSON.parse(cached));
      } finally { setLoading(false); }
    };

    const processMenu = (data) => {
      const grouped = data.reduce((acc, item) => {
        const cat = item.category_name || "General";
        if (!acc[cat]) acc[cat] = [];

        /** 
         * USER SCHEMA LOGIC:
         * item.image_url = /uploads/abc.jpg (LOCAL)
         * item.local_path = https://cloudinary.com/xyz (CLOUDINARY)
         */
        const targetPath = (navigator.onLine && item.local_path) 
          ? item.local_path // Online? Use Cloudinary (local_path)
          : item.image_url;  // Offline? Use Local (/uploads/...)

        const fullImage = targetPath?.startsWith("http") 
          ? targetPath 
          : `${BASE_URL}${targetPath?.startsWith("/") ? "" : "/"}${targetPath}`;

        acc[cat].push({ 
            id: item.item_id, 
            name: item.name, 
            image: fullImage, 
            description: item.description, 
            price: item.price, 
            category: cat 
        });
        return acc;
      }, {});

      setMenuData(grouped);
      setDynamicFlavors((grouped["Chicken"] || []).map((i) => i.name));
      setDynamicDrinks([...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map((i) => i.name));
      const firstVisibleCat = Object.keys(grouped).find((cat) => !HIDDEN_CATEGORIES.includes(cat));
      if (firstVisibleCat) setActiveCategory(firstVisibleCat);
    };

    fetchMenu();
    if (localStorage.getItem(SAVED_RES_ID)) fetchCurrentBill();
  }, []);

  // --- OFFLINE ORDER QUEUEING ---
  const submitOrderToDatabase = async (tableId = null, itemsToSubmit = cart) => {
    const dynamicResId = localStorage.getItem(SAVED_RES_ID) || `WALK-${Date.now()}`;
    const orderData = {
      reservation_id: dynamicResId,
      table_id: tableId,
      items: itemsToSubmit.map((i) => ({
        item_id: i.id,
        quantity: i.quantity,
        customizations: i.customizations,
        is_refill: i.price === 0,
      })),
    };

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
      queue.push(orderData);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      finalizeOrderLocally(itemsToSubmit, tableId, dynamicResId);
      alert("Offline: Order saved locally. It will reach the kitchen once Wi-Fi returns.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (response.ok) finalizeOrderLocally(itemsToSubmit, tableId, dynamicResId);
    } catch (error) {
       const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
       queue.push(orderData);
       localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
       finalizeOrderLocally(itemsToSubmit, tableId, dynamicResId);
    }
  };

  const finalizeOrderLocally = (itemsToSubmit, tableId, dynamicResId) => {
    const newItems = itemsToSubmit.map((i) => ({ name: i.name, price: i.price || 0, quantity: i.quantity, customizations: i.customizations }));
    setBillItems((prev) => [...prev, ...newItems]);
    
    const bundleItem = itemsToSubmit.find((i) => i.name?.toLowerCase().includes("bundle"));
    if (bundleItem) {
      localStorage.setItem("kiosk_active_bundle_id", bundleItem.id);
      localStorage.setItem("kiosk_active_bundle_name", bundleItem.name);
    }

    localStorage.setItem(SAVED_TABLE_ID, tableId || "takeout");
    localStorage.setItem(SAVED_RES_ID, dynamicResId);
    
    if (!localStorage.getItem(TIMER_KEY)) {
      localStorage.setItem(TIMER_KEY, (Date.now() + 1860 * 1000).toString());
      setIsTimerRunning(true);
    }
    setCart([]);
    setShowTablePicker(false);
    setShowTypeModal(false);
    setShowSessionModal(true);
  };

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }).catch(() => {});
    }
  };

  const fetchCurrentBill = async () => {
    const resId = localStorage.getItem(SAVED_RES_ID);
    if (!resId) return [];
    try {
      const res = await axios.get(`${API_BASE}/orders/reservation-items/${resId}`);
      if (res.data?.length > 0) setBillItems(res.data);
      return res.data;
    } catch (err) { return []; }
  };

  const handleDineInSelection = async () => {
    setShowTypeModal(false);
    try {
      const res = await axios.get(`${API_BASE}/admin/getTable`);
      setAvailableTables(res.data);
      setShowTablePicker(true);
    } catch (err) { alert("Could not load tables."); }
  };

  const handleEndSession = async () => {
    const activeTable = localStorage.getItem(SAVED_TABLE_ID);
    const activeResId = localStorage.getItem(SAVED_RES_ID);
    if (activeTable && activeTable !== "takeout" && activeResId && navigator.onLine) {
      try { await axios.post(`${API_BASE}/orders/finish`, { table_id: activeTable, reservation_id: activeResId }); } 
      catch (err) { console.error(err); }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.removeItem("kiosk_active_bundle_id");
    localStorage.removeItem("kiosk_active_bundle_name");
    localStorage.removeItem(SAVED_TABLE_ID);
    localStorage.removeItem(SAVED_RES_ID);
    localStorage.removeItem(TIMER_KEY);
    window.location.href = "/kiosk-selection";
  };

  useEffect(() => {
    const savedEndTime = localStorage.getItem(TIMER_KEY);
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      if (remaining > 0) { setTimeLeft(remaining); setIsTimerRunning(true); } 
      else { handleEndSession(); }
    }
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        const savedEndTime = localStorage.getItem(TIMER_KEY);
        const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
        if (remaining === 1800) audioRef.current.play().catch(() => {});
        if (remaining <= 0) handleEndSession();
        else setTimeLeft(remaining);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const confirmFlavors = () => {
    if (selectedFlavors.length === 0) return alert("Select flavors");
    if (!isRefillMode && !selectedDrink) return alert("Select a drink");
    const customization = isRefillMode ? `REFILL: ${selectedFlavors.join(", ")}` : `Flavors: ${selectedFlavors.join(", ")} | Drink: ${selectedDrink}`;
    if (isRefillMode) {
      submitOrderToDatabase(localStorage.getItem(SAVED_TABLE_ID), [{ id: selectedItem.id, quantity: 1, customizations: customization, price: 0, name: selectedItem.name }]);
    } else {
      setCart([...cart, { ...selectedItem, quantity: 1, customizations: customization }]);
    }
    setShowFlavorModal(false);
  };

  const handleRefillClick = async () => {
    const latestBill = await fetchCurrentBill();
    let bundle = latestBill.find((i) => (i.name || i.item_name || "").toLowerCase().includes("bundle"));
    if (!bundle) {
      const savedId = localStorage.getItem("kiosk_active_bundle_id");
      const savedName = localStorage.getItem("kiosk_active_bundle_name");
      if (savedId) bundle = { item_id: savedId, name: savedName };
    }
    if (bundle) {
      setSelectedItem({ id: bundle.item_id || bundle.id, name: bundle.name || bundle.item_name });
      setIsRefillMode(true); setShowFlavorModal(true); setShowSessionModal(false);
    } else { alert("Please order a Hangout Bundle first."); }
  };

  const handleItemClick = (item) => {
    unlockAudio();
    if (item.category === "Hangout Bundle" || item.name.toLowerCase().includes("bundle")) {
      setSelectedItem(item); setSelectedFlavors([]); setSelectedDrink(""); setIsRefillMode(false); setShowFlavorModal(true);
    } else { setSelectedItem(item); setIsModalOpen(true); }
    setSelectedCard(item.id);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const hasActiveBundle = billItems.some((i) => (i.name || i.item_name || "").toLowerCase().includes("bundle"));

  if (loading) return <div className="loading-container">Loading Menu...</div>;

  return (
    <div className="res-kiosk-container">
      {/* OFFLINE INDICATOR BAR */}
      {!isOnline && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#ff4444', color: '#fff', textAlign: 'center', zIndex: 10001, fontSize: '12px', padding: '2px', fontWeight: 'bold' }}>
          OFFLINE: ORDERS WILL BE QUEUED
        </div>
      )}

      <div className="kiosk-timer-wrapper" style={{ zIndex: 5000 }}>
        <div className="header-id-section" style={{ background: "#222", border: "2px solid #ffcc00", padding: "10px 15px", borderRadius: "10px" }}>
          <ShoppingBag size={20} color="#ffcc00" />
          <div className="id-details" style={{ marginLeft: "10px" }}>
            <span className="id-label" style={{ color: "#ffcc00", fontSize: "10px", fontWeight: "900", display: "block" }}>ORDER MODE</span>
            <span className="id-value" style={{ color: "#fff", fontWeight: "900", display: "block", fontSize: "15px" }}>
              {localStorage.getItem(SAVED_TABLE_ID) && localStorage.getItem(SAVED_TABLE_ID) !== "takeout" ? `TABLE ${localStorage.getItem(SAVED_TABLE_ID)}` : "WALK-IN GUEST"}
            </span>
          </div>
        </div>

        {isTimerRunning && (
          <div className="timer-box" onClick={() => setShowSessionModal(true)} style={{ cursor: "pointer", border: "2px solid #ffcc00" }}>
            <Clock size={20} color="#ffcc00" />
            <span className="timer-text" style={{ color: "#fff" }}>{formatTime(timeLeft)}</span>
            <button className="finish-session-header-btn" onClick={(e) => { e.stopPropagation(); setShowEndModal(true); }}>FINISH</button>
          </div>
        )}

        <button className="billing-btn-header" onClick={() => { fetchCurrentBill(); setShowBillingModal(true); }} style={{ background: "none", border: "none", color: "#ffcc00", marginLeft: "auto" }}>
          <Receipt size={24} />
        </button>
      </div>

      <div className="res-main-layout">
        <aside className="res-sidebar">
          <div className="res-brand"><h1>HANGOUT</h1><p>Resto Bar</p></div>
          <div className="res-category-list">
            <div className="res-cat-scroll-wrapper">
              {Object.keys(menuData).filter((cat) => !HIDDEN_CATEGORIES.includes(cat)).map((cat) => (
                <button key={cat} className={`res-cat-btn ${activeCategory === cat ? "res-active" : ""}`} onClick={() => setActiveCategory(cat)}>
                  <div className="res-cat-icon-placeholder">{categoryIcons[cat] || <Star size={20} />}</div>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="res-content-area">
          <div className="res-grid-container">
            {(menuData[activeCategory] || []).map((item) => {
              if (hasActiveBundle && item.name.toLowerCase().includes("bundle")) return null;
              return (
                <div key={item.id} className={`res-food-card ${selectedCard === item.id ? "res-selected" : ""}`} onClick={() => handleItemClick(item)}>
                  <div className="res-card-image-container">
                    <img src={item.image} alt={item.name} className="res-food-img" onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }} />
                  </div>
                  <div className="res-card-info">
                    <h4 className="res-food-label">{item.name}</h4>
                    <p style={{ color: "#ffcc00", fontWeight: "bold" }}>₱{item.price}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
        <OrderSummary cart={cart} onRemoveItem={(id) => setCart(cart.filter((i) => i.id !== id))} />
      </div>

      <footer className="res-bottom-bar">
        <button className="res-btn-view-all" onClick={() => (window.location.href = "/kiosk-selection")}>Back</button>
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={() => setCart([])}>Clear Tray</button>
          <button className="res-btn-view" disabled={cart.length === 0} onClick={() => {
              const tbl = localStorage.getItem(SAVED_TABLE_ID);
              if (tbl) submitOrderToDatabase(tbl === "takeout" ? null : tbl);
              else setShowTypeModal(true);
          }}>{localStorage.getItem(SAVED_TABLE_ID) ? "Add More Items" : "Place Order"}</button>
        </div>
      </footer>

      {/* MODALS (Design Unchanged) */}
      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}>
          <div className="res-modal-card" style={{ maxWidth: "600px", width: "95%", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: "#ffcc00", textAlign: "center" }}>{isRefillMode ? "Refill Selection" : "Bundle Setup"}</h2>
            <h4 style={{ color: "#fff", margin: "20px 0 10px" }}>Select Chicken Flavors (Max 4)</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {dynamicFlavors.map((f) => (
                <button key={f} onClick={() => {
                    if (selectedFlavors.includes(f)) setSelectedFlavors(selectedFlavors.filter((x) => x !== f));
                    else if (selectedFlavors.length < 4) setSelectedFlavors([...selectedFlavors, f]);
                }} style={{ padding: "15px 10px", borderRadius: "10px", border: "1px solid #ffcc00", background: selectedFlavors.includes(f) ? "#ffcc00" : "none", color: selectedFlavors.includes(f) ? "#000" : "#fff", fontWeight: "bold" }}>{f}</button>
              ))}
            </div>
            {!isRefillMode && (
              <>
                <h4 style={{ color: "#fff", margin: "25px 0 10px" }}>Select Drink</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  {dynamicDrinks.map((d) => (
                    <button key={d} onClick={() => setSelectedDrink(d)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #555", background: selectedDrink === d ? "#fff" : "none", color: selectedDrink === d ? "#000" : "#fff", fontSize: "0.8rem" }}>{d}</button>
                  ))}
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
              <button className="res-btn-cancel" style={{ flex: 1 }} onClick={() => setShowFlavorModal(false)}>Cancel</button>
              <button className="res-modal-btn-primary" style={{ flex: 2 }} onClick={confirmFlavors}>{isRefillMode ? "SEND REFILL" : "ADD TO TRAY"}</button>
            </div>
          </div>
        </div>
      )}

      {showSessionModal && (
        <div className="res-modal-overlay" style={{ zIndex: 7000 }}>
          <div className="res-modal-card" style={{ textAlign: "center", padding: "40px" }}>
            <UtensilsCrossed size={60} color="#ffcc00" style={{ margin: "0 auto 20px" }} />
            <h2 style={{ color: "#ffcc00", marginBottom: "10px" }}>SESSION ACTIVE</h2>
            <div style={{ fontSize: "3rem", fontWeight: "900", color: "#fff", margin: "20px 0" }}>{formatTime(timeLeft)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button className="res-modal-btn-primary" style={{ background: "#28a745", border: "none" }} onClick={handleRefillClick}>
                <RefreshCw size={18} style={{ marginRight: "8px" }} /> REFILL CHICKEN
              </button>
              <button className="res-modal-btn-primary" onClick={() => setShowSessionModal(false)}>ORDER MORE ITEMS</button>
              <button className="res-btn-cancel" onClick={() => setShowEndModal(true)}>FINISH & CHECKOUT</button>
            </div>
          </div>
        </div>
      )}

      {showBillingModal && (
        <div className="res-modal-overlay" style={{ zIndex: 8000 }}>
          <div className="res-modal-card" style={{ maxWidth: "400px" }}>
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>Order History</h2>
            <div className="bill-items" style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "20px" }}>
              {billItems.map((item, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", padding: "10px 0", borderBottom: "1px solid #333" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontWeight: "bold" }}>{item.name || item.item_name} x{item.quantity}</span>
                    <span style={{ color: "#ffcc00" }}>₱{(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.customizations && <small style={{ color: "#888", fontStyle: "italic" }}>{item.customizations}</small>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1.2rem", borderTop: "2px solid #ffcc00", paddingTop: "10px", color: "#fff" }}>
              <span>TOTAL:</span>
              <span>₱{billItems.reduce((sum, i) => sum + (parseFloat(i.price || 0) * i.quantity), 0).toFixed(2)}</span>
            </div>
            <button className="res-modal-btn-primary" style={{ marginTop: "20px" }} onClick={() => setShowBillingModal(false)}>CLOSE</button>
          </div>
        </div>
      )}

      <PortalModal isOpen={showEndModal} onClose={() => setShowEndModal(false)} onConfirm={handleEndSession} />
      <ReservationOrderModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedCard(null); }} item={selectedItem} onAdd={(item) => setCart([...cart, item])} allProducts={menuData} />
      
      {showTypeModal && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}>
          <div className="res-modal-card">
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>Order Mode</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", width: "100%" }}>
              <button className="res-modal-btn-primary" onClick={handleDineInSelection}>DINE-IN</button>
              <button className="res-btn-view" onClick={() => submitOrderToDatabase(null)} style={{ background: "#444" }}>TAKE-OUT</button>
              <button className="res-btn-cancel" onClick={() => setShowTypeModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTablePicker && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}>
          <div className="res-modal-card" style={{ maxWidth: "600px", width: "90%" }}>
            <h2 style={{ color: "#ffcc00" }}>Select Table</h2>
            <div className="table-grid-kiosk" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", margin: "20px 0" }}>
              {availableTables.map((table) => {
                const occupied = table.bridge_status?.toLowerCase() === "confirmed" || table.bridge_status?.toLowerCase() === "seated";
                return (
                  <button key={table.table_id} disabled={occupied} onClick={() => submitOrderToDatabase(table.table_id)} style={{ padding: "20px 10px", borderRadius: "8px", border: "none", background: occupied ? "#333" : "#ffcc00", color: occupied ? "#666" : "#000", fontWeight: "bold" }}>
                    {table.table_number}<div style={{ fontSize: "10px" }}>{occupied ? "FULL" : "OPEN"}</div>
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
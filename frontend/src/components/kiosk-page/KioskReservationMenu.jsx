import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare, Drumstick, CupSoda, Check, Bell, Star, ShoppingBag,
  CheckCircle, ChevronUp, ChevronDown, Flame, Wallet,
  Infinity as InfinityIcon, Pizza, Beef, Package, Utensils,
  Soup, Salad, Clock, Receipt, UtensilsCrossed, RefreshCw, Banknote, CreditCard, User
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import PortalModal from "./PortalModal";
import axios from "axios";
import alertMusicFile from "../../assets/alert-sound.mp3";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const HIDDEN_CATEGORIES = ["Chicken Wings", "Beverages", "Drinks", "Chicken", "Ramen"];

const categoryIcons = {
  "Best Seller": <Flame />, "Budget Meals": <Wallet />, Unlimited: <InfinityIcon />,
  Pizzas: <Pizza />, Burgers: <Beef />, Bundle: <Package />, Extra: <PlusSquare />,
  "Rice Bowl Combo": <Soup />, Beverages: <CupSoda />, "Side Dish": <Utensils />,
  Pasta: <Salad />, "Chicken Wings": <Drumstick />, "My Reserved Items": <Receipt />
};

const KioskReservationMenu = () => {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio(alertMusicFile));
  const reservationId = localStorage.getItem("resId") || "GUEST";
  
  const TIMER_KEY = `kiosk_res_timer_${reservationId}`;
  const PAYMENT_CHOICE_KEY = `kiosk_pay_choice_${reservationId}`;

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]); 
  const [billItems, setBillItems] = useState([]); 
  
  const [dynamicFlavors, setDynamicFlavors] = useState([]); 
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);
  
  const [timeLeft, setTimeLeft] = useState(5400); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showBillInfo, setShowBillInfo] = useState(false);
  const [isFinalCheckout, setIsFinalCheckout] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [isRefillMode, setIsRefillMode] = useState(false);

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, resItemsRes] = await Promise.all([
          fetch(`${API_BASE}/products`).then(r => r.json()),
          fetch(`${API_BASE}/orders/reservation-items/${reservationId}`).then(r => r.json())
        ]);

        // IMPORTANT: Pass BOTH arguments to processMenu
        processMenu(prodRes, resItemsRes);

        if (resItemsRes.length > 0 && cart.length === 0) {
          const preLoaded = resItemsRes.map(item => ({
            id: item.item_id,
            name: item.name || item.item_name,
            price: item.price || item.item_price,
            quantity: item.quantity || 1,
            customizations: item.customizations,
            category: item.category_name,
            isPreReserved: true
          }));
          setCart(preLoaded);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };

   const processMenu = (data, reservedItems = []) => {
  const grouped = {};

  // Helper to ensure image URLs are perfectly formatted
  const getFullImage = (item) => {
    const targetPath = (navigator.onLine && item.local_path) ? item.local_path : item.image_url;
    if (!targetPath) return "https://via.placeholder.com/150";
    if (targetPath.startsWith("http")) return targetPath;
    // Fixes double slash or missing slash issues
    return `${BASE_URL}${targetPath.startsWith("/") ? "" : "/"}${targetPath}`;
  };

  // 1. Add "My Reserved Items" at the very top
  if (reservedItems.length > 0) {
    grouped["My Reserved Items"] = reservedItems.map(item => ({
      id: item.item_id,
      name: item.name || item.item_name,
      price: item.price || item.item_price,
      image: getFullImage(item),
      category: "My Reserved Items",
      description: "Items you pre-ordered online."
    }));
  }

  // 2. Add all other categories
  data.reduce((acc, item) => {
    const cat = item.category_name || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ 
        id: item.item_id, 
        name: item.name, 
        image: getFullImage(item), 
        price: item.price, 
        category: cat, 
        description: item.description 
    });
    return acc;
  }, grouped);

  setMenuData(grouped);
  setDynamicFlavors((grouped["Chicken"] || []).map(i => i.name));
  setDynamicRamenFlavors((grouped["Ramen"] || []).map(i => i.name));
  setDynamicDrinks([...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map(i => i.name));
  
  const cats = Object.keys(grouped).filter(c => !HIDDEN_CATEGORIES.includes(c));
  if (cats.length > 0) setActiveCategory(cats[0]);
};

    fetchData();
    fetchCurrentBill();
  }, [reservationId]);

  // --- 2. LOGIC HELPERS ---
  const fetchCurrentBill = async () => {
    try {
      const res = await axios.get(`${API_BASE}/orders/reservation-items/${reservationId}`);
      if (res.data) setBillItems(res.data);
      return res.data;
    } catch (err) { return []; }
  };

  const calculateTotal = () => {
    const list = isFinalCheckout ? [...billItems, ...cart] : cart;
    const uniqueList = Array.from(new Set(list.map(a => JSON.stringify(a)))).map(a => JSON.parse(a));
    
    return uniqueList.reduce((sum, item) => {
      const p = parseFloat(item.price || item.item_price || 0);
      const q = parseInt(item.quantity || item.qty || 1);
      return sum + (p * q);
    }, 0).toFixed(2);
  };

  const handlePlaceOrderClick = () => {
    if (localStorage.getItem(PAYMENT_CHOICE_KEY)) {
        submitOrderToDatabase();
    } else {
        setIsFinalCheckout(false);
        setShowBillInfo(true);
    }
  };

  const confirmPaymentChoice = (choice) => {
    localStorage.setItem(PAYMENT_CHOICE_KEY, choice);
    setShowBillInfo(false);
    submitOrderToDatabase();
  };

  const handleFinishClick = async () => {
    setShowSessionModal(false);
    await fetchCurrentBill();
    setIsFinalCheckout(true);
    setShowBillInfo(true);
  };

  const submitOrderToDatabase = async () => {
    try {
      await axios.post(`${API_BASE}/orders/place`, {
        reservation_id: reservationId,
        items: cart.map(i => ({ item_id: i.id, quantity: i.quantity, customizations: i.customizations }))
      });
      
      const hasUnlimited = cart.some(i => (i.name || "").toLowerCase().includes("unlimited"));
      if (hasUnlimited && !localStorage.getItem(TIMER_KEY)) {
        localStorage.setItem(TIMER_KEY, (Date.now() + 5400 * 1000).toString());
        setIsTimerRunning(true);
      }

      setBillItems(prev => [...prev, ...cart]);
      setCart([]);
      setShowSessionModal(true);
    } catch (e) { alert("Failed to send order."); }
  };

  const handleEndSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.clear();
    window.location.href = "/kiosk-selection";
  };

  const handleItemClick = (item) => {
    const itemName = (item.name || "").toLowerCase();
    if (itemName.includes("unlimited") || itemName.includes("ramen")) {
      setSelectedItem(item);
      setSelectedFlavors([]);
      setSelectedDrink("");
      setIsRefillMode(false);
      setShowFlavorModal(true);
    } else {
      setSelectedItem({ ...item, category: "Regular" });
      setIsModalOpen(true);
    }
  };

  const confirmFlavors = () => {
    const isRamen = selectedItem.name.toLowerCase().includes("ramen");
    if (selectedFlavors.length === 0) return alert(`Select a flavor`);
    const cust = `${isRamen ? "Ramen: " : "Wings: "}${selectedFlavors.join(", ")} ${selectedDrink ? "| " + selectedDrink : ""}`;
    setCart([...cart, { ...selectedItem, quantity: 1, customizations: cust }]);
    setShowFlavorModal(false);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) return <div className="loading-container">Loading...</div>;

  return (
    <div className="res-kiosk-container">
      {/* HEADER */}
      <div className="kiosk-timer-wrapper" style={{ zIndex: 5000 }}>
        <div className="header-id-section" style={{ background: "#222", border: "3px solid #ffcc00", padding: "10px 20px", borderRadius: "10px" }}>
          <User size={24} color="#ffcc00" />
          <div className="id-details" style={{ marginLeft: "12px" }}>
            <span style={{ color: "#ffcc00", fontSize: "10px", fontWeight: "900", display: "block" }}>RESERVATION ID</span>
            <span style={{ color: "#fff", fontWeight: "900", fontSize: "20px" }}>{reservationId}</span>
          </div>
        </div>

        <button className="billing-btn-header" onClick={handleFinishClick} 
           style={{ background: "#ffcc00", color: "#000", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", marginLeft: "20px", display: 'flex', gap: '8px', cursor: 'pointer' }}>
          <CreditCard size={18} /> PAY
        </button>

        {isTimerRunning && (
          <div className="timer-box" onClick={() => setShowSessionModal(true)} style={{ cursor: "pointer", border: "2px solid #ffcc00", marginLeft: "auto" }}>
            <Clock size={20} color="#ffcc00" />
            <span className="timer-text" style={{ color: "#fff", fontSize: '1.2rem' }}>{formatTime(timeLeft)}</span>
            <button className="finish-session-header-btn" onClick={(e) => { e.stopPropagation(); setShowEndModal(true); }}>FINISH</button>
          </div>
        )}
      </div>

      <div className="res-main-layout">
        <aside className="res-sidebar">
          <div className="res-brand"><h1>HANGOUT</h1><p>Resto Bar</p></div>
          <div className="res-category-list">
            <div className="res-cat-scroll-wrapper">
              {Object.keys(menuData).filter(cat => !HIDDEN_CATEGORIES.includes(cat)).map(cat => (
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
            {(menuData[activeCategory] || []).map((item) => (
              <div key={item.id} className="res-food-card" onClick={() => handleItemClick(item)}>
                <div className="res-card-image-container"><img src={item.image} alt={item.name} className="res-food-img" /></div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  {item.description && <p style={{ color: "#888", fontSize: "0.75rem", marginBottom: "5px" }}>{item.description}</p>}
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>₱{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary cart={cart} onRemoveItem={(id) => setCart(cart.filter(i => i.id !== id))} />
      </div>

      <footer className="res-bottom-bar">
        <button className="res-btn-view-all" onClick={() => navigate("/kiosk-selection")}>Back</button>
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={() => setCart([])}>Clear Tray</button>
          <button className="res-btn-view" disabled={cart.length === 0} onClick={handlePlaceOrderClick}>Place Order</button>
        </div>
      </footer>

      {/* BILL INFO MODAL */}
      {showBillInfo && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="res-modal-card" style={{ maxWidth: "450px", textAlign: "center" }}>
            <Receipt size={50} color="#ffcc00" style={{ margin: "0 auto 15px" }} />
            <h2 style={{ color: "#ffcc00" }}>{isFinalCheckout ? "Final Bill Summary" : "Confirm Order"}</h2>
            <div className="bill-scroll" style={{ maxHeight: "250px", overflowY: "auto", margin: "20px 0", borderBottom: "1px solid #444" }}>
              {[...billItems, ...cart].map((item, idx) => {
                const p = parseFloat(item.price || item.item_price || 0);
                const q = parseInt(item.quantity || item.qty || 1);
                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 5px", color: "#fff" }}>
                    <span style={{textAlign: 'left'}}>{item.name || item.item_name} x{q}</span>
                    <span>₱{(p * q).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.5rem", fontWeight: "bold", color: "#fff", marginBottom: "30px" }}>
              <span>Total:</span><span style={{ color: "#ffcc00" }}>₱{calculateTotal()}</span>
            </div>
            {isFinalCheckout ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                 <button className="res-modal-btn-primary" onClick={() => setShowEndModal(true)}>PROCEED TO CHECKOUT</button>
                 <button className="res-btn-cancel" onClick={() => setShowBillInfo(false)}>BACK</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button className="res-modal-btn-primary" onClick={() => confirmPaymentChoice("Pay Now")}><Banknote size={18} /> PAY NOW</button>
                <button className="res-modal-btn-primary" style={{background: "#444"}} onClick={() => confirmPaymentChoice("Pay Later")}><Clock size={18} /> PAY LATER</button>
                <button className="res-btn-cancel" onClick={() => setShowBillInfo(false)}>CANCEL</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLAVOR MODAL */}
      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}>
          <div className="res-modal-card" style={{ maxWidth: "600px" }}>
            <h2 style={{ color: "#ffcc00", textAlign: "center" }}>{selectedItem?.name.toLowerCase().includes("ramen") ? "Ramen Choice" : "Unlimited Wings Setup"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: '20px' }}>
              {(selectedItem?.name.toLowerCase().includes("ramen") ? dynamicRamenFlavors : dynamicFlavors).map((f) => (
                <button key={f} onClick={() => {
                    const isRamen = selectedItem.name.toLowerCase().includes("ramen");
                    if (selectedFlavors.includes(f)) setSelectedFlavors(selectedFlavors.filter(x => x !== f));
                    else { if (isRamen) setSelectedFlavors([f]); else if (selectedFlavors.length < 4) setSelectedFlavors([...selectedFlavors, f]); }
                  }}
                  style={{ padding: "15px 10px", borderRadius: "10px", border: "1px solid #ffcc00", background: selectedFlavors.includes(f) ? "#ffcc00" : "none", color: selectedFlavors.includes(f) ? "#000" : "#fff", fontWeight: "bold" }}>{f}</button>
              ))}
            </div>
            {!isRefillMode && !selectedItem?.name.toLowerCase().includes("ramen") && (
              <div style={{marginTop: '20px'}}>
                <h4 style={{ color: "#fff", marginBottom: "10px" }}>Select Drink</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  {dynamicDrinks.map((d) => (
                    <button key={d} onClick={() => setSelectedDrink(d)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #555", background: selectedDrink === d ? "#fff" : "none", color: selectedDrink === d ? "#000" : "#fff" }}>{d}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
              <button className="res-btn-cancel" style={{ flex: 1 }} onClick={() => setShowFlavorModal(false)}>Cancel</button>
              <button className="res-modal-btn-primary" style={{ flex: 2 }} onClick={confirmFlavors}>ADD TO TRAY</button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION MODAL */}
      {showSessionModal && (
        <div className="res-modal-overlay" style={{ zIndex: 7000 }}>
          <div className="res-modal-card" style={{ textAlign: "center", padding: "40px" }}>
            <UtensilsCrossed size={60} color="#ffcc00" style={{ margin: "0 auto 20px" }} />
            <h2 style={{ color: "#ffcc00" }}>{isTimerRunning ? "SESSION ACTIVE" : "ORDER SENT"}</h2>
            {isTimerRunning && <div style={{ fontSize: "3rem", fontWeight: "900", color: "#fff", margin: "20px 0" }}>{formatTime(timeLeft)}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {isTimerRunning && <button className="res-modal-btn-primary" style={{ background: "#28a745" }} onClick={() => {setSelectedItem({id: localStorage.getItem("kiosk_active_bundle_id"), name: 'Unlimited'}); setIsRefillMode(true); setShowFlavorModal(true); setShowSessionModal(false);}}><RefreshCw size={18} /> REFILL CHICKEN</button>}
              <button className="res-modal-btn-primary" onClick={() => setShowSessionModal(false)}>ORDER MORE ITEMS</button>
              <button className="res-btn-cancel" onClick={handleFinishClick}>FINISH & CHECKOUT</button>
            </div>
          </div>
        </div>
      )}

      <PortalModal isOpen={showEndModal} onClose={() => setShowEndModal(false)} onConfirm={handleEndSession} />
      <ReservationOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selectedItem} onAdd={(item) => setCart([...cart, item])} allProducts={menuData} />
    </div>
  );
};

export default KioskReservationMenu;
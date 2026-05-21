import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare, Drumstick, CupSoda, Check, Bell, Star, ShoppingBag,
  CheckCircle, ChevronUp, ChevronDown, Flame, Wallet,
  Infinity as InfinityIcon, Pizza, Beef, Package, Utensils,
  Soup, Salad, Clock, Receipt, UtensilsCrossed, RefreshCw,
  Banknote, CreditCard,
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
  Pasta: <Salad />, "Chicken Wings": <Drumstick />,
};

const KioskMenu = () => {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio(alertMusicFile));

  // --- STORAGE CONFIGURATION ---
  const storage = window.sessionStorage; 

  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_TABLE_ID = "kiosk_active_table_id";
  const SAVED_RES_ID = "kiosk_active_res_id";
  const OFFLINE_QUEUE_KEY = "kiosk_offline_orders";
  const PAYMENT_CHOICE_KEY = "kiosk_payment_choice";
  const FIXED_KIOSK_KEY = "kiosk_fixed_table_id";

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);
  const [timeLeft, setTimeLeft] = useState(1860);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [isRefillMode, setIsRefillMode] = useState(false);
  const [showBillInfo, setShowBillInfo] = useState(false);
  const [isFinalCheckout, setIsFinalCheckout] = useState(false);
  const [localBillHistory, setLocalBillHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const calculateTotal = () => {
    const finalItems = billItems.length > 0 ? [...billItems, ...cart] : [...localBillHistory, ...cart];
    const total = finalItems.reduce((sum, item) => {
      const price = parseFloat(
        item.price || item.item_price || item.unit_price || 0,
      );
      const qty = parseInt(item.quantity || item.qty || 1);
      return sum + price * qty;
    }, 0);
    return total.toFixed(2);
  };

  const getImmediateTotal = (cartItems, historyItems) => {
  const combined = [...historyItems, ...cartItems];
  return combined.reduce((sum, item) => {
    const price = parseFloat(item.price || item.item_price || 0);
    const qty = parseInt(item.quantity || item.qty || 1);
    return sum + (price * qty);
  }, 0).toFixed(2);
};

  // Helper to send the current total to the Billing Dashboard
  const syncWithDashboard = async (resId, amount, method = "Cash", status = "pending") => {
  try {
    // We get the token because the Billing API usually requires it
    const token = localStorage.getItem("token") || ""; 
    
    await axios.post(`${API_BASE}/billing/walkin`, {
      reservation_id: resId,
      amount: parseFloat(amount),
      payment_method: method,
      payment_status: status
    }, {
      headers: { Authorization: `Bearer ${token}` } // ADDED AUTHORIZATION
    });
    console.log("Successfully pushed to dashboard:", amount);
  } catch (err) { 
    console.error("Dashboard sync failed. Check if your API allows unauthorized billing updates.", err); 
  }
};

  const fetchCurrentBill = async () => {
    const resId = storage.getItem(SAVED_RES_ID);
    if (!resId) return [];
    try {
      const res = await axios.get(`${API_BASE}/orders/reservation-items/${resId}`);
      setBillItems(res.data || []);
      return res.data;
    } catch (err) { return []; }
  };

  const handleEndSession = async () => {
    const activeTable = storage.getItem(SAVED_TABLE_ID);
    const activeResId = storage.getItem(SAVED_RES_ID);
    const total = calculateTotal();

    if (activeResId && navigator.onLine) {
      await syncWithDashboard(activeResId, total); // Send total one last time
      try {
        await axios.post(`${API_BASE}/orders/finish`, {
          table_id: activeTable,
          reservation_id: activeResId,
        });
      } catch (err) { console.error(err); }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    const keysToRemove = [TIMER_KEY, SAVED_TABLE_ID, SAVED_RES_ID, OFFLINE_QUEUE_KEY, PAYMENT_CHOICE_KEY, "kiosk_active_bundle_id"];
    keysToRemove.forEach((key) => storage.removeItem(key));
    window.location.href = "/kiosk-selection";
  };

  const confirmPaymentChoice = (choice) => {
  storage.setItem(PAYMENT_CHOICE_KEY, choice);
  const resId = storage.getItem(SAVED_RES_ID);
  setShowBillInfo(false);

  if (resId) {
    const total = calculateTotal();
    // Pass the choice to set verified/pending correctly
    syncWithDashboard(
      resId, 
      total, 
      "Cash", 
      choice === "Pay Now" ? "verified" : "pending"
    );
  }
};

  const submitOrderToDatabase = async (tableId = null, itemsToSubmit = null, mode = "Dine-In") => {
    if (!itemsToSubmit || itemsToSubmit.length === 0) return;
    const activeResId = storage.getItem(SAVED_RES_ID);
    const dynamicResId = activeResId || `WALK-${Date.now()}`;

    const processedItems = itemsToSubmit.map((i) => ({
      item_id: i.id, quantity: i.quantity,
      customizations: mode === "Take-Out" ? `[TAKE-OUT] ${i.customizations || ""}` : i.customizations,
      is_refill: i.price === 0,
    }));

    try {
      await axios.post(`${API_BASE}/orders/place`, {
        reservation_id: dynamicResId,
        table_id: tableId,
        items: processedItems,
      });

      finalizeOrderLocally(itemsToSubmit, tableId, dynamicResId);
    } catch (error) {
      finalizeOrderLocally(itemsToSubmit, tableId, dynamicResId);
    }
  };

  const finalizeOrderLocally = (itemsToSubmit, tableId, dynamicResId) => {
  // Calculate total immediately using the items we JUST sent
  const totalWithNewItems = getImmediateTotal(itemsToSubmit, localBillHistory);
  
  // Push to dashboard right now
  syncWithDashboard(dynamicResId, totalWithNewItems);

  // Update states
  setLocalBillHistory((prev) => [...prev, ...itemsToSubmit]);
  storage.setItem(SAVED_TABLE_ID, tableId || "takeout");
  storage.setItem(SAVED_RES_ID, dynamicResId);
  
  setCart([]);
  setShowTablePicker(false);
  setShowTypeModal(false);
  setShowBillInfo(true);
  setIsFinalCheckout(false);
  fetchCurrentBill();
};

  const handlePlaceOrderClick = () => { setShowTypeModal(true); };

  const handleDineInSelection = async () => {
    const fixedTableId = storage.getItem(FIXED_KIOSK_KEY);
    const activeTableId = storage.getItem(SAVED_TABLE_ID);
    const finalTable = activeTableId || fixedTableId;

    if (finalTable && finalTable !== "takeout") {
      setShowTypeModal(false);
      submitOrderToDatabase(finalTable, cart, "Dine-In");
    } else {
      try {
        const res = await axios.get(`${API_BASE}/admin/public/getTable`);
        setAvailableTables(res.data);
        setShowTypeModal(false);
        setTimeout(() => setShowTablePicker(true), 100);
      } catch (err) { alert("Could not load tables."); }
    }
  };

  const handleTakeOutClick = () => { setShowTypeModal(false); submitOrderToDatabase(null, cart, "Take-Out"); };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        const grouped = data.reduce((acc, item) => {
          const cat = item.category_name || "General";
          if (!acc[cat]) acc[cat] = [];
          const targetPath = navigator.onLine && item.local_path ? item.local_path : item.image_url;
          const fullImage = targetPath?.startsWith("http") ? targetPath : `${BASE_URL}${targetPath?.startsWith("/") ? "" : "/"}${targetPath}`;
          acc[cat].push({ id: item.item_id, name: item.name, image: fullImage, price: item.price, category: cat, description: item.description || "" });
          return acc;
        }, {});
        setMenuData(grouped);
        setDynamicFlavors((grouped["Chicken"] || []).map(i => i.name));
        setDynamicRamenFlavors((grouped["Ramen"] || []).map(i => i.name));
        setDynamicDrinks([...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map(i => i.name));
        const firstVisibleCat = Object.keys(grouped).find((cat) => !HIDDEN_CATEGORIES.includes(cat));
        if (firstVisibleCat) setActiveCategory(firstVisibleCat);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    const savedEndTime = storage.getItem(TIMER_KEY);
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      if (remaining > 0) { setTimeLeft(remaining); setIsTimerRunning(true); } else { handleEndSession(); }
    }
    const params = new URLSearchParams(window.location.search);
    const setupId = params.get("setupTable");
    if (setupId) {
      storage.setItem(FIXED_KIOSK_KEY, setupId);  
      alert(`KIOSK CONFIGURED: Table ${setupId}`);
      navigate("/kiosk-selection/kiosk-menu", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        const savedEndTime = storage.getItem(TIMER_KEY);
        const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
        if (remaining <= 0) handleEndSession(); else setTimeLeft(remaining);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const unlockAudio = () => { if (audioRef.current) { audioRef.current.play().then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; }).catch(() => {}); } };
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const hasActiveBundle = Boolean(storage.getItem(TIMER_KEY));

  const handleItemClick = (item) => {
    unlockAudio();
    const name = item.name.toLowerCase();
    if (name.includes("unlimited") || name.includes("ramen")) {
      setSelectedItem(item); setSelectedFlavors([]); setSelectedDrink(""); setIsRefillMode(false); setShowFlavorModal(true);
    } else { setSelectedItem({ ...item, category: "Regular" }); setIsModalOpen(true); }
  };

  const confirmFlavors = () => {
    const isRamen = selectedItem.name.toLowerCase().includes("ramen");
    if (selectedFlavors.length === 0) return alert(`Select a flavor`);
    if (!isRamen && !isRefillMode && !selectedDrink) return alert("Select a drink");
    const customization = isRefillMode ? `REFILL: ${selectedFlavors.join(", ")}` : `${isRamen ? "Ramen: " : "Flavors: "}${selectedFlavors.join(", ")} ${selectedDrink ? "| Drink: " + selectedDrink : ""}`;
    setCart([...cart, { ...selectedItem, quantity: 1, customizations: customization }]);
    setShowFlavorModal(false);
  };

  const handleFinishClick = async () => { setShowSessionModal(false); await fetchCurrentBill(); setIsFinalCheckout(true); setShowBillInfo(true); };

  if (loading) return <div className="loading-container">Loading Menu...</div>;

  return (
    <div className="res-kiosk-container">
      <div className="kiosk-timer-wrapper" style={{ zIndex: 5000 }}>
        <div className="header-id-section" style={{ background: "#222", border: "2px solid #ffcc00", padding: "10px 15px", borderRadius: "10px" }}>
          <ShoppingBag size={20} color="#ffcc00" />
          <div className="id-details" style={{ marginLeft: "10px" }}>
            <span className="id-label" style={{ color: "#ffcc00", fontSize: "10px", fontWeight: "900", display: "block" }}>ORDER MODE</span>
            <span className="id-value" style={{ color: "#fff", fontWeight: "900", display: "block", fontSize: "15px" }}>
              {storage.getItem(FIXED_KIOSK_KEY) ? `TABLE ${storage.getItem(FIXED_KIOSK_KEY)}` : (storage.getItem(SAVED_TABLE_ID) === "takeout" ? "TAKE-OUT" : (storage.getItem(SAVED_TABLE_ID) ? `TABLE ${storage.getItem(SAVED_TABLE_ID)}` : "WALK-IN GUEST"))}
            </span>
          </div>
        </div>
        {storage.getItem(SAVED_RES_ID) && <button className="billing-btn-header" onClick={handleFinishClick} style={{ background: "#ffcc00", color: "#000", border: "none", padding: "8px 15px", borderRadius: "8px", fontWeight: "bold", marginLeft: "10px" }}><CreditCard size={18} className="me-2"/> PAY</button>}
        {isTimerRunning && hasActiveBundle && <div className="timer-box" onClick={() => setShowSessionModal(true)} style={{ cursor: "pointer", border: "2px solid #ffcc00", marginLeft: "auto" }}><Clock size={20} color="#ffcc00" /><span className="timer-text" style={{ color: "#fff" }}>{formatTime(timeLeft)}</span><button className="finish-session-header-btn" onClick={(e) => { e.stopPropagation(); handleFinishClick(); }}>FINISH</button></div>}
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
            {(menuData[activeCategory] || []).map(item => (
              <div key={item.id} className="res-food-card" onClick={() => handleItemClick(item)}>
                <div className="res-card-image-container"><img src={item.image} alt={item.name} className="res-food-img" /></div>
                <div className="res-card-info"><h4 className="res-food-label">{item.name}</h4><p style={{ color: "#ffcc00", fontWeight: "bold" }}>₱{item.price}</p></div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary cart={cart} onRemoveItem={(id) => setCart(cart.filter(i => i.id !== id))} />
      </div>

      <footer className="res-bottom-bar">
         {!storage.getItem(SAVED_RES_ID) && !storage.getItem(FIXED_KIOSK_KEY) && <button className="res-btn-view-all" onClick={() => (window.location.href = "/kiosk-selection")}>Back</button>}
        <div className="res-action-btns"><button className="res-btn-cancel" onClick={() => setCart([])}>Clear Tray</button><button className="res-btn-view" disabled={cart.length === 0} onClick={handlePlaceOrderClick}>Place Order</button></div>
      </footer>

      {showBillInfo && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="res-modal-card" style={{ maxWidth: "450px", width: "90%", textAlign: "center" }}>
            <Receipt size={50} color="#ffcc00" style={{ margin: "0 auto 15px" }} />
            <h2 style={{ color: "#ffcc00" }}>{isFinalCheckout ? "Final Bill Summary" : "Order Summary"}</h2>
            <div className="bill-scroll" style={{ maxHeight: "250px", overflowY: "auto", margin: "20px 0", borderBottom: "1px solid #444" }}>
              {[...localBillHistory, ...cart].map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 5px", color: "#fff" }}><span>{item.name || item.item_name} x{item.quantity || 1}</span><span>₱{(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4rem", fontWeight: "bold", color: "#fff", marginBottom: "30px" }}><span>Total:</span><span style={{ color: "#ffcc00" }}>₱{calculateTotal()}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {isFinalCheckout ? <><button className="res-modal-btn-primary" onClick={handleEndSession}>FINISH</button><button className="res-btn-cancel" onClick={() => setShowBillInfo(false)}>BACK</button></> : <><button className="res-modal-btn-primary" onClick={() => confirmPaymentChoice("Pay Now")}><Banknote size={18} className="me-2"/> PAY NOW</button><button className="res-modal-btn-primary" style={{ background: "#444" }} onClick={() => confirmPaymentChoice("Pay Later")}><Clock size={18} className="me-2"/> PAY LATER</button><button className="res-btn-cancel" onClick={() => setShowBillInfo(false)}>CANCEL</button></>}
            </div>
          </div>
        </div>
      )}

      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}><div className="res-modal-card" style={{ maxWidth: "600px" }}><h2 style={{ color: "#ffcc00", textAlign: "center" }}>{selectedItem?.name.toLowerCase().includes("ramen") ? "Ramen Choice" : "Unlimited Wings"}</h2><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "20px" }}>{(selectedItem?.name.toLowerCase().includes("ramen") ? dynamicRamenFlavors : dynamicFlavors).map(f => (<button key={f} onClick={() => { if (selectedFlavors.includes(f)) setSelectedFlavors(selectedFlavors.filter(x => x !== f)); else { if (selectedItem.name.toLowerCase().includes("ramen")) setSelectedFlavors([f]); else if (selectedFlavors.length < 4) setSelectedFlavors([...selectedFlavors, f]); } }} style={{ padding: "15px", borderRadius: "10px", border: "1px solid #ffcc00", background: selectedFlavors.includes(f) ? "#ffcc00" : "none", color: selectedFlavors.includes(f) ? "#000" : "#fff" }}>{f}</button>))}</div>{!isRefillMode && !selectedItem?.name.toLowerCase().includes("ramen") && (<div style={{ marginTop: "20px" }}><h4 style={{ color: "#fff" }}>Select Drink</h4><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>{dynamicDrinks.map(d => (<button key={d} onClick={() => setSelectedDrink(d)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #555", background: selectedDrink === d ? "#fff" : "none", color: selectedDrink === d ? "#000" : "#fff" }}>{d}</button>))}</div></div>)}<div style={{ display: "flex", gap: "15px", marginTop: "30px" }}><button className="res-btn-cancel" style={{ flex: 1 }} onClick={() => setShowFlavorModal(false)}>Cancel</button><button className="res-modal-btn-primary" style={{ flex: 2 }} onClick={confirmFlavors}>{isRefillMode ? "SEND REFILL" : "ADD TO TRAY"}</button></div></div></div>
      )}

      {showTypeModal && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}><div className="res-modal-card"><h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>Order Mode</h2><div style={{ display: "flex", flexDirection: "column", gap: "15px" }}><button className="res-modal-btn-primary" onClick={handleDineInSelection}>DINE-IN</button>{!cart.some(item => (item.name || "").toLowerCase().includes("unlimited") || (item.category || "").toLowerCase().includes("unlimited")) && (<button className="res-modal-btn-primary" onClick={handleTakeOutClick} style={{ background: "#ffcc00", color: "#000" }}>TAKE-OUT</button>)}<button className="res-btn-cancel" onClick={() => setShowTypeModal(false)}>Cancel</button></div></div></div>
      )}

      {showTablePicker && (
        <div className="res-modal-overlay" style={{ zIndex: 6500 }}><div className="res-modal-card"><h2 style={{ color: "#ffcc00" }}>Select Table</h2><div className="table-grid-kiosk" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", margin: "20px 0" }}>{availableTables.map(table => { const occupied = table.bridge_status?.toLowerCase() === "confirmed" || table.bridge_status?.toLowerCase() === "seated"; return (<button key={table.table_id} disabled={occupied} onClick={() => submitOrderToDatabase(table.table_id, cart)} style={{ padding: "15px", borderRadius: "8px", background: occupied ? "#333" : "#ffcc00", color: occupied ? "#666" : "#000" }}>{table.table_number}</button>); })}</div><button className="res-btn-cancel" onClick={() => setShowTablePicker(false)}>Back</button></div></div>
      )}

      <ReservationOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selectedItem} onAdd={(item) => setCart([...cart, item])} allProducts={menuData} />
    </div>
  );
};

export default KioskMenu;
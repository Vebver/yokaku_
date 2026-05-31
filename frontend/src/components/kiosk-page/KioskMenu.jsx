import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare, Drumstick, CupSoda, Star, ShoppingBag, Flame, Wallet,
  Infinity as InfinityIcon, Pizza, Beef, Package, Utensils, Soup,
  Salad, Clock, Receipt, CreditCard, Banknote, RefreshCw, ArrowLeft,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import axios from "axios";
import alertMusicFile from "../../assets/alert-sound.mp3";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const HIDDEN_CATEGORIES = ["Chicken Wings", "Beverages", "Drinks", "Chicken", "Ramen"];

// ADDED: Constants for the timer
const DURATION = 2 * 60 * 60 * 1000; // 2 Hours in milliseconds

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
  const audioRef = useRef(new Audio(alertMusicFile));
  const storage = window.sessionStorage;

  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_TABLE_ID = "kiosk_active_table_id";
  const SAVED_RES_ID = "kiosk_active_res_id";
  const FIXED_KIOSK_KEY = "kiosk_fixed_table_id";
  const PAYMENT_CHOICE_KEY = "kiosk_payment_choice";
  const TOTAL_PAID_KEY = "kiosk_total_paid";

  // ADDED: Missing Timer States
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [localBillHistory, setLocalBillHistory] = useState([]);
  const [isPaid, setIsPaid] = useState(storage.getItem(PAYMENT_CHOICE_KEY) === "verified");

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillInfo, setShowBillInfo] = useState(false);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isFinalCheckout, setIsFinalCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [availableTables, setAvailableTables] = useState([]);
  const [pendingOrderDetails, setPendingOrderDetails] = useState({ tableId: null, mode: "Dine-In" });
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);

  // ADDED: Helper to format time (00:00:00)
  const formatTime = (seconds) => {
    if (seconds <= 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playCashierAlert = async () => {
    try {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (e) { console.log("Audio blocked:", e); }
  };

const calculateSessionTotal = () => {
  // Use billItems (from server) if available, otherwise use local history
  const history = billItems.length > 0 ? billItems : localBillHistory;
  
  // Combine History + Current Cart
  const combined = [...history, ...cart];

  return combined.reduce((sum, item) => {
    // Check all possible price/qty keys (standardizing the data)
    const p = parseFloat(item.price || item.item_price || item.unit_price || 0);
    const q = parseInt(item.quantity || item.qty || 1);
    return sum + (p * q);
  }, 0);
};
 const calculateTotalDue = () => {
  const totalSession = calculateSessionTotal(); // Everything in history + current tray
  const alreadyPaid = parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0);
  const due = totalSession - alreadyPaid; 
  // If the math is 0 or less, they owe nothing. 
  // If they added new items, "due" will correctly show the price of those new items.
  return due > 0 ? due.toFixed(2) : "0.00";
};

  const syncWithDashboard = async (resId, amount, method = "Cash", status = "pending") => {
    try {
      const token = localStorage.getItem("token") || "";
      await axios.post(`${API_BASE}/billing/walkin`, {
        reservation_id: resId,
        amount: parseFloat(amount),
        payment_method: method,
        payment_status: status,
      }, { headers: { Authorization: `Bearer ${token}` } });
      return true;
    } catch (err) { console.error("Sync failed", err); throw err; }
  };

  const handleEndSession = async () => {
    const activeTable = storage.getItem(SAVED_TABLE_ID);
    const activeResId = storage.getItem(SAVED_RES_ID);
    if (activeResId) {
      try { await axios.post(`${API_BASE}/orders/finish`, { table_id: activeTable, reservation_id: activeResId }); } 
      catch (err) { console.error(err); }
    }
    [TIMER_KEY, SAVED_TABLE_ID, SAVED_RES_ID, PAYMENT_CHOICE_KEY, TOTAL_PAID_KEY].forEach(k => storage.removeItem(k));
    window.location.href = "/kiosk-selection";
  };

  const handleRefillClick = () => {
  // Find the base unlimited item or a specific refill item from your menuData
  // Assuming 'Chicken' category contains the items for refill
  const refillItem = menuData["Chicken"]?.[0] || { name: "Chicken Wings", price: 0 };
  
  setSelectedItem({ ...refillItem, price: 0 }); // Force price to 0 for refills
  setSelectedFlavors([]);
  setSelectedDrink("");
  setShowFlavorModal(true); // Open the same modal you showed in the screenshot
};

  // Timer Logic
  useEffect(() => {
    const syncTimer = () => {
      const savedEnd = sessionStorage.getItem(TIMER_KEY);
      if (!savedEnd) {
        setIsTimerRunning(false);
        return;
      }

      const remaining = Math.max(0, Math.floor((parseInt(savedEnd) - Date.now()) / 1000));
      
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsTimerRunning(true);
      } else {
        setTimeLeft(0);
        setIsTimerRunning(false);
      }
    };

    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentBill = async () => {
    const resId = storage.getItem(SAVED_RES_ID);
    if (!resId) return [];
    try {
      const res = await axios.get(`${API_BASE}/orders/reservation-items/${resId}`);
      setBillItems(res.data || []);
      return res.data;
    } catch (err) { return []; }
  };

 const confirmPaymentChoice = async (choice) => {
  if (isLoading) return;
  const itemsToSubmit = [...cart];
  if (itemsToSubmit.length === 0) return;

  setIsLoading(true);
  const { tableId, mode } = pendingOrderDetails;
  const activeResId = storage.getItem(SAVED_RES_ID);
  const dynamicResId = activeResId || `WALK-${Date.now()}`;
  const isPayNow = choice === "Pay Now";
  
  const hasUnlimited = itemsToSubmit.some(i => i.name.toLowerCase().includes("unlimited"));

  try {
    // 1. Place the order in the database
    await axios.post(`${API_BASE}/orders/place`, {
      reservation_id: dynamicResId,
      table_id: tableId,
      items: itemsToSubmit.map((i) => ({
        item_id: i.id,
        quantity: i.quantity,
        customizations: mode === "Take-Out" ? `[TAKE-OUT] ${i.customizations || ""}` : i.customizations,
        is_refill: i.price === 0,
      })),
      
    });

    // Update local history and clear the current tray
    setLocalBillHistory((prev) => [...prev, ...itemsToSubmit]);
    setCart([]);
    storage.setItem(SAVED_TABLE_ID, tableId || "takeout");
    storage.setItem(SAVED_RES_ID, dynamicResId);

    if (hasUnlimited && !sessionStorage.getItem(TIMER_KEY)) {
      const endTime = Date.now() + DURATION;
      sessionStorage.setItem(TIMER_KEY, endTime.toString());
      setIsTimerRunning(true);
      setTimeLeft(DURATION / 1000);
    }
  setCart([]);

 if (isPayNow) {
  // 1. How much is the user actually handing to the cashier right now?
  // (Total items - what they already paid previously)
  const amountToPayRightNow = parseFloat(calculateTotalDue());

  // 2. What will the NEW "already paid" total be?
  const newTotalPaidInStorage = calculateSessionTotal();

  // 3. Sync ONLY the NEW money to the dashboard
  // If they paid 100 earlier and are paying 50 now, we ONLY send 50.
  await syncWithDashboard(dynamicResId, amountToPayRightNow, "Cash", "verified");

  // 4. Update the storage to the full session total
  storage.setItem(TOTAL_PAID_KEY, newTotalPaidInStorage.toString());
  storage.setItem(PAYMENT_CHOICE_KEY, "verified");

  // 5. Cleanup
  setCart([]); // Clear cart immediately
  setIsPaid(true);
  await playCashierAlert();
  setShowPaymentModal(false);
  setShowBillInfo(true);
  
  // 6. Final Sync: Fetch fresh data from the server
  // This clears 'localBillHistory' and replaces it with 'billItems'
  await fetchCurrentBill(); 
  setLocalBillHistory([]); 
}else {
      setIsPaid(false);
      storage.removeItem(PAYMENT_CHOICE_KEY);
      setShowPaymentModal(false);
    }
  } catch (error) {
    console.error(error);
    alert("Order failed.");
  } finally {
    setIsLoading(false);
  }
};

  const handleHeaderPayClick = async () => {
    setIsPaymentProcessing(false);
    await fetchCurrentBill();
    setIsFinalCheckout(true);
    const due = parseFloat(calculateTotalDue());
    setIsPaid(due <= 0);
    setShowBillInfo(true);
  };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        const grouped = data.reduce((acc, item) => {
          const cat = item.category_name || "General";
          if (!acc[cat]) acc[cat] = [];
          let img = item.local_path || item.image_url;
          if (img && !img.startsWith("http")) {
            const cleanPath = img.startsWith("/") ? img.substring(1) : img;
            const cleanBase = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
            img = `${cleanBase}${cleanPath}`;
          }
          acc[cat].push({ id: item.item_id, name: item.name, image: img, price: item.price, category: cat, description: item.description || "" });
          return acc;
        }, {});
        setMenuData(grouped);
        setDynamicFlavors((grouped["Chicken"] || []).map(i => i.name));
        setDynamicRamenFlavors((grouped["Ramen"] || []).map(i => i.name));
        setDynamicDrinks([...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map(i => i.name));
        const firstVisibleCat = Object.keys(grouped).find(cat => !HIDDEN_CATEGORIES.includes(cat));
        if (firstVisibleCat) setActiveCategory(firstVisibleCat);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchMenu();
  }, []);

  const handleItemClick = (item) => {
  // If the user clicks an item while in the Chicken (Refills) category
  if (activeCategory === "Chicken") {
    setSelectedItem({ ...item, price: 0 }); // FORCE price to 0
    setSelectedFlavors([]);
    setSelectedDrink("");
    setShowFlavorModal(true);
  } 
  // Standard logic for Ramen/Unlimited
  else if (item.name.toLowerCase().includes("unlimited") || item.name.toLowerCase().includes("ramen")) {
    setSelectedItem(item);
    setSelectedFlavors([]);
    setSelectedDrink("");
    setShowFlavorModal(true);
  } 
  // Standard items
  else {
    setSelectedItem({ ...item, category: "Regular" });
    setIsModalOpen(true);
  }
};

const confirmFlavors = () => {
  if (selectedFlavors.length === 0) {
    alert("Please select at least one flavor.");
    return;
  }

  // Check if price is 0 to mark as refill
  const isRefill = parseFloat(selectedItem.price) === 0;
  
  const customization = `${isRefill ? "[REFILL] " : ""}Flavors: ${selectedFlavors.join(", ")}${selectedDrink ? " | Drink: " + selectedDrink : ""}`;

  const newItem = {
    ...selectedItem,
    quantity: 1,
    customizations: customization,
    price: selectedItem.price, 
    is_refill: isRefill
  };

  setCart([...cart, newItem]);
  setShowFlavorModal(false);
  // Reset
  setSelectedFlavors([]);
  setSelectedDrink("");
  setSelectedItem(null);
};

// Add this effect to automatically update the 'isPaid' state based on the balance
useEffect(() => {
  const due = parseFloat(calculateTotalDue());
  if (due > 0) {
    setIsPaid(false);
  } else if (storage.getItem(SAVED_RES_ID)) {
    setIsPaid(true);
  }
}, [cart, billItems]);
  if (loading) return <div className="loading-container">Loading Menu...</div>;


  return (
   <div className="res-kiosk-container">
   <div className="kiosk-timer-wrapper">
  
  {/* LEFT */}
  <div className="header-left-group">
    <div className="header-id-section">
      <ShoppingBag size={20} color="#ffcc00" />
      <div className="id-details">
        <span className="id-label">ORDER MODE</span>
        <span className="id-value">
          {storage.getItem(SAVED_TABLE_ID) === "takeout" ? "TAKE-OUT" : `TABLE ${storage.getItem(SAVED_TABLE_ID) || '?'}`}
        </span>
      </div>
    </div>
  </div>

  {/* CENTER */}
  <div className="header-center-group">
    {isTimerRunning && (
      <>
        <div className="unlimited-timer-pill">
          <span className="timer-tag">Unlimited Time</span>
          <span className={`timer-digits ${timeLeft < 600 ? "urgent" : ""}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        
        <button className="refill-action-btn" onClick={handleRefillClick}>
          <RefreshCw size={20} />
          Refill
        </button>
      </>
    )}
  </div>

  {/* RIGHT */}
  <div className="header-right-group">
    {storage.getItem(SAVED_RES_ID) && (
  <button 
    className="billing-btn-header" 
    onClick={handleHeaderPayClick} 
    style={{ 
       background: parseFloat(calculateTotalDue()) <= 0 ? "#28a745" : "#ffcc00",
       color: parseFloat(calculateTotalDue()) <= 0 ? "#fff" : "#000"
    }}
  >
    <CreditCard size={18} className="me-2" /> 
    {parseFloat(calculateTotalDue()) <= 0 ? "VIEW RECEIPT" : "PAY BILL"}
  </button>
)}
  </div>
</div>
      {/* 2. MAIN CONTENT (Sidebar + Menu Grid + Summary) */}
      <div className="res-main-layout">
        <aside className="res-sidebar">
  <div className="res-brand"><h1>HANGOUT</h1><p>Resto Bar</p></div>
  <div className="res-category-list">
    <div className="res-cat-scroll-wrapper">
      {Object.keys(menuData)
        .filter(cat => !HIDDEN_CATEGORIES.includes(cat)) // ONLY show non-hidden categories
        .map(cat => (
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
</aside>

        <main className="res-content-area">
          <div className="res-grid-container">
            {(menuData[activeCategory] || []).map(item => (
              <div key={item.id} className="res-food-card" onClick={() => handleItemClick(item)}>
                <div className="res-card-image-container">
                  <img src={item.image} alt={item.name} className="res-food-img" onError={(e) => e.target.src = "/fallback-food.png"} />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>
                    {/* If the active category is Chicken (Refills), show ₱0.00 */}
                    {activeCategory === "Chicken" ? "₱0.00 (REFILL)" : `₱${parseFloat(item.price).toFixed(2)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>

        <OrderSummary 
          cart={cart} 
          onRemoveItem={(id) => setCart(cart.filter(i => i.id !== id))} 
        />
      </div>

      {/* 3. BOTTOM ACTION BAR */}
      <footer className="res-bottom-bar">
         {!storage.getItem(SAVED_RES_ID) && (
            <button className="res-btn-cancel" onClick={() => navigate("/kiosk-selection")} style={{ marginRight: "auto", background: "#444", display: "flex", alignItems: "center" }}>
                <ArrowLeft size={18} style={{ marginRight: "8px" }} /> Back
            </button>
         )}
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={() => setCart([])}>Clear Tray</button>
          <button 
  className="res-btn-view" 
  disabled={cart.length === 0} 
  onClick={async () => {
    // 1. Fetch current unpaid items from the database first
    await fetchCurrentBill(); 
    
    // 2. Proceed to show modals
    if (storage.getItem(SAVED_RES_ID)) {
      setPendingOrderDetails({ 
        tableId: storage.getItem(SAVED_TABLE_ID), 
        mode: storage.getItem(SAVED_TABLE_ID) === "takeout" ? "Take-Out" : "Dine-In" 
      });
      setShowPaymentModal(true);
    } else {
      setShowTypeModal(true);
    }
  }}
>
  Place Order ({cart.length})
</button>
        </div>
      </footer>

      {/* 4. MODALS */}
      
      {/* Order Mode Modal */}
      {showTypeModal && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}>
          <div className="res-modal-card">
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>Order Mode</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <button className="res-modal-btn-primary" onClick={() => {
                const fixed = storage.getItem(FIXED_KIOSK_KEY);
                if (fixed) { 
                  setPendingOrderDetails({ tableId: fixed, mode: "Dine-In" }); 
                  setShowTypeModal(false); 
                  setShowPaymentModal(true); 
                } else { 
                  axios.get(`${API_BASE}/admin/public/getTable`).then(r => setAvailableTables(r.data)); 
                  setShowTypeModal(false); 
                  setShowTablePicker(true); 
                }
              }}>DINE-IN</button>
              <button className="res-modal-btn-primary" style={{ background: "#ffcc00", color: "#000" }} onClick={() => { 
                setPendingOrderDetails({ tableId: "takeout", mode: "Take-Out" }); 
                setShowTypeModal(false); 
                setShowPaymentModal(true); 
              }}>TAKE-OUT</button>
              <button className="res-btn-cancel" onClick={() => setShowTypeModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table Picker Modal */}
      {showTablePicker && (
        <div className="res-modal-overlay" style={{ zIndex: 6500 }}>
          <div className="res-modal-card" style={{ maxWidth: "600px" }}>
            <h2 style={{ color: "#ffcc00" }}>Select Your Table</h2>
            <div className="table-grid-kiosk" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", margin: "20px 0" }}>
              {availableTables.map(t => (
                <button 
                  key={t.table_id} 
                  disabled={t.bridge_status === "seated"} 
                  onClick={() => { 
                    setPendingOrderDetails({ tableId: t.table_id, mode: "Dine-In" }); 
                    setShowTablePicker(false); 
                    setShowPaymentModal(true); 
                  }} 
                  style={{ 
                    padding: "15px", 
                    borderRadius: "8px", 
                    border: "none",
                    fontWeight: "bold",
                    background: t.bridge_status === "seated" ? "#333" : "#ffcc00",
                    color: t.bridge_status === "seated" ? "#777" : "#000"
                  }}
                >
                  {t.table_number}
                </button>
              ))}
            </div>
            <button className="res-btn-cancel" onClick={() => setShowTablePicker(false)}>Back</button>
          </div>
        </div>
      )}

      {/* Payment Choice Modal */}
      {showPaymentModal && (
  <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
    <div className="res-modal-card">
      <Receipt size={50} color="#ffcc00" style={{ margin: "0 auto 15px" }} />
      <h2 style={{ color: "#ffcc00" }}>Payment Choice</h2>

      {/* FIX: Use calculateTotalDue() so it subtracts previous payments */}
      <p style={{ color: "#fff", fontSize: "1.4rem", fontWeight: "bold" }}>
        Amount to Pay: <span style={{ color: "#ffcc00" }}>₱{calculateTotalDue()}</span>
      </p>
      
      <p style={{ color: "#888", fontSize: "0.8rem" }}>
        (Items already paid have been cleared from this total)
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
        <button className="res-modal-btn-primary" disabled={isLoading} onClick={() => confirmPaymentChoice("Pay Now")}>
          <Banknote size={18} className="me-2"/> PAY NOW (CASHIER)
        </button>
        <button className="res-modal-btn-primary" disabled={isLoading} style={{ background: "#444" }} onClick={() => confirmPaymentChoice("Pay Later")}>
          <Clock size={18} className="me-2"/> ORDER NOW, PAY LATER
        </button>
        <button className="res-btn-cancel" onClick={() => setShowPaymentModal(false)}>Back</button>
      </div>
    </div>
  </div>
)}
      {/* Bill Info / Receipt Modal */}
     {showBillInfo && (
  <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
    <div className="res-modal-card">
      <Receipt size={50} color="#ffcc00" style={{ margin: "0 auto 15px" }} />
      <h2 style={{ color: "#ffcc00" }}>{isFinalCheckout ? "Bill Summary" : "Current Tray"}</h2>
      
      {/* ... (Keep your bill items mapping here) ... */}

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4rem", fontWeight: "bold", color: "#fff" }}>
        <span>Total Due:</span>
        <span style={{ color: "#ffcc00" }}>₱{calculateTotalDue()}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
        
        {/* NEW LOGIC: Check balance to decide which button to show */}
        {parseFloat(calculateTotalDue()) > 0 ? (
          /* SHOW PAY NOW IF MONEY IS OWED */
          <button 
            className="res-modal-btn-primary" 
            onClick={async () => {
              const due = parseFloat(calculateTotalDue());
              await syncWithDashboard(storage.getItem(SAVED_RES_ID), due, "Cash", "verified");
              const newTotalPaid = parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0) + due;
              storage.setItem(TOTAL_PAID_KEY, newTotalPaid.toString());
              await fetchCurrentBill();
              await playCashierAlert();
            }}
          >
            <Banknote size={18} className="me-2" /> PAY NOW (₱{calculateTotalDue()})
          </button>
        ) : (
          /* SHOW FINISH SESSION ONLY IF BALANCE IS 0 */
          <button 
            className="res-modal-btn-primary" 
            style={{ background: "#28a745" }} 
            onClick={handleEndSession}
          >
            FINISH SESSION
          </button>
        )}

        <button className="res-btn-cancel" onClick={() => setShowBillInfo(false)}>
          {parseFloat(calculateTotalDue()) > 0 ? "Pay Later & Exit Menu" : "Close"}
        </button>
      </div>
    </div>
  </div>
)}
      {/* Flavor Customization Modal */}
      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}>
          <div className="res-modal-card flavor-modal-wide">
            <h2 className="modal-title-yellow">Customize Your Order</h2>
            <div className="customization-scroll-area">
              <section className="modal-section">
                <h3 className="section-label">Select Flavors (Multiple)</h3>
                <div className="flavor-grid">
                  {(selectedItem?.name.toLowerCase().includes("ramen") ? dynamicRamenFlavors : dynamicFlavors).map(f => (
                    <button 
                      key={f} 
                      onClick={() => setSelectedFlavors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} 
                      className={`flavor-btn ${selectedFlavors.includes(f) ? "active" : ""}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </section>

              <section className="modal-section">
                <h3 className="section-label">Select Drink (Choose One)</h3>
                <div className="drink-grid">
                  {dynamicDrinks.map(d => (
                    <button 
                      key={d} 
                      onClick={() => setSelectedDrink(d)} 
                      className={`flavor-btn ${selectedDrink === d ? "active-drink" : ""}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="modal-footer-actions">
              <button className="res-btn-cancel-ui" onClick={() => setShowFlavorModal(false)}>Cancel</button>
              <button className="res-btn-confirm-ui" onClick={confirmFlavors}>Add to Tray</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="res-modal-overlay" style={{ zIndex: 11000, background: "rgba(0, 0, 0, 0.8)" }}>
          <div style={{ textAlign: "center" }}>
            <RefreshCw className="spinner-loader" color="#ffcc00" size={60} />
            <p style={{ color: "#fff", marginTop: "15px", fontWeight: "bold" }}>Processing Order...</p>
          </div>
        </div>
      )}

      {/* Standard Item Modal */}
      <ReservationOrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        item={selectedItem} 
        onAdd={(i) => setCart([...cart, i])} 
        allProducts={menuData} 
      />

      <style>{`
        .spinner-loader { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-fast { animation: spin 0.5s linear infinite; }
        .urgent { color: #ff4444 !important; animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0.5; } }
      `}</style>
    </div>
    )};

export default KioskMenu;
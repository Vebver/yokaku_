import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare,
  Drumstick,
  CupSoda,
  Star,
  ShoppingBag,
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
  Receipt,
  CreditCard,
  Banknote,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import axios from "axios";
import alertMusicFile from "../../assets/alert-sound.mp3";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const HIDDEN_CATEGORIES = ["Chicken Wings", "Beverages", "Drinks", "Chicken", "Ramen"];

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
  const audioRef = useRef(new Audio(alertMusicFile));
  const storage = window.sessionStorage;

  const playCashierAlert = async () => {
    try {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (e) { console.log("Audio blocked:", e); }
  };

  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_TABLE_ID = "kiosk_active_table_id";
  const SAVED_RES_ID = "kiosk_active_res_id";
  const FIXED_KIOSK_KEY = "kiosk_fixed_table_id";
  const PAYMENT_CHOICE_KEY = "kiosk_payment_choice";
  const TOTAL_PAID_KEY = "kiosk_total_paid"; 

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [localBillHistory, setLocalBillHistory] = useState([]);
  const [isPaid, setIsPaid] = useState(storage.getItem(PAYMENT_CHOICE_KEY) === "verified");

  const [timeLeft, setTimeLeft] = useState(1860);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

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
  const [isRefillMode, setIsRefillMode] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [pendingOrderDetails, setPendingOrderDetails] = useState({ tableId: null, mode: "Dine-In" });
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const calculateSessionTotal = () => {
    const history = billItems.length > 0 ? billItems : localBillHistory;
    const combined = [...history, ...cart];
    return combined.reduce((sum, item) => {
      const p = parseFloat(item.price || item.item_price || item.unit_price || 0);
      const q = parseInt(item.quantity || item.qty || 1);
      return sum + (p * q);
    }, 0);
  };

  const calculateTotalDue = () => {
    if (isPaid) return "0.00"; // If marked as paid, strictly show zero
    const totalSession = calculateSessionTotal();
    const alreadyPaid = parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0);
    const due = totalSession - alreadyPaid;
    return due > 0 ? due.toFixed(2) : "0.00";
  };

  const calculateTrayTotal = () => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0).toFixed(2);
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

    try {
      // 1. Calculate cumulative snapshot for DB sync
      const currentHistory = billItems.length > 0 ? billItems : localBillHistory;
      const trayTotal = itemsToSubmit.reduce((sum, i) => sum + (parseFloat(i.price || 0) * (i.quantity || 1)), 0);
      const historyTotal = currentHistory.reduce((sum, i) => sum + (parseFloat(i.price || i.item_price || 0) * (i.quantity || 1)), 0);
      const newSessionTotal = (historyTotal + trayTotal).toFixed(2);

      // 2. Place Order
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

      // 3. Update State
      setLocalBillHistory((prev) => [...prev, ...itemsToSubmit]);
      setCart([]);
      storage.setItem(SAVED_TABLE_ID, tableId || "takeout");
      storage.setItem(SAVED_RES_ID, dynamicResId);

      // 4. If Pay Now, finalize payment trackers immediately
      if (isPayNow) {
        await syncWithDashboard(dynamicResId, newSessionTotal, "Cash", "verified");
        storage.setItem(TOTAL_PAID_KEY, newSessionTotal);
        storage.setItem(PAYMENT_CHOICE_KEY, "verified");
        setIsPaid(true); // <--- Sets this TRUE for the next modal
        
        await playCashierAlert();
        setShowPaymentModal(false);
        setShowBillInfo(true);
        await fetchCurrentBill();
      } else {
        // If pay later, mark as unpaid because balance increased
        setIsPaid(false);
        storage.removeItem(PAYMENT_CHOICE_KEY);
        setShowPaymentModal(false);
      }
    } catch (error) {
      setCart(itemsToSubmit);
      alert("Order failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderPayClick = async () => {
    setIsPaymentProcessing(false);
    await fetchCurrentBill();
    setIsFinalCheckout(true);
    // Determine if everything is already paid
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
    if (item.name.toLowerCase().includes("unlimited") || item.name.toLowerCase().includes("ramen")) {
      setSelectedItem(item); setSelectedFlavors([]); setSelectedDrink(""); setIsRefillMode(false); setShowFlavorModal(true);
    } else { setSelectedItem({ ...item, category: "Regular" }); setIsModalOpen(true); }
  };

  const confirmFlavors = () => {
    const customization = `Flavors: ${selectedFlavors.join(", ")} ${selectedDrink ? "| Drink: " + selectedDrink : ""}`;
    setCart([...cart, { ...selectedItem, quantity: 1, customizations }]);
    setShowFlavorModal(false);
  };

  if (loading) return <div className="loading-container">Loading Menu...</div>;

  return (
    <div className="res-kiosk-container">
      {/* HEADER */}
      <div className="kiosk-timer-wrapper" style={{ zIndex: 5000 }}>
        <div className="header-id-section" style={{ background: "#222", border: "2px solid #ffcc00", padding: "10px 15px", borderRadius: "10px" }}>
          <ShoppingBag size={20} color="#ffcc00" />
          <div className="id-details" style={{ marginLeft: "10px" }}>
            <span className="id-label" style={{ color: "#ffcc00", fontSize: "10px", fontWeight: "900", display: "block" }}>ORDER MODE</span>
            <span className="id-value" style={{ color: "#fff", fontWeight: "900", fontSize: "15px" }}>
              {storage.getItem(SAVED_TABLE_ID) === "takeout" ? "TAKE-OUT" : storage.getItem(SAVED_TABLE_ID) ? `TABLE ${storage.getItem(SAVED_TABLE_ID)}` : "WALK-IN"}
            </span>
          </div>
        </div>

        {storage.getItem(SAVED_RES_ID) && (
          <button className="billing-btn-header" onClick={handleHeaderPayClick} style={{ background: isPaid ? "#28a745" : "#ffcc00", color: isPaid ? "#fff" : "#000", border: "none", padding: "8px 15px", borderRadius: "8px", fontWeight: "bold", marginLeft: "10px" }}>
            <CreditCard size={18} className="me-2" /> {isPaid ? "VIEW RECEIPT" : "PAY"}
          </button>
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
            {(menuData[activeCategory] || []).map(item => (
              <div key={item.id} className="res-food-card" onClick={() => handleItemClick(item)}>
                <div className="res-card-image-container"><img src={item.image} alt={item.name} className="res-food-img" /></div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>₱{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary cart={cart} onRemoveItem={(id) => setCart(cart.filter(i => i.id !== id))} />
      </div>

      <footer className="res-bottom-bar">
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={() => setCart([])}>Clear Tray</button>
          <button className="res-btn-view" disabled={cart.length === 0} onClick={() => setShowTypeModal(true)}>Place Order</button>
        </div>
      </footer>

      {showTypeModal && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}>
          <div className="res-modal-card">
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>Order Mode</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <button className="res-modal-btn-primary" onClick={() => {
                const fixed = storage.getItem(FIXED_KIOSK_KEY);
                if (fixed) { setPendingOrderDetails({ tableId: fixed, mode: "Dine-In" }); setShowTypeModal(false); setShowPaymentModal(true); }
                else { axios.get(`${API_BASE}/admin/public/getTable`).then(r => setAvailableTables(r.data)); setShowTypeModal(false); setShowTablePicker(true); }
              }}>DINE-IN</button>
              <button className="res-modal-btn-primary" style={{ background: "#ffcc00", color: "#000" }} onClick={() => { setPendingOrderDetails({ tableId: null, mode: "Take-Out" }); setShowTypeModal(false); setShowPaymentModal(true); }}>TAKE-OUT</button>
              <button className="res-btn-cancel" onClick={() => setShowTypeModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTablePicker && (
        <div className="res-modal-overlay" style={{ zIndex: 6500 }}>
          <div className="res-modal-card">
            <h2 style={{ color: "#ffcc00" }}>Select Table</h2>
            <div className="table-grid-kiosk" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", margin: "20px 0" }}>
              {availableTables.map(t => (
                <button key={t.table_id} disabled={t.bridge_status === "seated"} onClick={() => { setPendingOrderDetails({ tableId: t.table_id, mode: "Dine-In" }); setShowTablePicker(false); setShowPaymentModal(true); }} style={{ padding: "15px", borderRadius: "8px", background: t.bridge_status === "seated" ? "#333" : "#ffcc00" }}>{t.table_number}</button>
              ))}
            </div>
            <button className="res-btn-cancel" onClick={() => setShowTablePicker(false)}>Back</button>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="res-modal-card" style={{ maxWidth: "450px", textAlign: "center" }}>
            <Receipt size={50} color="#ffcc00" style={{ margin: "0 auto 15px" }} />
            <h2 style={{ color: "#ffcc00" }}>Payment Choice</h2>
            <p style={{ color: "#fff", fontSize: "1.2rem" }}>Total Amount: <span style={{ color: "#ffcc00" }}>₱{calculateTrayTotal()}</span></p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              <button className="res-modal-btn-primary" onClick={() => confirmPaymentChoice("Pay Now")}>PAY NOW</button>
              <button className="res-modal-btn-primary" style={{ background: "#444" }} onClick={() => confirmPaymentChoice("Pay Later")}>PAY LATER</button>
            </div>
          </div>
        </div>
      )}

      {showBillInfo && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="res-modal-card" style={{ maxWidth: "450px", width: "90%", textAlign: "center" }}>
            <Receipt size={50} color="#ffcc00" style={{ margin: "0 auto 15px" }} />
            <h2 style={{ color: "#ffcc00" }}>{isFinalCheckout ? "Final Bill Summary" : "Order Summary"}</h2>
            <div className="bill-scroll" style={{ maxHeight: "250px", overflowY: "auto", margin: "20px 0", borderBottom: "1px solid #444" }}>
              {(billItems.length > 0 ? billItems : localBillHistory).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 5px", color: "#fff" }}>
                  <span>{item.name || item.item_name} x{item.quantity || item.qty || 1}</span>
                  <span>₱{(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4rem", fontWeight: "bold", color: "#fff", marginBottom: "30px" }}>
              <span>Total Due:</span>
              <span style={{ color: "#ffcc00" }}>₱{calculateTotalDue()}</span>
            </div>
            {isPaid && <p style={{ color: "#28a745", fontWeight: "bold", marginTop: "-20px", marginBottom: "20px" }}>Payment recorded!</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {isFinalCheckout ? (
                <>
                  <button className="res-modal-btn-primary" disabled={isPaid || isPaymentProcessing} onClick={async () => {
                      if (isPaymentProcessing || isPaid) return;
                      setIsPaymentProcessing(true);
                      try {
                        const resId = storage.getItem(SAVED_RES_ID);
                        const fullTotal = calculateSessionTotal();
                        await syncWithDashboard(resId, fullTotal, "Cash", "verified");
                        storage.setItem(TOTAL_PAID_KEY, fullTotal.toString());
                        storage.setItem(PAYMENT_CHOICE_KEY, "verified");
                        setIsPaid(true);
                        await playCashierAlert();
                      } catch (e) { alert("Sync failed."); } finally { setIsPaymentProcessing(false); }
                    }} style={{ opacity: (isPaid || isPaymentProcessing) ? 0.5 : 1, background: isPaid ? "#666" : "#ffcc00" }}>
                    {isPaid ? "PAYMENT VERIFIED" : "PAY NOW"}
                  </button>
                  <button className="res-modal-btn-primary" style={{ background: "#28a745" }} onClick={handleEndSession}>FINISH SESSION</button>
                  <button className="res-btn-cancel" onClick={() => setShowBillInfo(false)}><ArrowLeft size={18} className="me-2" /> Back</button>
                </>
              ) : (
                <button className="res-modal-btn-primary" onClick={() => setShowBillInfo(false)}>CLOSE</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}>
          <div className="res-modal-card" style={{ maxWidth: "600px" }}>
            <h2 style={{ color: "#ffcc00" }}>Customize</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "20px" }}>
              {(selectedItem?.name.toLowerCase().includes("ramen") ? dynamicRamenFlavors : dynamicFlavors).map(f => (
                <button key={f} onClick={() => setSelectedFlavors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} style={{ padding: "15px", borderRadius: "10px", background: selectedFlavors.includes(f) ? "#ffcc00" : "none", color: selectedFlavors.includes(f) ? "#000" : "#fff", border: "1px solid #ffcc00" }}>{f}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
              <button className="res-btn-cancel" onClick={() => setShowFlavorModal(false)}>Cancel</button>
              <button className="res-modal-btn-primary" onClick={confirmFlavors}>Add to Tray</button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="res-modal-overlay" style={{ zIndex: 11000, background: "rgba(0, 0, 0, 0.8)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
            <RefreshCw className="spinner-loader" color="#ffcc00" size={60} />
            <h2 style={{ color: "#ffcc00" }}>Processing...</h2>
          </div>
        </div>
      )}

      <ReservationOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selectedItem} onAdd={(i) => setCart([...cart, i])} allProducts={menuData} />
      <style>{` .spinner-loader { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
    </div>
  );
};

export default KioskMenu;
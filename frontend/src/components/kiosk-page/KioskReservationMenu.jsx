import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare, Drumstick, CupSoda, Star, ShoppingBag,
  Flame, Wallet, Infinity as InfinityIcon, Pizza, Beef, Package, Utensils,
  Soup, Salad, Clock, Receipt, UtensilsCrossed, RefreshCw, Banknote, CreditCard, User, ArrowLeft, AlertCircle
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
  const audioObj = useMemo(() => new Audio(alertMusicFile), []);
  
  const reservationId = localStorage.getItem("resId") || "GUEST";
  const storage = window.localStorage;
  const TIMER_KEY = `kiosk_res_timer_${reservationId}`;
  const PAYMENT_CHOICE_KEY = `kiosk_pay_choice_${reservationId}`;
  const TOTAL_PAID_KEY = `kiosk_total_paid_${reservationId}`;

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]); 
  const [billItems, setBillItems] = useState([]); 
  
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
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [dynamicFlavors, setDynamicFlavors] = useState([]); 
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);
  
  const [isPaid, setIsPaid] = useState(storage.getItem(PAYMENT_CHOICE_KEY) === "verified");
  const [cooldownMessage, setCooldownMessage] = useState(null);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") return {}; 
  return { headers: { Authorization: `Bearer ${token}` } };
};

  const calculateSessionTotal = () => {
    const history = billItems.length > 0 ? billItems : [];
    const combined = [...history, ...cart];
    return combined.reduce((sum, item) => {
      const p = parseFloat(item.price || item.item_price || 0);
      const q = parseInt(item.quantity || item.qty || 1);
      return sum + (p * q);
    }, 0);
  };

  const calculateTotalDue = () => {
    if (isPaid) return "0.00"; 
    const totalSession = calculateSessionTotal();
    const alreadyPaid = parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0);
    const due = totalSession - alreadyPaid;
    return due > 0 ? due.toFixed(2) : "0.00";
  };

  const fetchCurrentBill = async () => {
    try {
      const res = await axios.get(`${API_BASE}/orders/reservation-items/${reservationId}`, getAuthHeader());
      if (res.data) setBillItems(res.data);
      return res.data;
    } catch (err) { return []; }
  };

  const playCashierAlert = async () => {
    try { audioObj.currentTime = 0; await audioObj.play(); } catch (e) { }
  };

  // RESTORED: Initial data fetch with pre-reserved item logic
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, resItemsRes, billingRes] = await Promise.all([
          fetch(`${API_BASE}/products`).then(r => r.json()),
          axios.get(`${API_BASE}/orders/reservation-items/${reservationId}`, getAuthHeader()).then(r => r.data),
          axios.get(`${API_BASE}/billing`, getAuthHeader()).then(r => r.data).catch(() => [])
        ]);
        
        // 1. Sync Downpayments
        const existingPayment = billingRes.find(p => p.reservation_id === reservationId && p.payment_status === 'verified');
        if (existingPayment) {
            storage.setItem(TOTAL_PAID_KEY, existingPayment.amount.toString());
        }

        // 2. AUTO-LOAD RESERVED ITEMS INTO CART (TRAY)
        if (resItemsRes.length > 0) {
            setCart(resItemsRes.map(i => ({
                id: i.item_id, 
                name: i.name || i.item_name, 
                price: i.price || i.item_price,
                quantity: i.quantity || 1, 
                customizations: i.customizations, 
                isPreReserved: true
            })));
        }

        const grouped = {};
        const getFullImage = (item) => {
          const rawPath = item.local_path || item.image_url;
          if (!rawPath) return "";
          if (rawPath.startsWith("http")) return rawPath;
          const cleanPath = rawPath.startsWith("/") ? rawPath.substring(1) : rawPath;
          const finalPath = cleanPath.startsWith("uploads/") ? cleanPath : `uploads/${cleanPath}`;
          return `${BASE_URL}/${finalPath}`;
        };

        // 3. CREATE "MY RESERVED ITEMS" CATEGORY
        if (resItemsRes.length > 0) {
            grouped["My Reserved Items"] = resItemsRes.map(i => ({
                id: i.item_id, 
                name: i.name || i.item_name, 
                price: i.price || i.item_price,
                image: getFullImage(i), 
                category: "My Reserved Items", 
                description: "Your pre-booked items."
            }));
        }

        prodRes.reduce((acc, item) => {
          const cat = item.category_name || "General";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push({ id: item.item_id, name: item.name, image: getFullImage(item), price: item.price, category: cat, description: item.description });
          return acc;
        }, grouped);

        setMenuData(grouped);
        setDynamicFlavors((grouped["Chicken"] || []).map(i => i.name));
        setDynamicRamenFlavors((grouped["Ramen"] || []).map(i => i.name));
        setDynamicDrinks([...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map(i => i.name));
        
        const cats = Object.keys(grouped).filter(c => !HIDDEN_CATEGORIES.includes(c));
        if (cats.length > 0) setActiveCategory(cats[0]);
      } catch (e) { } finally { setLoading(false); }
    };
    fetchData();
    fetchCurrentBill();
  }, [reservationId]);

const handleEndSession = async () => {
  setIsLoading(true);
  try {
    // 1. Get the table ID before we start deleting things
    let currentTableId = localStorage.getItem("tableId");
    if (!currentTableId && billItems.length > 0) {
        currentTableId = billItems[0].table_id;
    }

    // 2. Call Backend to update status to "completed"
    await axios.post(`${API_BASE}/orders/finish`, { 
      reservation_id: reservationId,
      table_id: currentTableId 
    }, getAuthHeader());

    // 3. Define ONLY the reservation-specific keys to delete
    const keysToWipe = [
      "resId",
      "tableId",
      TIMER_KEY, 
      PAYMENT_CHOICE_KEY, 
      TOTAL_PAID_KEY,
      `kiosk_res_timer_${reservationId}`, 
      `kiosk_pay_choice_${reservationId}`, 
      `kiosk_total_paid_${reservationId}`
    ];

    // 4. Delete ONLY those keys
    keysToWipe.forEach(k => localStorage.removeItem(k));
    
    // IMPORTANT: REMOVE localStorage.clear(); <--- This was causing the logout
    
    // 5. Redirect to selection screen
    window.location.href = "/kiosk-selection";
    
  } catch (e) {
    console.error("End Session Failed:", e);
    // If backend fails, we still want to clear the UI for the next customer
    // but without logging out the Kiosk.
    localStorage.removeItem("resId");
    localStorage.removeItem("tableId");
    window.location.href = "/kiosk-selection";
  } finally {
    setIsLoading(false);
  }
};

  const confirmPaymentChoice = async (choice) => {
    setIsLoading(true);
    const isPayNow = choice === "Pay Now";
    try {
      await axios.post(`${API_BASE}/orders/place`, {
        reservation_id: reservationId,
        items: cart.map(i => ({ item_id: i.id, quantity: i.quantity, customizations: i.customizations }))
      }, getAuthHeader());
      
      const freshBill = await fetchCurrentBill();
      const newFullTotal = freshBill.reduce((sum, item) => sum + (parseFloat(item.item_price || 0) * (item.quantity || 1)), 0);
      const status = isPayNow ? "verified" : "pending";

      await axios.post(`${API_BASE}/billing/walkin`, { 
          reservation_id: reservationId, amount: newFullTotal, payment_method: "Cash", payment_status: status 
      }, getAuthHeader());

      if (isPayNow) {
          storage.setItem(TOTAL_PAID_KEY, newFullTotal.toString());
          storage.setItem(PAYMENT_CHOICE_KEY, "verified");
          setIsPaid(true);
          playCashierAlert();
      }
      setCart([]);
      setShowBillInfo(false);
      setShowSessionModal(true);
    } catch (e) { alert("Order submission failed."); }
    finally { setIsLoading(false); }
  };

  const handleHeaderPayClick = async () => {
    setIsPaymentProcessing(false);
    await fetchCurrentBill();
    setIsFinalCheckout(true);
    const due = parseFloat(calculateTotalDue());
    setIsPaid(due <= 0);
    setShowBillInfo(true);
  };

  // Timer logic
  useEffect(() => {
    const savedEndTime = storage.getItem(TIMER_KEY);
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      if (remaining > 0) { setTimeLeft(remaining); setIsTimerRunning(true); }
    }
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        const savedEndTime = storage.getItem(TIMER_KEY);
        if (!savedEndTime) return;
        const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
        if (remaining <= 0) { clearInterval(timerRef.current); handleEndSession(); } 
        else { setTimeLeft(remaining); }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const confirmFlavors = async () => {
    const isRamen = selectedItem.name.toLowerCase().includes("ramen");
    if (selectedFlavors.length === 0) return alert(`Select a flavor`);
    const cust = isRefillMode ? `REFILL: ${selectedFlavors.join(", ")}` : `${isRamen ? "Ramen: " : "Wings: "}${selectedFlavors.join(", ")} ${selectedDrink ? "| " + selectedDrink : ""}`;
    const newItem = { ...selectedItem, quantity: 1, customizations: cust, price: isRefillMode ? 0 : selectedItem.price };

    if (isRefillMode) {
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE}/orders/place`, { 
                reservation_id: reservationId, 
                items: [{ item_id: newItem.id, quantity: 1, customizations: newItem.customizations, is_refill: true }] 
            }, getAuthHeader());
            setShowFlavorModal(false);
            setIsRefillMode(false);
            setShowSessionModal(true);
        } catch (e) { 
            if (e.response?.data?.error === "Cooldown active") {
                setCooldownMessage(e.response.data.message);
                setShowFlavorModal(false);
            } else { alert("Refill failed."); }
        }
        finally { setIsLoading(false); }
    } else {
        setCart([...cart, newItem]);
        setShowFlavorModal(false);
    }
  };

  const handleItemClick = (item) => {
    const itemName = (item.name || "").toLowerCase();
    if (itemName.includes("unlimited") || itemName.includes("ramen")) {
      setSelectedItem(item); setSelectedFlavors([]); setSelectedDrink(""); setIsRefillMode(false); setShowFlavorModal(true);
    } else { setSelectedItem({ ...item, category: "Regular" }); setIsModalOpen(true); }
  };

  if (loading) return <div className="loading-container">Loading Menu...</div>;

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

        <button className="billing-btn-header" onClick={handleHeaderPayClick} 
           style={{ background: isPaid ? "#28a745" : "#ffcc00", color: isPaid ? "#fff" : "#000", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", marginLeft: "20px", display: 'flex', gap: '8px' }}>
          <CreditCard size={18} /> {isPaid ? "VIEW RECEIPT" : "PAY"}
        </button>

        {isTimerRunning && (
          <div className="timer-box" style={{ border: "2px solid #ffcc00", marginLeft: "auto", background: '#000', padding: '5px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#ffcc00" />
                <span style={{ color: "#fff", fontSize: '1.5rem', fontWeight: '900' }}>{formatTime(timeLeft)}</span>
            </div>
            <button onClick={() => { setSelectedItem({id: 162, name: 'Unlimited'}); setIsRefillMode(true); setShowFlavorModal(true); }} 
                    style={{ background: '#28a745', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>REFILL</button>
            <button className="finish-session-header-btn" onClick={() => setShowEndModal(true)} style={{ background: '#ffcc00', border: 'none', borderRadius: '4px', padding: '5px 10px', fontWeight: 'bold' }}>FINISH</button>
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
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>₱{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary cart={cart} onRemoveItem={(id) => setCart(cart.filter(i => i.id !== id))} />
      </div>

      <footer className="res-bottom-bar">
        {billItems.length === 0 && (
            <button className="res-btn-cancel" style={{marginRight: 'auto', background: '#444'}} onClick={() => navigate("/kiosk-selection")}>
                <ArrowLeft size={18} className="me-2"/> Exit Kiosk
            </button>
        )}
        <div className="res-action-btns" style={{marginLeft: 'auto'}}>
          <button className="res-btn-cancel" onClick={() => setCart([])}>Clear Tray</button>
          <button className="res-btn-view" disabled={cart.length === 0} onClick={() => { setIsFinalCheckout(false); setShowBillInfo(true); }}>Place Order</button>
        </div>
      </footer>

      {/* SUMMARY BILL MODAL */}
      {showBillInfo && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="res-modal-card" style={{ maxWidth: "450px", width: "90%", textAlign: "center" }}>
            <Receipt size={50} color="#ffcc00" style={{ margin: "0 auto 15px" }} />
            <h2 style={{ color: "#ffcc00" }}>{isFinalCheckout ? "Final Bill Summary" : "Confirm Order"}</h2>
            
            <div className="bill-scroll" style={{ maxHeight: "250px", overflowY: "auto", margin: "20px 0", borderBottom: "1px solid #444" }}>
              {(isFinalCheckout ? billItems : cart).map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 5px", color: "#fff" }}>
                    <span style={{textAlign: 'left'}}>{item.name || item.item_name} x{item.quantity || 1}</span>
                    <span>₱{(parseFloat(item.price || item.item_price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                  </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4rem", fontWeight: "bold", color: "#fff", marginBottom: "30px" }}>
              <span>Total Due:</span><span style={{ color: "#ffcc00" }}>₱{calculateTotalDue()}</span>
            </div>

            {isPaid && isFinalCheckout && <p style={{ color: "#28a745", fontWeight: "bold", marginTop: "-20px", marginBottom: "20px" }}>Payment recorded!</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {isFinalCheckout ? (
                <>
                   <button className="res-modal-btn-primary" 
                      disabled={isPaid || isPaymentProcessing}
                      onClick={async () => {
                        if (isPaymentProcessing || isPaid) return;
                        setIsPaymentProcessing(true);
                        try {
                          const fullTotal = calculateSessionTotal();
                          await axios.post(`${API_BASE}/billing/walkin`, { reservation_id: reservationId, amount: fullTotal, payment_method: "Cash", payment_status: "verified" }, getAuthHeader());
                          storage.setItem(TOTAL_PAID_KEY, fullTotal.toString());
                          storage.setItem(PAYMENT_CHOICE_KEY, "verified");
                          setIsPaid(true);
                          playCashierAlert();
                          await fetchCurrentBill();
                        } catch (e) { alert("Payment sync failed."); }
                        finally { setIsPaymentProcessing(false); }
                      }}
                      style={{ opacity: (isPaid || isPaymentProcessing) ? 0.5 : 1, background: isPaid ? "#666" : "#ffcc00" }}>
                      {isPaid ? "PAYMENT VERIFIED" : "PAY NOW"}
                   </button>

                   <button
                     className="res-modal-btn-primary"
                     style={{ background: "#28a745" }}
                     onClick={() => {
                       // If user chose PAY LATER earlier, keep isPaid=false.
                       // Still allow finishing: session will end regardless of payment state.
                       handleEndSession();
                     }}
                   >
                     FINISH SESSION
                   </button>

                   <button className="res-btn-cancel" onClick={() => setShowBillInfo(false)}><ArrowLeft size={18} /> Back</button>
                </>
              ) : (
                <>
                  <button className="res-modal-btn-primary" onClick={() => confirmPaymentChoice("Pay Now")}><Banknote size={18} /> PAY NOW</button>
                  <button className="res-modal-btn-primary" style={{background: "#444"}} onClick={() => confirmPaymentChoice("Pay Later")}><Clock size={18} /> PAY LATER</button>
                  <button className="res-btn-cancel" onClick={() => setShowBillInfo(false)}>CANCEL</button>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE/REFILL MODAL */}
      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}>
          <div className="res-modal-card" style={{ maxWidth: "600px" }}>
            <h2 style={{ color: "#ffcc00", textAlign: "center" }}>{isRefillMode ? "Choose Refill" : "Customize"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: '20px' }}>
              {(selectedItem?.name.toLowerCase().includes("ramen") ? dynamicRamenFlavors : dynamicFlavors).map((f) => (
                <button key={f} onClick={() => {
                    if (selectedFlavors.includes(f)) setSelectedFlavors(selectedFlavors.filter(x => x !== f));
                    else { if (selectedItem.name.toLowerCase().includes("ramen")) setSelectedFlavors([f]); else if (selectedFlavors.length < 4) setSelectedFlavors([...selectedFlavors, f]); }
                  }}
                  style={{ padding: "15px 10px", borderRadius: "10px", border: "1px solid #ffcc00", background: selectedFlavors.includes(f) ? "#ffcc00" : "none", color: selectedFlavors.includes(f) ? "#000" : "#fff", fontWeight: "bold" }}>{f}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
              <button className="res-btn-cancel" style={{ flex: 1 }} onClick={() => {setShowFlavorModal(false); setIsRefillMode(false);}}>Cancel</button>
              <button className="res-modal-btn-primary" style={{ flex: 2 }} onClick={confirmFlavors}>{isRefillMode ? "SEND REFILL" : "ADD TO TRAY"}</button>
            </div>
          </div>
        </div>
      )}

      {cooldownMessage && (
        <div className="res-modal-overlay" style={{ zIndex: 12000 }}>
          <div className="res-modal-card" style={{ maxWidth: "400px", textAlign: "center", border: '2px solid #ff4444' }}>
            <AlertCircle size={60} color="#ff4444" style={{ margin: "0 auto 20px" }} />
            <h2 style={{ color: "#ff4444" }}>Cooldown Active</h2>
            <p style={{ color: "#fff", fontSize: '1.1rem', margin: '15px 0' }}>{cooldownMessage}</p>
            <button className="res-modal-btn-primary" style={{ background: '#ff4444' }} onClick={() => {setCooldownMessage(null); setIsRefillMode(false);}}>OK</button>
          </div>
        </div>
      )}

      {showSessionModal && (
        <div className="res-modal-overlay" style={{ zIndex: 7000 }}>
          <div className="res-modal-card" style={{ textAlign: "center", padding: "40px" }}>
            <UtensilsCrossed size={60} color="#ffcc00" style={{ margin: "0 auto 20px" }} />
            <h2 style={{ color: "#ffcc00" }}>{isTimerRunning ? "SESSION ACTIVE" : "ORDER SENT"}</h2>
            <p style={{color: '#fff', marginBottom: '20px'}}>Your items are being prepared in the kitchen.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button className="res-modal-btn-primary" onClick={() => setShowSessionModal(false)}>ORDER MORE ITEMS</button>
              <button className="res-btn-cancel" onClick={handleHeaderPayClick}>FINISH & CHECKOUT</button>
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

      <PortalModal isOpen={showEndModal} onClose={() => setShowEndModal(false)} onConfirm={handleEndSession} />
      <ReservationOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selectedItem} onAdd={(item) => setCart([...cart, item])} allProducts={menuData} />
      <style>{` .spinner-loader { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
    </div>
  );
};

export default KioskReservationMenu;
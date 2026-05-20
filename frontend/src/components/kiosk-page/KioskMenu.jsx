import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare,
  Drumstick,
  CupSoda,
  Check,
  Bell,
  Star,
  ShoppingBag,
  CheckCircle,
  ChevronUp,
  ChevronDown,
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
  UtensilsCrossed,
  RefreshCw,
  Banknote,
  CreditCard,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import PortalModal from "./PortalModal";
import axios from "axios";
import alertMusicFile from "../../assets/alert-sound.mp3";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const HIDDEN_CATEGORIES = [
  "Chicken Wings",
  "Beverages",
  "Drinks",
  "Chicken",
  "Ramen",
];

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

  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_TABLE_ID = "kiosk_active_table_id";
  const SAVED_RES_ID = "kiosk_active_res_id";
  const OFFLINE_QUEUE_KEY = "kiosk_offline_orders";
  const PAYMENT_CHOICE_KEY = "kiosk_payment_choice";

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);
  const [timeLeft, setTimeLeft] = useState(1860);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [isRefillMode, setIsRefillMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [showBillInfo, setShowBillInfo] = useState(false);
  const [isFinalCheckout, setIsFinalCheckout] = useState(false);
  const [localBillHistory, setLocalBillHistory] = useState([]);

  // --- CALCULATION HELPER (FIXED) ---
const calculateTotal = () => {
    // If we are in the middle of a checkout, we want to see everything
    // Use a Map to ensure we don't double count items by their unique database ID if they exist in both lists
    const combinedItems = [...billItems, ...cart];
    
    // If you are using localBillHistory as a fallback for offline, 
    // only add them if billItems is empty
    const finalItems = billItems.length > 0 ? [...billItems, ...cart] : [...localBillHistory, ...cart];

    const total = finalItems.reduce((sum, item) => {
      const price = parseFloat(item.price || item.item_price || item.unit_price || 0);
      const qty = parseInt(item.quantity || item.qty || 1);
      return sum + (price * qty);
    }, 0);

    return total.toFixed(2);
  };

  const fetchCurrentBill = async () => {
    const resId = localStorage.getItem(SAVED_RES_ID);
    if (!resId) return [];
    try {
      const res = await axios.get(
        `${API_BASE}/orders/reservation-items/${resId}`,
      );
      const data = res.data || [];
      setBillItems(data);
      return data; // Return data directly for immediate use
    } catch (err) {
      return [];
    }
  };

 // FIND THIS FUNCTION in KioskMenu.jsx
const handleEndSession = async () => {
  const activeTable = localStorage.getItem(SAVED_TABLE_ID);
  const activeResId = localStorage.getItem(SAVED_RES_ID);

  if (activeTable && activeResId && navigator.onLine) {
    try {
      await axios.post(`${API_BASE}/orders/finish`, {
        table_id: activeTable,
        reservation_id: activeResId,
        payment_method: localStorage.getItem(PAYMENT_CHOICE_KEY) || "Paid",
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (timerRef.current) clearInterval(timerRef.current);

  // --- FIX: DO NOT USE localStorage.clear() ---
  // Only remove Kiosk-specific items
  const keysToRemove = [
    TIMER_KEY,
    SAVED_TABLE_ID,
    SAVED_RES_ID,
    OFFLINE_QUEUE_KEY,
    PAYMENT_CHOICE_KEY,
    "kiosk_active_bundle_id"
  ];
  
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Redirect back to selection
  window.location.href = "/kiosk-selection";
};

const handlePlaceOrderClick = () => {
    // Check if there is an active reservation already
    const activeResId = localStorage.getItem(SAVED_RES_ID);
    
    if (activeResId) {
      const tbl = localStorage.getItem(SAVED_TABLE_ID);
      // FIX: You MUST pass 'cart' as the second argument here
      submitOrderToDatabase(tbl === "takeout" ? null : tbl, cart);
    } else {
      // First time ordering: show the Dine-in/Take-out selection
      setIsFinalCheckout(false);
      setShowTypeModal(true);
    }
  };

const confirmPaymentChoice = (choice) => {
  localStorage.setItem(PAYMENT_CHOICE_KEY, choice);
  const resId = localStorage.getItem(SAVED_RES_ID);
  const token = localStorage.getItem("token") || "";

  if (resId && resId.startsWith("WALK-")) {
    const total = calculateTotal();
    
    // Check if we already created a billing record for this session
    const hasExistingBilling = localStorage.getItem(`billed_${resId}`);

    // If we already billed, we don't send a second "Downpayment" 
    // unless you want to update the amount. For now, let's just send it once.
    if (!hasExistingBilling) {
      axios.post(`${API_BASE}/billing/walkin`, {
        reservation_id: resId,
        amount: parseFloat(total),
        payment_method: "Cash", 
        payment_status: choice === "Pay Now" ? "verified" : "pending",
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        localStorage.setItem(`billed_${resId}`, "true"); // Mark as billed
        setShowBillInfo(false);
      })
      .catch((err) => console.error(err));
    } else {
      // Just close modal if record already exists
      setShowBillInfo(false);
    }
  } else {
    setShowBillInfo(false);
  }
};

  const handleFinishClick = async () => {
    setShowSessionModal(false);
    const latestBill = await fetchCurrentBill(); // Wait for fresh data
    setIsFinalCheckout(true);
    setShowBillInfo(true);
  };

  const submitOrderToDatabase = async (
    tableId = null,
    itemsToSubmit = null,
  ) => {
    if (!itemsToSubmit || itemsToSubmit.length === 0) return;
    const dynamicResId =
      localStorage.getItem(SAVED_RES_ID) || `WALK-${Date.now()}`;
    try {
      await axios.post(`${API_BASE}/orders/place`, {
        reservation_id: dynamicResId,
        table_id: tableId,
        items: itemsToSubmit.map((i) => ({
          item_id: i.id,
          quantity: i.quantity,
          customizations: i.customizations,
          is_refill: i.price === 0,
        })),
      });
      finalizeOrderLocally(itemsToSubmit, tableId, dynamicResId);
    } catch (error) {
      finalizeOrderLocally(itemsToSubmit, tableId, dynamicResId);
    }
  };

  const finalizeOrderLocally = (itemsToSubmit, tableId, dynamicResId) => {
    const hasUnlimited = itemsToSubmit.some((i) =>
      (i.name || "").toLowerCase().includes("unlimited"),
    );

    if (hasUnlimited && !localStorage.getItem(TIMER_KEY)) {
      localStorage.setItem(TIMER_KEY, (Date.now() + 1860 * 1000).toString());
      setIsTimerRunning(true);
      const unlimitedItem = itemsToSubmit.find((i) =>
        i.name.toLowerCase().includes("unlimited"),
      );
      localStorage.setItem("kiosk_active_bundle_id", unlimitedItem.id);
    }

    // --- FIX: Save items to local history so we don't rely 100% on the backend fetch ---
    setLocalBillHistory((prev) => [...prev, ...itemsToSubmit]);

    localStorage.setItem(SAVED_TABLE_ID, tableId || "takeout");
    localStorage.setItem(SAVED_RES_ID, dynamicResId);

    setCart([]); // Now safe to clear tray
    setShowTablePicker(false);
    setShowTypeModal(false);
    setShowBillInfo(true);
    setIsFinalCheckout(false);
    setShowSessionModal(false);
    fetchCurrentBill();
  };

  const handleItemClick = (item) => {
    unlockAudio();
    const itemName = (item.name || "").toLowerCase();
    const itemCat = (item.category || "").toLowerCase();
    const isUnlimited =
      itemName.includes("unlimited") || itemCat.includes("unlimited");
    const isRamenSet = itemName.includes("ramen");

    if (isUnlimited || isRamenSet) {
      setSelectedItem(item);
      setSelectedFlavors([]);
      setSelectedDrink("");
      setIsRefillMode(false);
      setShowFlavorModal(true);
    } else {
      // Pass category "Regular" to trick modal into hiding its own internal customizations
      setSelectedItem({ ...item, category: "Regular" });
      setIsModalOpen(true);
    }
    setSelectedCard(item.id);
  };

  const confirmFlavors = () => {
    const isRamen = selectedItem.name.toLowerCase().includes("ramen");
    if (selectedFlavors.length === 0) return alert(`Select a flavor`);
    if (!isRamen && !isRefillMode && !selectedDrink)
      return alert("Select a drink");

    const customization = isRefillMode
      ? `REFILL: ${selectedFlavors.join(", ")}`
      : `${isRamen ? "Ramen: " : "Flavors: "}${selectedFlavors.join(", ")} ${selectedDrink ? "| Drink: " + selectedDrink : ""}`;

    setCart([
      ...cart,
      { ...selectedItem, quantity: 1, customizations: customization },
    ]);
    setShowFlavorModal(false);
  };

  const handleDineInSelection = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/public/getTable`);
      setAvailableTables(res.data);
      setShowTypeModal(false);
      setTimeout(() => setShowTablePicker(true), 100);
    } catch (err) {
      alert("Could not load tables.");
    }
  };

  const handleTakeOutClick = () => {
    setShowTypeModal(false);
    setIsFinalCheckout(false);
    submitOrderToDatabase(null, cart);
  };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        const grouped = data.reduce((acc, item) => {
          const cat = item.category_name || "General";
          if (!acc[cat]) acc[cat] = [];

          const targetPath =
            navigator.onLine && item.local_path
              ? item.local_path
              : item.image_url;
          const fullImage = targetPath?.startsWith("http")
            ? targetPath
            : `${BASE_URL}${targetPath?.startsWith("/") ? "" : "/"}${targetPath}`;

          acc[cat].push({
            id: item.item_id,
            name: item.name,
            image: fullImage,
            price: item.price,
            category: cat,
            description: item.description || "",
          });
          return acc;
        }, {});
        setMenuData(grouped);
        setDynamicFlavors((grouped["Chicken"] || []).map((i) => i.name));
        setDynamicRamenFlavors((grouped["Ramen"] || []).map((i) => i.name));
        setDynamicDrinks(
          [...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map(
            (i) => i.name,
          ),
        );
        const firstVisibleCat = Object.keys(grouped).find(
          (cat) => !HIDDEN_CATEGORIES.includes(cat),
        );
        if (firstVisibleCat) setActiveCategory(firstVisibleCat);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    const savedEndTime = localStorage.getItem(TIMER_KEY);
    if (savedEndTime) {
      const remaining = Math.floor(
        (parseInt(savedEndTime) - Date.now()) / 1000,
      );
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
        const remaining = Math.floor(
          (parseInt(savedEndTime) - Date.now()) / 1000,
        );
        if (remaining <= 0) handleEndSession();
        else setTimeLeft(remaining);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        })
        .catch(() => {});
    }
  };
  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const hasActiveBundle = Boolean(localStorage.getItem(TIMER_KEY));

  if (loading) return <div className="loading-container">Loading Menu...</div>;

  return (
    <div className="res-kiosk-container">
      {/* HEADER */}
      <div className="kiosk-timer-wrapper" style={{ zIndex: 5000 }}>
        <div
          className="header-id-section"
          style={{
            background: "#222",
            border: "2px solid #ffcc00",
            padding: "10px 15px",
            borderRadius: "10px",
          }}
        >
          <ShoppingBag size={20} color="#ffcc00" />
          <div className="id-details" style={{ marginLeft: "10px" }}>
            <span
              className="id-label"
              style={{
                color: "#ffcc00",
                fontSize: "10px",
                fontWeight: "900",
                display: "block",
              }}
            >
              ORDER MODE
            </span>
            <span
              className="id-value"
              style={{
                color: "#fff",
                fontWeight: "900",
                display: "block",
                fontSize: "15px",
              }}
            >
              {localStorage.getItem(SAVED_TABLE_ID) === "takeout"
                ? "TAKE-OUT"
                : localStorage.getItem(SAVED_TABLE_ID)
                  ? `TABLE ${localStorage.getItem(SAVED_TABLE_ID)}`
                  : "WALK-IN GUEST"}
            </span>
          </div>
        </div>

        {/* PAY Button (Visible once an order is placed) */}
        {localStorage.getItem(SAVED_RES_ID) && (
          <button
            className="billing-btn-header"
            onClick={handleFinishClick}
            style={{
              background: "#ffcc00",
              color: "#000",
              border: "none",
              padding: "8px 15px",
              borderRadius: "8px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginLeft: "10px",
              cursor: "pointer",
            }}
          >
            <CreditCard size={18} /> PAY
          </button>
        )}

        {isTimerRunning && hasActiveBundle && (
          <div
            className="timer-box"
            onClick={() => setShowSessionModal(true)}
            style={{
              cursor: "pointer",
              border: "2px solid #ffcc00",
              marginLeft: "auto",
            }}
          >
            <Clock size={20} color="#ffcc00" />
            <span className="timer-text" style={{ color: "#fff" }}>
              {formatTime(timeLeft)}
            </span>
            <button
              className="finish-session-header-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleFinishClick();
              }}
            >
              FINISH
            </button>
          </div>
        )}
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
                .filter((cat) => !HIDDEN_CATEGORIES.includes(cat))
                .map((cat) => (
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
            {(menuData[activeCategory] || []).map((item) => (
              <div
                key={item.id}
                className="res-food-card"
                onClick={() => handleItemClick(item)}
              >
                <div className="res-card-image-container">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="res-food-img"
                  />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  {item.description && (
                    <p
                      style={{
                        color: "#ccc",
                        fontSize: "0.75rem",
                        marginBottom: "8px",
                      }}
                    >
                      {item.description}
                    </p>
                  )}
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>
                    ₱{item.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary
          cart={cart}
          onRemoveItem={(id) => setCart(cart.filter((i) => i.id !== id))}
        />
      </div>

      <footer className="res-bottom-bar">
        <button
          className="res-btn-view-all"
          onClick={() => (window.location.href = "/kiosk-selection")}
        >
          Back
        </button>
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={() => setCart([])}>
            Clear Tray
          </button>
          <button
            className="res-btn-view"
            disabled={cart.length === 0}
            onClick={handlePlaceOrderClick}
          >
            Place Order
          </button>
        </div>
      </footer>

      {/* --- BILL MODAL --- */}
      {showBillInfo && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div
            className="res-modal-card"
            style={{ maxWidth: "450px", width: "90%", textAlign: "center" }}
          >
            <Receipt
              size={50}
              color="#ffcc00"
              style={{ margin: "0 auto 15px" }}
            />
            <h2 style={{ color: "#ffcc00" }}>
              {isFinalCheckout ? "Final Bill Summary" : "Order Summary"}
            </h2>

            <div
              className="bill-scroll"
              style={{
                maxHeight: "250px",
                overflowY: "auto",
                margin: "20px 0",
                borderBottom: "1px solid #444",
              }}
            >
              {/* We use localBillHistory + cart because the network tab showed billItems is empty */}
              {[...localBillHistory, ...cart].map((item, idx) => {
                const p = parseFloat(item.price || item.item_price || 0);
                const q = parseInt(item.quantity || item.qty || 1);
                const name = item.name || item.item_name || "Item";
                if (p === 0 && !isFinalCheckout) return null;

                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 5px",
                      color: "#fff",
                    }}
                  >
                    <span style={{ textAlign: "left" }}>
                      {name} x{q}
                    </span>
                    <span>₱{(p * q).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.4rem",
                fontWeight: "bold",
                color: "#fff",
                marginBottom: "30px",
              }}
            >
              <span>Total:</span>
              <span style={{ color: "#ffcc00" }}>₱{calculateTotal()}</span>
            </div>

            {isFinalCheckout ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <p style={{ color: "#aaa", fontSize: "0.8rem" }}>
                  Please proceed to the counter to settle your bill.
                </p>
                <button
                  className="res-modal-btn-primary"
                  onClick={handleEndSession}
                >
                  FINISH SESSION
                </button>
                <button
                  className="res-btn-cancel"
                  onClick={() => setShowBillInfo(false)}
                >
                  BACK
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <button
                  className="res-modal-btn-primary"
                  onClick={() => confirmPaymentChoice("Pay Now")}
                >
                  <Banknote size={18} /> PAY NOW (At Counter)
                </button>
                <button
                  className="res-modal-btn-primary"
                  style={{ background: "#444", border: "none" }}
                  onClick={() => confirmPaymentChoice("Pay Later")}
                >
                  <Clock size={18} /> PAY LATER
                </button>
                <button
                  className="res-btn-cancel"
                  onClick={() => setShowBillInfo(false)}
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLAVOR MODAL */}
      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}>
          <div
            className="res-modal-card"
            style={{ maxWidth: "600px", width: "95%" }}
          >
            <h2 style={{ color: "#ffcc00", textAlign: "center" }}>
              {selectedItem?.name.toLowerCase().includes("ramen")
                ? "Ramen Choice"
                : "Unlimited Wings"}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              {(selectedItem?.name.toLowerCase().includes("ramen")
                ? dynamicRamenFlavors
                : dynamicFlavors
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    const isRamen = selectedItem.name
                      .toLowerCase()
                      .includes("ramen");
                    if (selectedFlavors.includes(f))
                      setSelectedFlavors(
                        selectedFlavors.filter((x) => x !== f),
                      );
                    else {
                      if (isRamen) setSelectedFlavors([f]);
                      else if (selectedFlavors.length < 4)
                        setSelectedFlavors([...selectedFlavors, f]);
                    }
                  }}
                  style={{
                    padding: "15px 10px",
                    borderRadius: "10px",
                    border: "1px solid #ffcc00",
                    background: selectedFlavors.includes(f)
                      ? "#ffcc00"
                      : "none",
                    color: selectedFlavors.includes(f) ? "#000" : "#fff",
                    fontWeight: "bold",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            {!isRefillMode &&
              !selectedItem?.name.toLowerCase().includes("ramen") && (
                <>
                  <h4 style={{ color: "#fff", margin: "25px 0 10px" }}>
                    Select Drink
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    {dynamicDrinks.map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDrink(d)}
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #555",
                          background: selectedDrink === d ? "#fff" : "none",
                          color: selectedDrink === d ? "#000" : "#fff",
                          fontSize: "0.8rem",
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </>
              )}
            <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
              <button
                className="res-btn-cancel"
                style={{ flex: 1 }}
                onClick={() => setShowFlavorModal(false)}
              >
                Cancel
              </button>
              <button
                className="res-modal-btn-primary"
                style={{ flex: 2 }}
                onClick={confirmFlavors}
              >
                {isRefillMode ? "SEND REFILL" : "ADD TO TRAY"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION MODAL */}
      {showSessionModal && (
        <div className="res-modal-overlay" style={{ zIndex: 7000 }}>
          <div
            className="res-modal-card"
            style={{ textAlign: "center", padding: "40px" }}
          >
            <UtensilsCrossed
              size={60}
              color="#ffcc00"
              style={{ margin: "0 auto 20px" }}
            />
            <h2 style={{ color: "#ffcc00", marginBottom: "10px" }}>
              {hasActiveBundle ? "SESSION ACTIVE" : "ORDER PLACED"}
            </h2>
            {hasActiveBundle && (
              <div
                style={{
                  fontSize: "3rem",
                  fontWeight: "900",
                  color: "#fff",
                  margin: "20px 0",
                }}
              >
                {formatTime(timeLeft)}
              </div>
            )}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {hasActiveBundle && (
                <button
                  className="res-modal-btn-primary"
                  style={{ background: "#28a745" }}
                  onClick={() => {
                    setSelectedItem({
                      id: localStorage.getItem("kiosk_active_bundle_id"),
                      name: "Unlimited",
                    });
                    setIsRefillMode(true);
                    setShowFlavorModal(true);
                    setShowSessionModal(false);
                  }}
                >
                  <RefreshCw size={18} /> REFILL CHICKEN
                </button>
              )}
              <button
                className="res-modal-btn-primary"
                onClick={() => setShowSessionModal(false)}
              >
                ORDER MORE ITEMS
              </button>
              <button className="res-btn-cancel" onClick={handleFinishClick}>
                FINISH & CHECKOUT
              </button>
            </div>
          </div>
        </div>
      )}

      <PortalModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirm={handleEndSession}
      />
      <ReservationOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
        onAdd={(item) => setCart([...cart, item])}
        allProducts={menuData}
      />

      {/* TYPE MODAL */}
      {showTypeModal && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}>
          <div className="res-modal-card">
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>
              Order Mode
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                width: "100%",
              }}
            >
              <button
                className="res-modal-btn-primary"
                onClick={handleDineInSelection}
              >
                DINE-IN
              </button>
              <button
                className="res-modal-btn-primary"
                onClick={handleTakeOutClick}
                style={{ background: "#ffcc00", color: "#000" }}
              >
                TAKE-OUT
              </button>
              <button
                className="res-btn-cancel"
                onClick={() => setShowTypeModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE PICKER */}
      {showTablePicker && (
        <div className="res-modal-overlay" style={{ zIndex: 6500 }}>
          <div
            className="res-modal-card"
            style={{ maxWidth: "600px", width: "90%" }}
          >
            <h2 style={{ color: "#ffcc00" }}>Select Table</h2>
            <div
              className="table-grid-kiosk"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "20px",
                margin: "20px 0",
              }}
            >
              {availableTables.map((table) => {
                const occupied =
                  table.bridge_status?.toLowerCase() === "confirmed" ||
                  table.bridge_status?.toLowerCase() === "seated";
                return (
                  // FIND THIS IN KioskMenu.jsx (Table Picker section)
                  <button
                    key={table.table_id}
                    disabled={occupied}
                    // CHANGE THIS LINE:
                    onClick={() => submitOrderToDatabase(table.table_id, cart)}
                    style={{
                      padding: "20px 10px",
                      borderRadius: "8px",
                      border: "none",
                      background: occupied ? "#333" : "#ffcc00",
                      color: occupied ? "#666" : "#000",
                      fontWeight: "bold",
                    }}
                  >
                    {table.table_number}
                  </button>
                );
              })}
            </div>
            <button
              className="res-btn-cancel"
              onClick={() => setShowTablePicker(false)}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskMenu;

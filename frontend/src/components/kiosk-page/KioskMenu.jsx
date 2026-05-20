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
  Minus,
  Plus,
  Trash2,
  X,
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
  const idleTimerRef = useRef(null);

  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_RES_ID = "kiosk_active_res_id";
  const SAVED_TABLE_ID = "kiosk_active_table_id";
  const PAYMENT_CHOICE_KEY = "kiosk_payment_choice";

  // ============ STATE MANAGEMENT ============
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
  const [localBillHistory, setLocalBillHistory] = useState([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [isRefillMode, setIsRefillMode] = useState(false);

  // Order Flow States (Using your existing modal structure)
  const [showBillInfo, setShowBillInfo] = useState(false);
  const [isFinalCheckout, setIsFinalCheckout] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Idle timer duration (5 minutes)
  const IDLE_TIMEOUT = 5 * 60 * 1000;

  // ============ HELPER FUNCTIONS ============
  const calculateTotal = () => {
    const finalItems =
      billItems.length > 0
        ? [...billItems, ...cart]
        : [...localBillHistory, ...cart];
    const total = finalItems.reduce((sum, item) => {
      const price = parseFloat(item.price || item.item_price || 0);
      const qty = parseInt(item.quantity || item.qty || 1);
      return sum + price * qty;
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
      return data;
    } catch (err) {
      return [];
    }
  };

  const resetOrderFlow = () => {
    setCart([]);
    setLocalBillHistory([]);
    setBillItems([]);
    setShowBillInfo(false);
    setShowTypeModal(false);
    setShowTablePicker(false);
    setSelectedTable(null);
    setIsSubmitting(false);
    resetIdleTimer();
  };

  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      if (cart.length > 0) {
        resetOrderFlow();
      }
    }, IDLE_TIMEOUT);
  };

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

  // ============ ORDER SUBMISSION ============
  const submitOrderToDatabase = async (
    tableId = null,
    itemsToSubmit = null,
  ) => {
    if (!itemsToSubmit || itemsToSubmit.length === 0) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

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
          is_refill: false,
        })),
      });

      // Save to local history
      setLocalBillHistory((prev) => [...prev, ...itemsToSubmit]);
      localStorage.setItem(SAVED_RES_ID, dynamicResId);
      if (tableId) localStorage.setItem(SAVED_TABLE_ID, tableId);

      // Set timer for unlimited bundles
      const hasUnlimited = itemsToSubmit.some((i) =>
        (i.name || "").toLowerCase().includes("unlimited"),
      );
      if (hasUnlimited && !localStorage.getItem(TIMER_KEY)) {
        localStorage.setItem(TIMER_KEY, (Date.now() + 1860 * 1000).toString());
        setIsTimerRunning(true);
      }

      // Clear cart and show success
      setCart([]);
      setShowBillInfo(false);
      setShowTypeModal(false);
      setShowTablePicker(false);
      setShowSessionModal(true);
    } catch (error) {
      console.error("Order submission error:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizeOrder = () => {
    const paymentChoice = localStorage.getItem(PAYMENT_CHOICE_KEY);
    const tableId = localStorage.getItem(SAVED_TABLE_ID);

    // Submit the order
    submitOrderToDatabase(tableId === "takeout" ? null : tableId, cart);
  };

  // ============ FLOW HANDLERS ============
  const handlePlaceOrderClick = () => {
    if (cart.length === 0) return;
    resetIdleTimer();
    // First: Show Order Mode modal (Dine-in/Take-out)
    setShowTypeModal(true);
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
    // Save takeout mode
    localStorage.setItem(SAVED_TABLE_ID, "takeout");
    // Show payment options modal
    setShowBillInfo(true);
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    localStorage.setItem(SAVED_TABLE_ID, table.table_id);
    setShowTablePicker(false);
    // Show payment options modal
    setShowBillInfo(true);
  };

  const confirmPaymentChoice = (choice) => {
    localStorage.setItem(PAYMENT_CHOICE_KEY, choice);
    const resId = localStorage.getItem(SAVED_RES_ID);
    const token = localStorage.getItem("token") || "";

    if (resId && resId.startsWith("WALK-")) {
      const total = calculateTotal();
      const hasExistingBilling = localStorage.getItem(`billed_${resId}`);

      if (!hasExistingBilling) {
        axios
          .post(
            `${API_BASE}/billing/walkin`,
            {
              reservation_id: resId,
              amount: parseFloat(total),
              payment_method: "Cash",
              payment_status: choice === "Pay Now" ? "verified" : "pending",
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          )
          .then(() => {
            localStorage.setItem(`billed_${resId}`, "true");
            setShowBillInfo(false);
            finalizeOrder();
          })
          .catch((err) => console.error(err));
      } else {
        setShowBillInfo(false);
        finalizeOrder();
      }
    } else {
      setShowBillInfo(false);
      finalizeOrder();
    }
  };

  const handleFinishClick = async () => {
    setShowSessionModal(false);
    await fetchCurrentBill();
    setShowBillInfo(true);
  };

  const handleEndSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const keysToRemove = [
      TIMER_KEY,
      SAVED_TABLE_ID,
      SAVED_RES_ID,
      PAYMENT_CHOICE_KEY,
      "kiosk_active_bundle_id",
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    window.location.href = "/kiosk-selection";
  };

  // ============ CART OPERATIONS ============
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((i) => i.id !== itemId));
    } else {
      setCart(
        cart.map((i) =>
          i.id === itemId ? { ...i, quantity: newQuantity } : i,
        ),
      );
    }
    resetIdleTimer();
  };

  const removeItem = (itemId) => {
    setCart(cart.filter((i) => i.id !== itemId));
    resetIdleTimer();
  };

  // ============ ITEM HANDLERS ============
  const handleItemClick = (item) => {
    unlockAudio();
    resetIdleTimer();
    const itemName = (item.name || "").toLowerCase();
    const isUnlimited = itemName.includes("unlimited");
    const isRamenSet = itemName.includes("ramen");

    if (isUnlimited || isRamenSet) {
      setSelectedItem(item);
      setSelectedFlavors([]);
      setSelectedDrink("");
      setIsRefillMode(false);
      setShowFlavorModal(true);
    } else {
      const existingItem = cart.find((i) => i.id === item.id);
      if (existingItem) {
        updateQuantity(item.id, existingItem.quantity + 1);
      } else {
        setCart([...cart, { ...item, quantity: 1, customizations: null }]);
      }
    }
  };

  const confirmFlavors = () => {
    const isRamen = selectedItem.name.toLowerCase().includes("ramen");
    if (selectedFlavors.length === 0) return alert("Select a flavor");
    if (!isRamen && !isRefillMode && !selectedDrink)
      return alert("Select a drink");

    const customization = isRefillMode
      ? `REFILL: ${selectedFlavors.join(", ")}`
      : `${isRamen ? "Ramen: " : "Flavors: "}${selectedFlavors.join(", ")} ${selectedDrink ? "| Drink: " + selectedDrink : ""}`;

    const existingItem = cart.find((i) => i.id === selectedItem.id);
    if (existingItem) {
      updateQuantity(selectedItem.id, existingItem.quantity + 1);
    } else {
      setCart([
        ...cart,
        { ...selectedItem, quantity: 1, customizations: customization },
      ]);
    }
    setShowFlavorModal(false);
  };

  // ============ FETCH MENU ============
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

  // ============ TIMER EFFECTS ============
  useEffect(() => {
    const savedEndTime = localStorage.getItem(TIMER_KEY);
    if (savedEndTime) {
      const remaining = Math.floor(
        (parseInt(savedEndTime) - Date.now()) / 1000,
      );
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsTimerRunning(true);
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
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          setIsTimerRunning(false);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  // Reset idle timer on user activity
  useEffect(() => {
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, resetIdleTimer);
    });
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetIdleTimer);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

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
              KIOSK ORDER
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
              {cart.length} item{cart.length !== 1 ? "s" : ""} in cart
            </span>
          </div>
        </div>

        {isTimerRunning && hasActiveBundle && (
          <div
            className="timer-box"
            style={{ marginLeft: "auto", border: "2px solid #ffcc00" }}
          >
            <Clock size={20} color="#ffcc00" />
            <span className="timer-text" style={{ color: "#fff" }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
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

        {/* ORDER SUMMARY SIDEBAR */}
        <OrderSummary cart={cart} onRemoveItem={removeItem} />
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

      {/* ============ MODALS ============ */}

      {/* ORDER MODE MODAL (Dine-in/Take-out) */}
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

      {/* TABLE PICKER MODAL */}
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
                  <button
                    key={table.table_id}
                    disabled={occupied}
                    onClick={() => handleTableSelect(table)}
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

      {/* PAYMENT MODAL */}
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
              {isFinalCheckout ? "Final Bill Summary" : "Confirm Order"}
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
              {cart.map((item, idx) => {
                const p = parseFloat(item.price || 0);
                const q = parseInt(item.quantity || 1);
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
                      {item.name} x{q}
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

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
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
          </div>
        </div>
      )}

      {/* SESSION MODAL (Success) */}
      {showSessionModal && (
        <div className="res-modal-overlay" style={{ zIndex: 7000 }}>
          <div
            className="res-modal-card"
            style={{ textAlign: "center", padding: "40px" }}
          >
            <CheckCircle
              size={60}
              color="#4caf50"
              style={{ margin: "0 auto 20px" }}
            />
            <h2 style={{ color: "#ffcc00", marginBottom: "10px" }}>
              ORDER PLACED SUCCESSFULLY!
            </h2>
            <p style={{ color: "#fff", marginBottom: "20px" }}>
              Your order has been sent to the kitchen.
            </p>
            <button
              className="res-modal-btn-primary"
              onClick={() => {
                setShowSessionModal(false);
                resetOrderFlow();
              }}
            >
              CONTINUE ORDERING
            </button>
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
              className="flavor-grid"
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
                    if (selectedFlavors.includes(f)) {
                      setSelectedFlavors(
                        selectedFlavors.filter((x) => x !== f),
                      );
                    } else {
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
                ADD TO TRAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM MODAL (Regular items) */}
      <ReservationOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
        onAdd={(item) => {
          const existingItem = cart.find((i) => i.id === item.id);
          if (existingItem) {
            updateQuantity(item.id, existingItem.quantity + item.quantity);
          } else {
            setCart([...cart, item]);
          }
          setIsModalOpen(false);
        }}
        allProducts={menuData}
      />

      {/* END MODAL */}
      <PortalModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirm={handleEndSession}
      />
    </div>
  );
};

export default KioskMenu;

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
  const idleTimerRef = useRef(null);

  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_RES_ID = "kiosk_active_res_id";

  // ============ STATE MANAGEMENT ============
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);
  const [timeLeft, setTimeLeft] = useState(1860);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [isRefillMode, setIsRefillMode] = useState(false);

  // Order Flow States
  const [showOrderSummaryModal, setShowOrderSummaryModal] = useState(false);
  const [showOrderModeModal, setShowOrderModeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderMode, setSelectedOrderMode] = useState(null);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  // Idle timer duration (5 minutes)
  const IDLE_TIMEOUT = 5 * 60 * 1000;

  // ============ HELPER FUNCTIONS ============
  const calculateTotal = () => {
    return cart
      .reduce((sum, item) => {
        const price = parseFloat(item.price || 0);
        const qty = parseInt(item.quantity || 1);
        return sum + price * qty;
      }, 0)
      .toFixed(2);
  };

  const resetOrderFlow = () => {
    // Clear cart and order states
    setCart([]);
    setShowOrderSummaryModal(false);
    setShowOrderModeModal(false);
    setShowPaymentModal(false);
    setSelectedOrderMode(null);
    setSelectedPaymentOption(null);
    setSelectedTable(null);
    setShowTablePicker(false);
    setIsSubmitting(false);

    // Reset idle timer
    resetIdleTimer();
  };

  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      // Auto-reset after idle
      if (cart.length > 0 || showOrderSummaryModal) {
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
  const submitOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const reservationId =
        localStorage.getItem(SAVED_RES_ID) || `WALK-${Date.now()}`;
      const tableId = selectedOrderMode === "dinein" ? selectedTable : null;

      await axios.post(`${API_BASE}/orders/place`, {
        reservation_id: reservationId,
        table_id: tableId,
        items: cart.map((i) => ({
          item_id: i.id,
          quantity: i.quantity,
          customizations: i.customizations,
          is_refill: false,
        })),
      });

      // Save reservation ID
      localStorage.setItem(SAVED_RES_ID, reservationId);

      // Set timer for unlimited bundles
      const hasUnlimited = cart.some((i) =>
        (i.name || "").toLowerCase().includes("unlimited"),
      );
      if (hasUnlimited && !localStorage.getItem(TIMER_KEY)) {
        localStorage.setItem(TIMER_KEY, (Date.now() + 1860 * 1000).toString());
        setIsTimerRunning(true);
      }

      // Show success and reset
      setShowSuccessModal(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        resetOrderFlow();
      }, 2000);
    } catch (error) {
      console.error("Order submission error:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ FLOW HANDLERS ============
  const handlePlaceOrderClick = () => {
    if (cart.length === 0) return;
    resetIdleTimer();
    setShowOrderSummaryModal(true);
  };

  const handleProceedToOrderMode = () => {
    setShowOrderSummaryModal(false);
    setShowOrderModeModal(true);
  };

  const handleOrderModeSelect = (mode) => {
    setSelectedOrderMode(mode);
    setShowOrderModeModal(false);

    if (mode === "dinein") {
      // Fetch tables for dine-in
      axios
        .get(`${API_BASE}/admin/public/getTable`)
        .then((res) => {
          setAvailableTables(res.data);
          setShowTablePicker(true);
        })
        .catch((err) => {
          alert("Could not load tables.");
          setSelectedOrderMode(null);
        });
    } else if (mode === "takeout") {
      // Show payment options directly for takeout
      setShowPaymentModal(true);
    }
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table.table_id);
    setShowTablePicker(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSelect = (option) => {
    setSelectedPaymentOption(option);
    setShowPaymentModal(false);
    submitOrder();
  };

  const handleBackToMenu = () => {
    setShowOrderSummaryModal(false);
    resetIdleTimer();
  };

  const handleBackToOrderMode = () => {
    setShowPaymentModal(false);
    setShowOrderModeModal(true);
  };

  const handleCancelOrder = () => {
    if (window.confirm("Are you sure you want to cancel your order?")) {
      resetOrderFlow();
    }
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
      // Add regular item directly to cart
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

        {/* Use your existing OrderSummary component */}
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

      {/* ============ MODALS ============ */}

      {/* ORDER SUMMARY MODAL */}
      {showOrderSummaryModal && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div
            className="res-modal-card"
            style={{
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div className="modal-header">
              <h2 style={{ color: "#ffcc00" }}>Order Summary</h2>
              <button className="close-modal-btn" onClick={handleBackToMenu}>
                ✕
              </button>
            </div>

            <div className="order-items-list">
              {cart.map((item, idx) => (
                <div key={idx} className="order-summary-item">
                  <div className="item-info">
                    <span className="item-qty-badge">{item.quantity}x</span>
                    <div>
                      <div className="item-name">{item.name}</div>
                      {item.customizations && (
                        <div className="item-customizations">
                          {item.customizations}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="item-price">
                    ₱{(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-total">
              <span>Total:</span>
              <span>₱{calculateTotal()}</span>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleBackToMenu}>
                Back to Menu
              </button>
              <button
                className="btn-primary"
                onClick={handleProceedToOrderMode}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER MODE MODAL */}
      {showOrderModeModal && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div
            className="res-modal-card"
            style={{ maxWidth: "400px", width: "90%", textAlign: "center" }}
          >
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>
              How would you like to order?
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
                className="mode-btn dinein"
                onClick={() => handleOrderModeSelect("dinein")}
              >
                🍽️ DINE IN
              </button>
              <button
                className="mode-btn takeout"
                onClick={() => handleOrderModeSelect("takeout")}
              >
                🥡 TAKE OUT
              </button>
              <button
                className="btn-cancel"
                onClick={() => setShowOrderModeModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE PICKER MODAL */}
      {showTablePicker && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div
            className="res-modal-card"
            style={{ maxWidth: "600px", width: "90%" }}
          >
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>
              Select Your Table
            </h2>
            <div className="table-grid">
              {availableTables.map((table) => {
                const occupied =
                  table.bridge_status?.toLowerCase() === "confirmed" ||
                  table.bridge_status?.toLowerCase() === "seated";
                return (
                  <button
                    key={table.table_id}
                    className={`table-btn ${occupied ? "occupied" : "available"}`}
                    disabled={occupied}
                    onClick={() => handleTableSelect(table)}
                  >
                    Table {table.table_number}
                    {occupied && (
                      <span className="occupied-badge">Occupied</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              className="btn-cancel"
              style={{ marginTop: "20px" }}
              onClick={() => {
                setShowTablePicker(false);
                setSelectedOrderMode(null);
                setShowOrderModeModal(true);
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div
            className="res-modal-card"
            style={{ maxWidth: "400px", width: "90%", textAlign: "center" }}
          >
            <h2 style={{ color: "#ffcc00", marginBottom: "10px" }}>
              Payment Option
            </h2>
            <p style={{ color: "#aaa", marginBottom: "20px" }}>
              Total: ₱{calculateTotal()}
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                width: "100%",
              }}
            >
              <button
                className="payment-btn paynow"
                onClick={() => handlePaymentSelect("Pay Now")}
              >
                <Banknote size={20} /> PAY NOW
              </button>
              <button
                className="payment-btn paylater"
                onClick={() => handlePaymentSelect("Pay Later")}
              >
                <Clock size={20} /> PAY LATER
              </button>
              <button className="btn-cancel" onClick={handleBackToOrderMode}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="res-modal-overlay" style={{ zIndex: 10001 }}>
          <div
            className="res-modal-card success-modal"
            style={{ textAlign: "center", animation: "fadeInUp 0.3s ease" }}
          >
            <CheckCircle
              size={60}
              color="#4caf50"
              style={{ margin: "0 auto 20px" }}
            />
            <h2 style={{ color: "#ffcc00" }}>Order Placed Successfully!</h2>
            <p style={{ color: "#fff", marginBottom: "20px" }}>
              Your order has been sent to the kitchen.
            </p>
            <div
              className="loading-spinner-small"
              style={{ margin: "0 auto" }}
            ></div>
            <p style={{ color: "#888", fontSize: "0.8rem", marginTop: "15px" }}>
              Returning to menu...
            </p>
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
            <div className="flavor-grid">
              {(selectedItem?.name.toLowerCase().includes("ramen")
                ? dynamicRamenFlavors
                : dynamicFlavors
              ).map((f) => (
                <button
                  key={f}
                  className={`flavor-btn ${selectedFlavors.includes(f) ? "active" : ""}`}
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
                  <div className="drink-grid">
                    {dynamicDrinks.map((d) => (
                      <button
                        key={d}
                        className={`drink-btn ${selectedDrink === d ? "active" : ""}`}
                        onClick={() => setSelectedDrink(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </>
              )}
            <div className="modal-actions" style={{ marginTop: "30px" }}>
              <button
                className="btn-secondary"
                onClick={() => setShowFlavorModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={confirmFlavors}>
                Add to Cart
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
    </div>
  );
};

export default KioskMenu;

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
  AlertCircle,
  X,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
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

  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [localBillHistory, setLocalBillHistory] = useState([]);
  const [isPaid, setIsPaid] = useState(
    storage.getItem(PAYMENT_CHOICE_KEY) === "verified",
  );

  // Reactive state to track total payments in real-time
  const [localTotalPaid, setLocalTotalPaid] = useState(
    parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0),
  );

  // DECLARED HERE AT THE TOP to prevent ReferenceErrors in hooks below
  const hasOrderedUnlimited = [...billItems, ...cart].some((item) =>
    (item.name || item.item_name || "").toLowerCase().includes("unlimited"),
  );

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillInfo, setShowBillInfo] = useState(false);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allergyNote, setAllergyNote] = useState("None");

  const [isFinalCheckout, setIsFinalCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [availableTables, setAvailableTables] = useState([]);
  const [pendingOrderDetails, setPendingOrderDetails] = useState({
    tableId: null,
    mode: "Dine-In",
  });
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);
  const [isRefillMode, setIsRefillMode] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState(null);

  const currentTableId = localStorage.getItem("tableId") || "takeout";

  const getAuthHeader = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
      console.warn("Authorization token is missing from browser storage.");
      return { headers: {} };
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const getFetchHeaders = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    return token && token !== "null" && token !== "undefined"
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const playCashierAlert = async () => {
    try {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (e) {
      console.log("Audio blocked:", e);
    }
  };

  // Calculates the cost of the items currently inside your interactive tray
  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => {
      const p = parseFloat(item.price || 0);
      const q = parseInt(item.quantity || 1);
      return sum + p * q;
    }, 0);
  };

  const calculateSessionTotal = (excludeCart = false) => {
    const history = billItems.length > 0 ? billItems : localBillHistory;
    // If excludeCart is true (like on Pay Bill), we only sum already placed history items
    const combined = excludeCart ? history : [...history, ...cart];

    return combined.reduce((sum, item) => {
      const q = parseInt(item.quantity || item.qty || 1);

      let p = parseFloat(item.price);
      if (isNaN(p)) p = parseFloat(item.unit_price);
      if (isNaN(p) && item.item_price) p = parseFloat(item.item_price) / q;
      if (isNaN(p)) p = 0;

      const isRefill =
        item.is_refill === 1 ||
        item.is_refill === true ||
        (item.customizations &&
          item.customizations.toString().includes("[REFILL]"));
      if (isRefill) {
        p = 0;
      }

      return sum + p * q;
    }, 0);
  };

  const calculateTotalDue = (excludeCart = false) => {
    const totalSession = calculateSessionTotal(excludeCart);
    const due = totalSession - localTotalPaid; // Calculates using the reactive state
    return due > 0 ? due.toFixed(2) : "0.00";
  };

  const syncWithDashboard = async (
    resId,
    amount,
    method = "Cash",
    status = "pending",
  ) => {
    try {
      await axios.post(
        `${API_BASE}/billing/walkin`,
        {
          reservation_id: resId,
          amount: parseFloat(amount),
          payment_method: method,
          payment_status: status,
        },
        getAuthHeader(),
      );
      return true;
    } catch (err) {
      console.error("Sync failed", err);
      throw err;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setupTable = params.get("setupTable");

    if (setupTable) {
      storage.setItem(FIXED_KIOSK_KEY, setupTable);
      console.log(`Kiosk locked to Table ID: ${setupTable}`);
    }
  }, []);

  useEffect(() => {
    if (activeCategory === "Unlimited" && hasOrderedUnlimited) {
      const fallbackCategory = Object.keys(menuData).find(
        (cat) => !HIDDEN_CATEGORIES.includes(cat) && cat !== "Unlimited"
      );
      if (fallbackCategory) {
        setActiveCategory(fallbackCategory);
      }
    }
  }, [activeCategory, hasOrderedUnlimited, menuData]);

  const handleEndSession = async () => {
    const activeTable = storage.getItem(SAVED_TABLE_ID);
    const activeResId = storage.getItem(SAVED_RES_ID);
    if (activeResId) {
      try {
        await axios.post(
          `${API_BASE}/orders/finish`,
          {
            table_id: activeTable,
            reservation_id: activeResId,
          },
          getAuthHeader(),
        );
      } catch (err) {
        console.error(err);
      }
    }
    [
      TIMER_KEY,
      SAVED_TABLE_ID,
      SAVED_RES_ID,
      PAYMENT_CHOICE_KEY,
      TOTAL_PAID_KEY,
    ].forEach((k) => storage.removeItem(k));
    window.location.href = "/kiosk-selection";
  };

  const handleRefillClick = () => {
    const lastRefill = sessionStorage.getItem("kiosk_last_refill_timestamp");
    if (lastRefill) {
      const timeElapsed = Date.now() - parseInt(lastRefill, 10);
      const cooldownPeriod = 10 * 60 * 1000;

      if (timeElapsed < cooldownPeriod) {
        const remainingSeconds = Math.ceil(
          (cooldownPeriod - timeElapsed) / 1000,
        );
        const m = Math.floor(remainingSeconds / 60);
        const s = remainingSeconds % 60;
        setCooldownMessage(
          `Refill is on cooldown. Please wait ${m}m ${s}s before requesting another.`,
        );
        return;
      }
    }

    const refillItem = menuData["Chicken"]?.[0] || {
      id: 162,
      name: "Chicken Wings",
      price: 0,
    };

    setSelectedItem({ ...refillItem, price: 0 });
    setSelectedFlavors([]);
    setSelectedDrink("");
    setIsRefillMode(true);
    setShowFlavorModal(true);
  };

  useEffect(() => {
    const syncTimer = () => {
      const savedEnd = sessionStorage.getItem(TIMER_KEY);
      if (!savedEnd) {
        setIsTimerRunning(false);
        return;
      }

      const remaining = Math.max(
        0,
        Math.floor((parseInt(savedEnd) - Date.now()) / 1000),
      );

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
      const res = await axios.get(
        `${API_BASE}/orders/reservation-items/${resId}`,
        getAuthHeader(),
      );
      setBillItems(res.data || []);
      return res.data;
    } catch (err) {
      return [];
    }
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

    const hasUnlimited = itemsToSubmit.some((i) =>
      i.name.toLowerCase().includes("unlimited"),
    );

    const rawTableId = tableId || currentTableId;
    const parsedTableId = parseInt(rawTableId, 10);
    const finalTableId = isNaN(parsedTableId) ? null : parsedTableId;

    try {
      await axios.post(
        `${API_BASE}/orders/place`,
        {
          reservation_id: dynamicResId,
          table_id: finalTableId,
          items: itemsToSubmit.map((i) => ({
            item_id: i.id,
            quantity: i.quantity,
            customizations:
              mode === "Take-Out"
                ? `[TAKE-OUT] ${i.customizations || ""}`
                : i.customizations,
            is_refill: i.price === 0,
          })),
          allergy_note: allergyNote !== "None" ? allergyNote : null,
        },
        getAuthHeader(),
      );

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
        const outstandingBalance = parseFloat(calculateTotalDue());
        const newTotalPaidInStorage = calculateSessionTotal();

        await syncWithDashboard(
          dynamicResId,
          outstandingBalance,
          "Cash",
          "verified",
        );

        storage.setItem(TOTAL_PAID_KEY, newTotalPaidInStorage.toString());
        setLocalTotalPaid(newTotalPaidInStorage);

        storage.setItem(PAYMENT_CHOICE_KEY, "verified");
        setIsPaid(true);
        await playCashierAlert();
        setShowBillInfo(true);
      } else {
        setIsPaid(false);
        storage.removeItem(PAYMENT_CHOICE_KEY);
      }

      await fetchCurrentBill();
      setLocalBillHistory([]);

      setShowPaymentModal(false);
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
    const due = parseFloat(calculateTotalDue(true));
    setIsPaid(due <= 0);
    setShowBillInfo(true);
  };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`, {
          headers: getFetchHeaders(),
        });
        const data = await response.json();
        const grouped = data.reduce((acc, item) => {
          const cat = item.category_name || "General";
          if (!acc[cat]) acc[cat] = [];
          let img = item.local_path || item.image_url;
          if (img && !img.startsWith("http")) {
            const cleanPath = img.startsWith("/") ? img.substring(1) : img;
            const cleanBase = BASE_URL.endsWith("/")
              ? BASE_URL
              : `${BASE_URL}/`;
            img = `${cleanBase}${cleanPath}`;
          }
          acc[cat].push({
            id: item.item_id,
            name: item.name,
            image: img,
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

  const handleItemClick = (item) => {
    if (activeCategory === "Chicken") {
      setSelectedItem({ ...item, price: 0 });
      setSelectedFlavors([]);
      setSelectedDrink("");
      setIsRefillMode(true);
      setShowFlavorModal(true);
    } else if (
      item.name.toLowerCase().includes("unlimited") ||
      item.name.toLowerCase().includes("ramen")
    ) {
      setSelectedItem(item);
      setSelectedFlavors([]);
      setSelectedDrink("");
      setShowFlavorModal(true);
    } else {
      setSelectedItem({ ...item, category: "Regular" });
      setIsModalOpen(true);
    }
  };

  const confirmFlavors = async () => {
    if (selectedFlavors.length === 0) {
      alert("Please select at least one flavor.");
      return;
    }
    if (selectedFlavors.length > 4) {
      alert("You can select a maximum of 4 flavors.");
      return;
    }

    const isRefill = parseFloat(selectedItem.price) === 0 || isRefillMode;
    const customization = `${isRefill ? "[REFILL] " : ""}Flavors: ${selectedFlavors.join(", ")}${selectedDrink ? " | Drink: " + selectedDrink : ""}`;

    const newItem = {
      ...selectedItem,
      quantity: 1,
      customizations: customization,
      price: isRefill ? 0 : selectedItem.price,
      is_refill: isRefill,
    };

    if (isRefill) {
      setIsLoading(true);
      const activeResId = storage.getItem(SAVED_RES_ID);
      const activeTable = storage.getItem(SAVED_TABLE_ID);
      const parsedTableId = parseInt(activeTable, 10);
      const finalTableId = isNaN(parsedTableId) ? null : parsedTableId;

      try {
        await axios.post(
          `${API_BASE}/orders/place`,
          {
            reservation_id: activeResId,
            table_id: finalTableId,
            items: [
              {
                item_id: newItem.id,
                quantity: 1,
                customizations: newItem.customizations,
                is_refill: true,
              },
            ],
          },
          getAuthHeader(),
        );

        sessionStorage.setItem(
          "kiosk_last_refill_timestamp",
          Date.now().toString(),
        );
        await fetchCurrentBill();

        setShowFlavorModal(false);
        setIsRefillMode(false);
      } catch (err) {
        if (err.response?.data?.error === "Cooldown active") {
          setCooldownMessage(err.response.data.message);
        } else {
          setCooldownMessage("Refill placement failed.");
        }
        setShowFlavorModal(false);
        setIsRefillMode(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      setCart([...cart, newItem]);
      setShowFlavorModal(false);
    }

    setSelectedFlavors([]);
    setSelectedDrink("");
    setSelectedItem(null);
  };

  useEffect(() => {
    const due = parseFloat(calculateTotalDue());
    if (due > 0) {
      setIsPaid(false);
    } else if (storage.getItem(SAVED_RES_ID)) {
      setIsPaid(true);
    }
  }, [cart, billItems, localTotalPaid]);

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
                {storage.getItem(SAVED_TABLE_ID) === "takeout"
                  ? "TAKE-OUT"
                  : `TABLE ${storage.getItem(SAVED_TABLE_ID) || "?"}`}
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
                <span
                  className={`timer-digits ${timeLeft < 600 ? "urgent" : ""}`}
                >
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
                background:
                  parseFloat(calculateTotalDue(true)) <= 0
                    ? "#28a745"
                    : "#ffcc00",
                color:
                  parseFloat(calculateTotalDue(true)) <= 0 ? "#fff" : "#000",
              }}
            >
              <CreditCard size={18} className="me-2" />
              {parseFloat(calculateTotalDue(true)) <= 0
                ? "VIEW RECEIPT"
                : "PAY BILL"}
            </button>
          )}
        </div>
      </div>
      {/* 2. MAIN CONTENT (Sidebar + Menu Grid + Summary) */}
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
                // Filter out the "Unlimited" category if they already ordered it
                .filter((cat) => !(cat === "Unlimited" && hasOrderedUnlimited))
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
                    onError={(e) => (e.target.src = "/fallback-food.png")}
                  />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>
                    {activeCategory === "Chicken"
                      ? "₱0.00 (REFILL)"
                      : `₱${parseFloat(item.price).toFixed(2)}`}
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

      {/* 3. BOTTOM ACTION BAR */}
      <footer className="res-bottom-bar">
        {!storage.getItem(SAVED_RES_ID) && (
          <button
            className="res-btn-cancel"
            onClick={() => navigate("/kiosk-selection")}
            style={{
              marginRight: "auto",
              background: "#444",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={18} style={{ marginRight: "8px" }} /> Back
          </button>
        )}
        <div className="res-action-btns">
          <button className="res-btn-cancel" onClick={() => setCart([])}>
            Clear Tray
          </button>
          <button
            className="res-btn-view"
            disabled={cart.length === 0}
            onClick={() => {
              setShowAllergyModal(true);
            }}
          >
            Place Order ({cart.length})
          </button>
        </div>
      </footer>

      {/* 4. MODALS */}

      {/* Allergy Modal */}
      {showAllergyModal && (
        <div className="res-modal-overlay" style={{ zIndex: 7000 }}>
          <div className="res-modal-card" style={{ maxWidth: "500px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  color: "#ffcc00",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AlertCircle size={28} /> Allergy Information
              </h2>
              <button
                onClick={() => setShowAllergyModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <p
              style={{
                color: "#aaa",
                marginBottom: "15px",
                fontSize: "0.9rem",
              }}
            >
              Please let us know if you have any food allergies. This
              information will be shared with our kitchen staff.
            </p>

            <div
              className="allergy-input-group"
              style={{ marginBottom: "25px" }}
            >
              <label
                style={{
                  display: "block",
                  color: "#ffcc00",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                }}
              >
                Allergies / Dietary Restrictions
              </label>
              <textarea
                value={allergyNote}
                onChange={(e) => setAllergyNote(e.target.value)}
                placeholder="e.g., Peanuts, Shellfish, Dairy, Gluten, etc. (Leave as 'None' if no allergies)"
                rows="3"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #333",
                  background: "#1a1a1a",
                  color: "#fff",
                  fontSize: "0.9rem",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <p
                style={{ color: "#888", fontSize: "0.7rem", marginTop: "5px" }}
              >
                Default: "None" - Kitchen will be notified of any allergies you
                specify
              </p>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <button
                className="res-btn-cancel"
                onClick={() => setShowAllergyModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="res-modal-btn-primary"
                onClick={() => {
                  setShowAllergyModal(false);
                  if (storage.getItem(SAVED_RES_ID)) {
                    setPendingOrderDetails({
                      tableId: storage.getItem(SAVED_TABLE_ID),
                      mode:
                        storage.getItem(SAVED_TABLE_ID) === "takeout"
                          ? "Take-Out"
                          : "Dine-In",
                    });
                    setShowPaymentModal(true);
                  } else {
                    setShowTypeModal(true);
                  }
                }}
                style={{ flex: 1 }}
              >
                Continue to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Mode Modal */}
      {showTypeModal && (
        <div className="res-modal-overlay" style={{ zIndex: 6000 }}>
          <div className="res-modal-card">
            <h2 style={{ color: "#ffcc00", marginBottom: "20px" }}>
              Order Mode
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <button
                className="res-modal-btn-primary"
                onClick={() => {
                  const fixed = storage.getItem(FIXED_KIOSK_KEY);
                  if (fixed) {
                    setPendingOrderDetails({ tableId: fixed, mode: "Dine-In" });
                    setShowTypeModal(false);
                    setShowPaymentModal(true);
                  } else {
                    axios
                      .get(`${API_BASE}/admin/public/getTable`, getAuthHeader())
                      .then((r) => setAvailableTables(r.data));
                    setShowTypeModal(false);
                    setShowTablePicker(true);
                  }
                }}
              >
                DINE-IN
              </button>
              <button
                className="res-modal-btn-primary"
                style={{ background: "#ffcc00", color: "#000" }}
                onClick={() => {
                  setPendingOrderDetails({
                    tableId: "takeout",
                    mode: "Take-Out",
                  });
                  setShowTypeModal(false);
                  setShowPaymentModal(true);
                }}
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

      {/* Table Picker Modal */}
      {showTablePicker && (
        <div className="res-modal-overlay" style={{ zIndex: 6500 }}>
          <div className="res-modal-card" style={{ maxWidth: "600px" }}>
            <h2 style={{ color: "#ffcc00" }}>Select Your Table</h2>
            <div
              className="table-grid-kiosk"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "15px",
                margin: "20px 0",
              }}
            >
              {availableTables.map((t) => (
                <button
                  key={t.table_id}
                  disabled={t.bridge_status === "seated"}
                  onClick={() => {
                    setPendingOrderDetails({
                      tableId: t.table_id,
                      mode: "Dine-In",
                    });
                    setShowTablePicker(false);
                    setShowPaymentModal(true);
                  }}
                  style={{
                    padding: "15px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: "bold",
                    background:
                      t.bridge_status === "seated" ? "#333" : "#ffcc00",
                    color: t.bridge_status === "seated" ? "#777" : "#000",
                  }}
                >
                  {t.table_number}
                </button>
              ))}
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

      {/* Payment Choice Modal */}
      {showPaymentModal && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="res-modal-card">
            <Receipt
              size={50}
              color="#ffcc00"
              style={{ margin: "0 auto 15px" }}
            />
            <h2 style={{ color: "#ffcc00" }}>Payment Choice</h2>

            <p
              style={{ color: "#fff", fontSize: "1.4rem", fontWeight: "bold" }}
            >
              Amount to Pay:{" "}
              <span style={{ color: "#ffcc00" }}>₱{calculateTotalDue()}</span>
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                className="res-modal-btn-primary"
                disabled={isLoading}
                onClick={() => confirmPaymentChoice("Pay Now")}
              >
                <Banknote size={18} className="me-2" /> PAY NOW (CASHIER)
              </button>
              <button
                className="res-modal-btn-primary"
                disabled={isLoading}
                style={{ background: "#444" }}
                onClick={() => confirmPaymentChoice("Pay Later")}
              >
                <Clock size={18} className="me-2" /> ORDER NOW, PAY LATER
              </button>
              <button
                className="res-btn-cancel"
                onClick={() => setShowPaymentModal(false)}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Info / Receipt Modal */}
      {showBillInfo && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="res-modal-card">
            <Receipt
              size={50}
              color="#ffcc00"
              style={{ margin: "0 auto 15px" }}
            />
            <h2 style={{ color: "#ffcc00" }}>
              {isFinalCheckout ? "Bill Summary" : "Current Tray"}
            </h2>

            <div
              className="bill-scroll"
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                margin: "20px 0",
              }}
            >
              {(isFinalCheckout ? billItems : cart).map((item, idx) => {
                const q = parseInt(item.quantity || item.qty || 1);

                let p = parseFloat(item.price);
                if (isNaN(p)) p = parseFloat(item.unit_price);
                if (isNaN(p) && item.item_price)
                  p = parseFloat(item.item_price) / q;
                if (isNaN(p)) p = 0;

                const isRefill =
                  item.is_refill === 1 ||
                  item.is_refill === true ||
                  (item.customizations &&
                    item.customizations.toString().includes("[REFILL]"));
                if (isRefill) {
                  p = 0;
                }

                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 5px",
                      color: "#fff",
                      borderBottom: "1px solid #222",
                    }}
                  >
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <span style={{ fontWeight: "bold", display: "block" }}>
                        {item.name || item.item_name}
                      </span>
                      <small style={{ color: "#888" }}>
                        {isRefill ? "REFILL" : `₱${p.toFixed(2)} x ${q}`}
                      </small>
                    </div>
                    <span style={{ alignSelf: "center" }}>
                      ₱{(p * q).toFixed(2)}
                    </span>
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
                marginBottom: "20px",
              }}
            >
              <span>Total Due:</span>
              <span style={{ color: "#ffcc00" }}>
                ₱{calculateTotalDue(isFinalCheckout)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              {parseFloat(calculateTotalDue(isFinalCheckout)) > 0 ? (
                <button
                  className="res-modal-btn-primary"
                  onClick={async () => {
                    const totalBill = calculateSessionTotal(isFinalCheckout);
                    setIsLoading(true);
                    try {
                      await syncWithDashboard(
                        storage.getItem(SAVED_RES_ID),
                        totalBill,
                        "Cash",
                        "verified",
                      );

                      storage.setItem(TOTAL_PAID_KEY, totalBill.toString());
                      setLocalTotalPaid(totalBill);

                      setIsLoading(false);

                      fetchCurrentBill();
                      playCashierAlert();
                    } catch (err) {
                      alert("Payment processing failed.");
                      setIsLoading(false);
                    }
                  }}
                >
                  <Banknote size={18} className="me-2" /> PAY NOW (₱
                  {calculateTotalDue(isFinalCheckout)})
                </button>
              ) : (
                <button
                  className="res-modal-btn-primary"
                  style={{ background: "#28a745" }}
                  onClick={handleEndSession}
                >
                  FINISH SESSION
                </button>
              )}

              <button
                className="res-btn-cancel"
                onClick={() => setShowBillInfo(false)}
              >
                {parseFloat(calculateTotalDue(isFinalCheckout)) > 0
                  ? "Pay Later & Exit Menu"
                  : "Close"}
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
                <h3 className="section-label">Select Flavors (Up to 4)</h3>
                <div className="flavor-grid">
                  {(selectedItem?.name.toLowerCase().includes("ramen")
                    ? dynamicRamenFlavors
                    : dynamicFlavors
                  ).map((f) => (
                    <button
                      key={f}
                      onClick={() =>
                        setSelectedFlavors((prev) => {
                          if (prev.includes(f)) {
                            return prev.filter((x) => x !== f);
                          }
                          if (prev.length >= 4) {
                            alert("You can select a maximum of 4 flavors.");
                            return prev;
                          }
                          return [...prev, f];
                        })
                      }
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
                  {dynamicDrinks.map((d) => (
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
              <button
                className="res-btn-cancel-ui"
                onClick={() => {
                  setShowFlavorModal(false);
                  setIsRefillMode(false);
                }}
              >
                Cancel
              </button>
              <button className="res-btn-confirm-ui" onClick={confirmFlavors}>
                {isRefillMode ? "Order Refill" : "Add to Tray"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COOLDOWN FEEDBACK MODAL */}
      {cooldownMessage && (
        <div className="res-modal-overlay" style={{ zIndex: 12000 }}>
          <div
            className="res-modal-card"
            style={{ maxWidth: "400px", textAlign: "center" }}
          >
            <AlertCircle
              size={50}
              color="#ffcc00"
              style={{ margin: "0 auto 15px" }}
            />
            <h3 style={{ color: "#ffcc00" }}>Refill Cooldown</h3>
            <p style={{ color: "#fff", margin: "15px 0" }}>{cooldownMessage}</p>
            <button
              className="res-modal-btn-primary"
              onClick={() => setCooldownMessage(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Global Loading Overlay */}
      {isLoading && (
        <div
          className="res-modal-overlay"
          style={{ zIndex: 11000, background: "rgba(0, 0, 0, 0.8)" }}
        >
          <div style={{ textAlign: "center" }}>
            <RefreshCw className="spinner-loader" color="#ffcc00" size={60} />
            <p style={{ color: "#fff", marginTop: "15px", fontWeight: "bold" }}>
              Processing Order...
            </p>
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
        .allergy-input-group textarea:focus {
          outline: none;
          border-color: #ffcc00;
          box-shadow: 0 0 5px rgba(255, 204, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default KioskMenu;
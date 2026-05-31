import React, { useState, useEffect, useRef, useMemo } from "react";
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
  UtensilsCrossed,
  RefreshCw,
  Banknote,
  CreditCard,
  User,
  ArrowLeft,
  AlertCircle,
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
  "My Reserved Items": <Receipt />,
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
  const LAST_REFILL_KEY = `kiosk_last_refill_${reservationId}`;

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

  // Database-driven customization states
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);

  const [isPaid, setIsPaid] = useState(
    storage.getItem(PAYMENT_CHOICE_KEY) === "verified",
  );
  const [cooldownMessage, setCooldownMessage] = useState(null);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

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

  const calculateSessionTotal = () => {
    const history = billItems.length > 0 ? billItems : [];
    const combined = [];
    const accountedIds = new Set();

    // Prioritize active items in the cart, casting IDs to string
    cart.forEach((item) => {
      if (item && item.id) {
        combined.push(item);
        accountedIds.add(String(item.id));
      }
    });

    // Add items from the history list only if they aren't already represented in the cart
    history.forEach((item) => {
      if (item) {
        const itemId = String(item.item_id || item.id);
        if (itemId && !accountedIds.has(itemId)) {
          combined.push(item);
          accountedIds.add(itemId);
        }
      }
    });

    return combined.reduce((sum, item) => {
      const q = parseInt(item.quantity || item.qty || 1);

      let p = parseFloat(item.price);
      if (isNaN(p)) p = parseFloat(item.unit_price);
      if (isNaN(p) && item.item_price) p = parseFloat(item.item_price) / q;
      if (isNaN(p)) p = 0;

      // Force price to 0 if the item is a refill record
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

  const calculateTotalDue = () => {
    const totalSession = calculateSessionTotal();
    const alreadyPaid = parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0);
    const due = totalSession - alreadyPaid;
    return due > 0 ? due.toFixed(2) : "0.00";
  };

  const fetchCurrentBill = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/orders/reservation-items/${reservationId}`,
        getAuthHeader(),
      );
      if (res.data) setBillItems(res.data);
      return res.data;
    } catch (err) {
      return [];
    }
  };

  const playCashierAlert = async () => {
    try {
      audioObj.currentTime = 0;
      await audioObj.play();
    } catch (e) {}
  };

  // Helper to locate active Unlimited product configurations in menuData
  const findUnlimitedItem = () => {
    for (const cat of Object.keys(menuData)) {
      const found = menuData[cat].find((item) =>
        (item.name || "").toLowerCase().includes("unlimited"),
      );
      if (found) return found;
    }
    return null;
  };

  // Cooldown validation and initial trigger for Unlimited refills
  const handleRefillClick = () => {
    const lastRefill = storage.getItem(LAST_REFILL_KEY);
    if (lastRefill) {
      const timeElapsed = Date.now() - parseInt(lastRefill);
      const tenMinutes = 10 * 60 * 1000;
      if (timeElapsed < tenMinutes) {
        const remainingSeconds = Math.ceil((tenMinutes - timeElapsed) / 1000);
        const m = Math.floor(remainingSeconds / 60);
        const s = remainingSeconds % 60;
        setCooldownMessage(
          `Refill is on cooldown. Please wait ${m}m ${s}s before requesting another.`,
        );
        return;
      }
    }

    const unlimitedItem = findUnlimitedItem();
    if (!unlimitedItem) {
      alert("No active Unlimited package found in the system registry.");
      return;
    }

    setSelectedItem(unlimitedItem);
    setSelectedFlavors([]);
    setSelectedDrink("");
    setIsRefillMode(true);
    setShowFlavorModal(true);
  };
  // Initial data fetch and mapping pre-reserved items straight into the tray (cart)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, resItemsRes, reservationRes] = await Promise.all([
          fetch(`${API_BASE}/products`, { headers: getFetchHeaders() }).then(
            (r) => r.json(),
          ),
          axios
            .get(
              `${API_BASE}/orders/reservation-items/${reservationId}`,
              getAuthHeader(),
            )
            .then((r) => r.data),
          axios
            .get(`${API_BASE}/reservations/${reservationId}`, getAuthHeader())
            .then((r) => r.data)
            .catch(() => null),
        ]);

        if (reservationRes) {
          const targetData =
            reservationRes.data || reservationRes.reservation || reservationRes;
          const paidAmount = parseFloat(
            targetData.amount || targetData.downpayment || 0,
          );
          storage.setItem(TOTAL_PAID_KEY, paidAmount.toString());
        }

        const grouped = {};
        const getFullImage = (item) => {
          const rawPath = item.local_path || item.image_url;
          if (!rawPath) return "";
          if (rawPath.startsWith("http")) return rawPath;
          const cleanPath = rawPath.startsWith("/")
            ? rawPath.substring(1)
            : rawPath;
          return `${BASE_URL}/${cleanPath}`;
        };

        // Put pre-reserved items directly into the cart tray
        // Put pre-reserved items directly into the cart tray, marked as placed
        if (resItemsRes && resItemsRes.length > 0) {
          const reservedCartItems = resItemsRes.map((i) => ({
            id: i.item_id,
            name: i.item_name || i.name,
            price: i.item_price || i.price,
            image: getFullImage(i),
            category: i.category_name || "Regular",
            quantity: parseInt(i.qty || i.quantity || 1),
            customizations: i.customizations || "",
          }));

          setCart(reservedCartItems);
          setBillItems(resItemsRes);
        }

        // Group regular products
        prodRes.forEach((item) => {
          const cat = item.category_name || "General";
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push({
            id: item.item_id,
            name: item.name,
            image: getFullImage(item),
            price: item.price,
            category: cat,
          });
        });

        setMenuData(grouped);

        setDynamicFlavors(
          (grouped["Chicken"] || grouped["Chicken Wings"] || []).map(
            (i) => i.name,
          ),
        );
        setDynamicRamenFlavors((grouped["Ramen"] || []).map((i) => i.name));
        setDynamicDrinks(
          [...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map(
            (i) => i.name,
          ),
        );

        const cats = Object.keys(grouped).filter(
          (c) => !HIDDEN_CATEGORIES.includes(c),
        );
        if (cats.length > 0) {
          setActiveCategory(cats[0]);
        }
      } catch (e) {
        console.error("Data Fetch Error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reservationId]);

  const confirmPaymentChoice = async (choice) => {
    setIsLoading(true);
    const isPayNow = choice === "Pay Now";

    // Only send pending additions to the backend (items not yet placed)
    const pendingItems = cart.filter((i) => !i.is_placed);
    const hasUnlimited = pendingItems.some((i) =>
      (i.name || "").toLowerCase().includes("unlimited"),
    );

    if (pendingItems.length === 0 && !isPayNow) {
      alert("No new items in the tray to place.");
      setIsLoading(false);
      return;
    }

    try {
      // Only place order if there are pending items
      if (pendingItems.length > 0) {
        await axios.post(
          `${API_BASE}/orders/place`,
          {
            reservation_id: reservationId,
            items: pendingItems.map((i) => ({
              item_id: i.id,
              quantity: i.quantity,
              customizations: i.customizations,
            })),
          },
          getAuthHeader(),
        );

        if (hasUnlimited && !storage.getItem(TIMER_KEY)) {
          const endTime = Date.now() + 2 * 60 * 60 * 1000;
          storage.setItem(TIMER_KEY, endTime.toString());
          setTimeLeft(7200);
          setIsTimerRunning(true);
        }
      }

      const totalSessionAmount = calculateSessionTotal();
      const alreadyPaid = parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0);
      const newPendingAmount = totalSessionAmount - alreadyPaid;

      if (isPayNow && newPendingAmount > 0) {
        await axios.post(
          `${API_BASE}/billing/walkin`,
          {
            reservation_id: reservationId,
            amount: totalSessionAmount,
            payment_method: "Cash",
            payment_status: "verified",
          },
          getAuthHeader(),
        );

        storage.setItem(TOTAL_PAID_KEY, totalSessionAmount.toString());
        storage.setItem(PAYMENT_CHOICE_KEY, "verified");
        setIsPaid(true);
        await playCashierAlert();
      }

      // Refresh database records
      const updatedBill = await fetchCurrentBill();

      // IMPORTANT: Mark all current cart items as placed before replacing
      setCart((prevCart) =>
        prevCart.map((item) => ({ ...item, is_placed: true })),
      );

      // Convert updated database items back to cart items
      const getFullImage = (item) => {
        const rawPath = item.local_path || item.image_url;
        if (!rawPath) return "";
        if (rawPath.startsWith("http")) return rawPath;
        const cleanPath = rawPath.startsWith("/")
          ? rawPath.substring(1)
          : rawPath;
        return `${BASE_URL}/${cleanPath}`;
      };

      if (updatedBill && updatedBill.length > 0) {
        const freshCartItems = updatedBill.map((i) => ({
          id: i.item_id,
          name: i.item_name || i.name,
          price: i.item_price || i.price,
          image: getFullImage(i),
          category: i.category_name || "Regular",
          quantity: parseInt(i.qty || i.quantity || 1),
          customizations: i.customizations || "",
          is_placed: true,
        }));

        setCart(freshCartItems);
      } else if (pendingItems.length > 0) {
        // If no items returned from DB but we had pending items, mark them as placed
        setCart((prevCart) =>
          prevCart.map((item) => ({ ...item, is_placed: true })),
        );
      }

      setShowBillInfo(false);

      if (isPayNow) {
        setShowSessionModal(true);
      } else {
        // For "Pay Later", just clear pending items but keep placed items
        setCart((prevCart) => prevCart.filter((item) => item.is_placed));
      }
    } catch (e) {
      console.error("Order submission failed:", e);
      alert("Order submission failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    setIsLoading(true);
    try {
      let currentTableId = localStorage.getItem("tableId");
      await axios.post(
        `${API_BASE}/orders/finish`,
        {
          reservation_id: reservationId,
          table_id: currentTableId,
        },
        getAuthHeader(),
      );

      [
        "resId",
        "tableId",
        TIMER_KEY,
        PAYMENT_CHOICE_KEY,
        TOTAL_PAID_KEY,
        LAST_REFILL_KEY,
      ].forEach((k) => localStorage.removeItem(k));
      window.location.href = "/kiosk-selection";
    } catch (e) {
      localStorage.removeItem("resId");
      window.location.href = "/kiosk-selection";
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
    const savedEndTime = storage.getItem(TIMER_KEY);
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
        const savedEndTime = storage.getItem(TIMER_KEY);
        if (!savedEndTime) return;
        const remaining = Math.floor(
          (parseInt(savedEndTime) - Date.now()) / 1000,
        );
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          handleEndSession();
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const confirmFlavors = async () => {
    if (selectedFlavors.length === 0) {
      alert(`Select at least one flavor`);
      return;
    }
    if (selectedFlavors.length > 4) {
      alert(`You can select up to 4 flavors`);
      return;
    }

    const custPrefix = isRefillMode ? "[REFILL] " : "";
    const cust = `${custPrefix}Flavors: ${selectedFlavors.join(", ")}${selectedDrink ? " | Drink: " + selectedDrink : ""}`;

    const newItem = {
      ...selectedItem,
      quantity: 1,
      customizations: cust,
      price: isRefillMode ? 0 : selectedItem.price,
      is_refill: isRefillMode,
    };

    if (isRefillMode) {
      setIsLoading(true);
      try {
        await axios.post(
          `${API_BASE}/orders/place`,
          {
            reservation_id: reservationId,
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

        // Set local storage cooldown upon success
        storage.setItem(LAST_REFILL_KEY, Date.now().toString());

        setShowFlavorModal(false);
        setIsRefillMode(false);
        setShowSessionModal(true);
      } catch (e) {
        if (e.response?.data?.error === "Cooldown active") {
          setCooldownMessage(e.response.data.message);
          setShowFlavorModal(false);
        } else {
          alert("Refill failed.");
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setCart([...cart, newItem]);
      setShowFlavorModal(false);
    }
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

  if (loading) return <div className="loading-container">Loading Menu...</div>;

  return (
    <div className="res-kiosk-container">
      {/* HEADER */}
      <div
        className="kiosk-timer-wrapper"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "10px 30px",
          background: "#000",
          minHeight: "90px",
          borderBottom: "2px solid #222",
        }}
      >
        {/* LEFT: ID */}
        <div className="header-left-group">
          <div
            className="header-id-section"
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              padding: "8px 15px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <User size={20} color="#ffcc00" />
            <div className="id-details">
              <span
                style={{
                  color: "#ffcc00",
                  fontSize: "10px",
                  fontWeight: "900",
                  display: "block",
                }}
              >
                RESERVATION ID
              </span>
              <span
                style={{ color: "#fff", fontWeight: "900", fontSize: "16px" }}
              >
                {reservationId}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: TIMER & REFILL */}
        <div
          className="header-center-group"
          style={{ display: "flex", alignItems: "center", gap: "15px" }}
        >
          {isTimerRunning && (
            <>
              <div
                className="unlimited-timer-pill"
                style={{
                  border: "2px solid #ffcc00",
                  background: "#111",
                  padding: "5px 25px",
                  borderRadius: "50px",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    color: "#ffcc00",
                    fontSize: "10px",
                    fontWeight: "900",
                    display: "block",
                    textTransform: "uppercase",
                  }}
                >
                  Unlimited Time
                </span>
                <span
                  style={{
                    color: "#fff",
                    fontSize: "22px",
                    fontWeight: "800",
                    fontFamily: "monospace",
                  }}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
              <button
                onClick={handleRefillClick}
                className="refill-action-btn"
                style={{
                  background: "#ffcc00",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: "900",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={18} /> REFILL
              </button>
            </>
          )}
        </div>

        {/* RIGHT: VIEW RECEIPT / PAY */}
        <div
          className="header-right-group"
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button
            className="billing-btn-header"
            onClick={handleHeaderPayClick}
            style={{
              background:
                parseFloat(calculateTotalDue()) <= 0 ? "#28a745" : "#ffcc00",
              color: parseFloat(calculateTotalDue()) <= 0 ? "#fff" : "#000",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              fontWeight: "900",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CreditCard size={18} />{" "}
            {parseFloat(calculateTotalDue()) <= 0 ? "VIEW RECEIPT" : "PAY BILL"}
          </button>
        </div>
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
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>
                    ₱{parseFloat(item.price).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary
          cart={cart} // Pass full cart so reserved items stay visible in the tray
          onRemoveItem={(id) => {
            // Protect already placed database items from being locally cleared
            setCart((prev) => prev.filter((i) => i.id !== id || i.is_placed));
          }}
        />
      </div>

      <footer className="res-bottom-bar">
        {billItems.length === 0 && (
          <button
            className="res-btn-cancel"
            style={{ marginRight: "auto", background: "#444" }}
            onClick={() => navigate("/kiosk-selection")}
          >
            <ArrowLeft size={18} className="me-2" /> Exit Kiosk
          </button>
        )}
        <div className="res-action-btns" style={{ marginLeft: "auto" }}>
          <button className="res-btn-cancel" onClick={() => setCart([])}>
            Clear Tray
          </button>
          <button
            className="res-btn-view"
            disabled={cart.length === 0}
            onClick={() => {
              setIsFinalCheckout(false);
              setShowBillInfo(true);
            }}
          >
            Place Order ({cart.length})
          </button>
        </div>
      </footer>

      {/* CONFIRM ORDER OR BILL SUMMARY MODAL */}
      {showBillInfo && (
        <div className="res-modal-overlay" style={{ zIndex: 10000 }}>
          <div
            className="res-modal-card"
            style={{ maxWidth: "450px", textAlign: "center" }}
          >
            <Receipt
              size={50}
              color="#ffcc00"
              style={{ margin: "0 auto 15px" }}
            />
            <h2 style={{ color: "#ffcc00" }}>
              {isFinalCheckout ? "Bill Summary" : "Confirm Order"}
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
                // 1. Get the correct quantity
                const q = parseInt(item.quantity || item.qty || 1);

                // 2. Resolve the individual unit price dynamically
                let p = parseFloat(item.price);
                if (isNaN(p)) p = parseFloat(item.unit_price);
                if (isNaN(p) && item.item_price)
                  p = parseFloat(item.item_price) / q;
                if (isNaN(p)) p = 0;

                // 3. Force price to 0 if the item is a refill record
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
                    <div style={{ textAlign: "left" }}>
                      <span style={{ fontWeight: "bold", display: "block" }}>
                        {item.name || item.item_name}
                      </span>
                      <small style={{ color: "#888" }}>
                        {isRefill ? "Refill Option" : `₱${p.toFixed(2)} x ${q}`}
                      </small>
                    </div>
                    <span style={{ alignSelf: "center" }}>
                      ₱{(p * q).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: "1px solid #333", paddingTop: "10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#888",
                  fontSize: "0.9rem",
                }}
              >
                <span>Subtotal:</span>
                <span>₱{calculateSessionTotal().toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#28a745",
                  fontSize: "0.9rem",
                }}
              >
                <span>Paid / Downpayment:</span>
                <span>
                  - ₱
                  {parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.6rem",
                fontWeight: "bold",
                color: "#fff",
                marginTop: "10px",
              }}
            >
              <span>Total Due:</span>
              <span style={{ color: "#ffcc00" }}>₱{calculateTotalDue()}</span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              {isFinalCheckout ? (
                /* 1. HEADER VIEW BILL / FINAL CHECKOUT MODE */
                parseFloat(calculateTotalDue()) > 0 ? (
                  <>
                    <button
                      className="res-modal-btn-primary"
                      onClick={async () => {
                        const totalBill = calculateSessionTotal(); // The full total subtotal (e.g., 578.00)
                        setIsLoading(true);
                        try {
                          await axios.post(
                            `${API_BASE}/billing/walkin`,
                            {
                              reservation_id: reservationId,
                              amount: totalBill, // Overwrites database payment record with the full subtotal
                              payment_method: "Cash",
                              payment_status: "verified",
                            },
                            getAuthHeader(),
                          );

                          storage.setItem(TOTAL_PAID_KEY, totalBill.toString());
                          await fetchCurrentBill();
                          await playCashierAlert();
                        } catch (err) {
                          alert("Payment processing failed.");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      <Banknote size={18} style={{ marginRight: "8px" }} /> PAY
                      NOW (₱{calculateTotalDue()})
                    </button>
                    <button
                      className="res-btn-cancel"
                      onClick={() => setShowBillInfo(false)}
                    >
                      Pay Later & Close
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="res-modal-btn-primary"
                      style={{ background: "#28a745" }}
                      onClick={handleEndSession}
                    >
                      FINISH SESSION
                    </button>
                    <button
                      className="res-btn-cancel"
                      onClick={() => setShowBillInfo(false)}
                    >
                      Close
                    </button>
                  </>
                )
              ) : (
                /* 2. PLACING CURRENT ORDER TRAY MODE */
                <>
                  <button
                    className="res-modal-btn-primary"
                    onClick={() => confirmPaymentChoice("Pay Now")}
                  >
                    PAY NOW (CASHIER)
                  </button>
                  <button
                    className="res-modal-btn-primary"
                    style={{ background: "#444" }}
                    onClick={() => confirmPaymentChoice("Pay Later")}
                  >
                    ORDER NOW, PAY LATER
                  </button>
                  <button
                    className="res-btn-cancel"
                    onClick={() => setShowBillInfo(false)}
                  >
                    CANCEL
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC DATABASE CUSTOMIZATION MODAL (Wings, Ramen & Drinks) */}
      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}>
          <div className="res-modal-card flavor-modal-wide">
            <h2 className="modal-title-yellow">Customize Your Order</h2>
            <div className="customization-scroll-area">
              {/* Flavors Section */}
              <section className="modal-section">
                <h3 className="section-label">Select Flavors (Up to 4)</h3>
                <div className="flavor-grid">
                  {(selectedItem?.name?.toLowerCase().includes("ramen")
                    ? dynamicRamenFlavors
                    : dynamicFlavors
                  ).map((f) => (
                    <button
                      key={f}
                      onClick={() =>
                        setSelectedFlavors((prev) =>
                          prev.includes(f)
                            ? prev.filter((x) => x !== f)
                            : [...prev, f],
                        )
                      }
                      className={`flavor-btn ${selectedFlavors.includes(f) ? "active" : ""}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </section>

              {/* Drinks Section */}
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

      {isLoading && (
        <div
          className="res-modal-overlay"
          style={{ zIndex: 11000, background: "rgba(0, 0, 0, 0.8)" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            <RefreshCw className="spinner-loader" color="#ffcc00" size={60} />
            <h2 style={{ color: "#ffcc00" }}>Processing...</h2>
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
        onAdd={(newItem) => {
          setCart((prevCart) => {
            const existingIdx = prevCart.findIndex(
              (i) =>
                i.id === newItem.id &&
                i.customizations === newItem.customizations &&
                !i.is_placed,
            );

            if (existingIdx > -1) {
              const updated = [...prevCart];
              updated[existingIdx].quantity += newItem.quantity || 1;
              return updated;
            }
            return [
              ...prevCart,
              { ...newItem, quantity: newItem.quantity || 1, is_placed: false },
            ];
          });
        }}
        allProducts={menuData}
      />
      <style>{` .spinner-loader { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
    </div>
  );
};

export default KioskReservationMenu;

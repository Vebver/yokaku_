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
import { useToast } from "../ToastContext";

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
  const { showToast } = useToast();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const audioObj = useMemo(() => new Audio(alertMusicFile), []);
  const storage = window.localStorage;
  const [activeResId, setActiveResId] = useState(
    sessionStorage.getItem("resId") || null,
  );

  // 1. Extract physical table assignment from URL
  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const setupTable = queryParams.get("setupTable");
  const [kioskMode, setKioskMode] = useState("loading"); // "loading" | "event_waiting" | "active"

  // 3. Fallback to "GUEST" for normal table walk-in view
  const reservationId = activeResId || "GUEST";
  const TIMER_KEY = `kiosk_res_timer_${reservationId}`;
  const PAYMENT_CHOICE_KEY = `kiosk_pay_choice_${reservationId}`;
  const TOTAL_PAID_KEY = `kiosk_total_paid_${reservationId}`;
  const LAST_REFILL_KEY = `kiosk_last_refill_${reservationId}`;

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [localBillHistory, setLocalBillHistory] = useState([]);
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
  const hasOrderedUnlimited = [...billItems, ...cart].some((item) =>
    (item.menu_name || item.item_name || "")
      .toLowerCase()
      .includes("unlimited"),
  );

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
      return { headers: {} };
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const handleExitKiosk = () => {
    sessionStorage.removeItem("resId");
    sessionStorage.removeItem("tableId");

    // Update handleEndSession on lines 541-550:
    [
      "resId",
      "tableId",
      TIMER_KEY,
      PAYMENT_CHOICE_KEY,
      TOTAL_PAID_KEY,
      LAST_REFILL_KEY,
      "kiosk_last_refill_timestamp",
    ].forEach((k) => {
      sessionStorage.removeItem(k); // Clears sessionStorage
    });

    // 3. Redirect back to manual reservation entry screen with table assignment
    const searchString = setupTable ? `?setupTable=${setupTable}` : "";
    navigate(`/kiosk-selection${searchString}`);
  };

  const getFetchHeaders = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    return token && token !== "null" && token !== "undefined"
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  };

  const getCurrentTableId = () => {
    const rawTableId =
      sessionStorage.getItem("tableId") || localStorage.getItem("tableId");
    const parsed = parseInt(rawTableId, 10);
    return Number.isInteger(parsed) ? parsed : null;
  };

  // ==================== POLLING & MODE DETECTOR ====================
  useEffect(() => {
    const checkActiveKiosk = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reservations/active-kiosk`, {
          params: { tableId: setupTable },
        });

        if (res.data && res.data.success) {
          const { mode, reservation } = res.data;

          if (mode === "event_waiting") {
            // An event is scheduled now, block the physical table view
            if (activeResId) {
              localStorage.removeItem("resId");
              localStorage.removeItem("tableId");
              setActiveResId(null);
            }
            setKioskMode("event_waiting");
          }
          // EXCLUSIVELY FOR ACTIVE PRIVATE EVENTS: Auto-unlocks and loads menu
          else if (mode === "event_active") {
            const { reservation_id, table_id } = reservation;
            if (activeResId !== reservation_id) {
              sessionStorage.setItem("resId", reservation_id);
              if (table_id)
                sessionStorage.setItem("tableId", table_id.toString());
              setActiveResId(reservation_id);
            }
            setKioskMode("active");
          } else {
            // "table_default" / "table_assigned" - Let manual table check-ins run normally
            setKioskMode("active");
          }
        }
      } catch (err) {
        console.error("Kiosk state check error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkActiveKiosk();
    const pollInterval = setInterval(checkActiveKiosk, 3000);
    return () => clearInterval(pollInterval);
  }, [activeResId, setupTable]);

  const calculateSessionTotal = () => {
    const databaseTotal = billItems.reduce((sum, item) => {
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

      if (isRefill) p = 0;

      // ✅ FIX: Exclude packages from food calculations
      const nameStr = (item.menu_name || item.item_name || "").toLowerCase();
      if (
        nameStr.includes("standard package") ||
        nameStr.includes("premium package") ||
        nameStr.includes("reservation fee") ||
        nameStr.includes("downpayment")
      ) {
        return sum;
      }

      return sum + p * q;
    }, 0);

    const pendingTotal = cart
      .filter((item) => !item.is_placed)
      .reduce((sum, item) => {
        const q = parseInt(item.quantity || item.qty || 1);
        let p = parseFloat(item.price);
        if (isNaN(p)) p = 0;

        const isRefill =
          item.is_refill === 1 ||
          item.is_refill === true ||
          (item.customizations &&
            item.customizations.toString().includes("[REFILL]"));

        if (isRefill) p = 0;

        // ✅ FIX: Exclude packages from pending calculations
        const nameStr = (item.name || item.item_name || "").toLowerCase();
        if (
          nameStr.includes("standard package") ||
          nameStr.includes("premium package") ||
          nameStr.includes("reservation fee") ||
          nameStr.includes("downpayment")
        ) {
          return sum;
        }

        return sum + p * q;
      }, 0);

    return databaseTotal + pendingTotal;
  };

  const calculateTotalDue = () => {
    // Since packages and downpayments are filtered out, the due amount
    // is simply the total value of their extra food items.
    const totalSession = calculateSessionTotal();
    return totalSession > 0 ? totalSession.toFixed(2) : "0.00";
  };
  const fetchCurrentBill = async () => {
    try {
      const res = await axios.get(
        // CHANGE THIS PATH TO /reservations/
        `${API_BASE}/reservations/${reservationId}/items`,
        getAuthHeader(),
      );
      if (res.data) setBillItems(res.data);
      return res.data;
    } catch (err) {
      console.warn("Error fetching items:", err);
      return [];
    }
  };
  const playCashierAlert = async () => {
    try {
      audioObj.currentTime = 0;
      await audioObj.play();
    } catch (e) {}
  };

  const findUnlimitedItem = () => {
    for (const cat of Object.keys(menuData)) {
      const found = menuData[cat].find((item) => {
        // SAFE CHECK: Check all three naming properties to find the Unlimited item
        const nameToCheck = (
          item.menu_name ||
          item.item_name ||
          item.name ||
          ""
        ).toLowerCase();
        return nameToCheck.includes("unlimited");
      });
      if (found) return found;
    }
    return null;
  };

  const handleRefillClick = () => {
    const lastRefill = storage.getItem(LAST_REFILL_KEY);
    if (lastRefill) {
      const timeElapsed = Date.now() - parseInt(lastRefill, 10);
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
      setCooldownMessage(
        "No active Unlimited package found in the system registry.",
      );
      return;
    }

    setSelectedItem(unlimitedItem);
    setSelectedFlavors([]);
    setSelectedDrink("");
    setIsRefillMode(true);
    setShowFlavorModal(true);
  };

  useEffect(() => {
    if (activeCategory === "Unlimited" && hasOrderedUnlimited) {
      const fallbackCategory = Object.keys(menuData).find(
        (cat) => !HIDDEN_CATEGORIES.includes(cat) && cat !== "Unlimited",
      );
      if (fallbackCategory) {
        setActiveCategory(fallbackCategory);
      }
    }
  }, [activeCategory, hasOrderedUnlimited, menuData]);

  const refreshMenuData = async () => {
    try {
      const prodRes = await fetch(`${API_BASE}/products`, {
        headers: getFetchHeaders(),
      }).then((r) => r.json());

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

      prodRes.forEach((item) => {
        if (item.is_available === 0 || item.is_available === false) return;

        const cat = item.category_name || "General";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
          id: item.item_id,
          name: item.menu_name || item.name,
          image: getFullImage(item),
          price: item.price,
          category: cat,
        });
      });

      setMenuData(grouped);
      setDynamicFlavors(
        (grouped["Chicken"] || grouped["Chicken Wings"] || []).map(
          (i) => i.menu_name || i.name,
        ),
      );
      setDynamicRamenFlavors(
        (grouped["Ramen"] || []).map((i) => i.menu_name || i.name),
      );
      setDynamicDrinks(
        [...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map(
          (i) => i.menu_name || i.name,
        ),
      );

      const cats = Object.keys(grouped).filter(
        (c) => !HIDDEN_CATEGORIES.includes(c),
      );
      setActiveCategory((prev) => {
        if (prev && grouped[prev]) return prev;
        return cats[0] || prev;
      });
    } catch (e) {
      console.error("Menu refresh error", e);
    }
  };

  // Initial data fetch and Tray/Cart synchronization
  useEffect(() => {
    if (!activeResId) {
      const searchString = setupTable ? `?setupTable=${setupTable}` : "";
      navigate(`/kiosk-selection${searchString}`);
      return;
    }

    const fetchData = async () => {
      try {
        const [prodRes, resItemsRes, reservationRes] = await Promise.all([
          fetch(`${API_BASE}/products`, { headers: getFetchHeaders() }).then(
            (r) => r.json(),
          ),
          // CORRECTED: Pointing to /api/reservations/ instead of /api/orders/
          axios
            .get(
              `${API_BASE}/reservations/${reservationId}/items`,
              getAuthHeader(),
            )
            .then((r) => r.data)
            .catch(() => null),
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
        // Inside KioskReservationMenu.jsx -> useEffect()

        if (resItemsRes && resItemsRes.length > 0) {
          setBillItems(resItemsRes);

          // ✅ FIX: Filter out "standard package" and "premium package" from the tray
          const filteredCartItems = resItemsRes.filter((i) => {
            const customizationsStr = (i.customizations || "")
              .toString()
              .toLowerCase();
            const nameStr = (i.item_name || i.menu_name || "").toLowerCase();

            return !(
              customizationsStr.includes("reservation fee") ||
              nameStr.includes("reserve a table") ||
              nameStr.includes("table fee") ||
              nameStr.includes("downpayment") ||
              nameStr.includes("standard package") ||
              nameStr.includes("premium package")
            );
          });

          setCart(
            filteredCartItems.map((i) => ({
              id: i.item_id,
              name: i.item_name || i.menu_name,
              price: i.item_price || i.price,
              quantity: parseInt(i.qty || i.quantity || 1),
              customizations: i.customizations,
              is_placed: true,
            })),
          );

          // === AUTO TRIGGER TIMER FOR PRE-BOOKED UNLIMITED RESERVATIONS ===
          const hasUnlimitedPreBooked = resItemsRes.some((item) =>
            (item.item_name || item.menu_name || "")
              .toLowerCase()
              .includes("unlimited"),
          );
          const currentTimerKey = `kiosk_res_timer_${activeResId}`;
          if (hasUnlimitedPreBooked && !storage.getItem(currentTimerKey)) {
            const endTime = Date.now() + 1.5 * 60 * 60 * 1000; // 90 minutes
            storage.setItem(currentTimerKey, endTime.toString());
            setTimeLeft(5400);
            setIsTimerRunning(true);
          }
        } else {
          setCart([]);
          setBillItems([]);
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

        prodRes.forEach((item) => {
          if (item.is_available === 0 || item.is_available === false) return;

          const cat = item.category_name || "General";
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push({
            id: item.item_id,
            name: item.menu_name || item.name,
            image: getFullImage(item),
            price: item.price,
            category: cat,
          });
        });

        setMenuData(grouped);

        // SAFE MAP: Added fallback to i.name to prevent undefined arrays
        setDynamicFlavors(
          (grouped["Chicken"] || grouped["Chicken Wings"] || []).map(
            (i) => i.menu_name || i.name,
          ),
        );
        setDynamicRamenFlavors(
          (grouped["Ramen"] || []).map((i) => i.menu_name || i.name),
        );
        setDynamicDrinks(
          [...(grouped["Beverages"] || []), ...(grouped["Drinks"] || [])].map(
            (i) => i.menu_name || i.name,
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
  }, [activeResId, reservationId]);

  const confirmPaymentChoice = async (choice) => {
    setIsLoading(true);
    const isPayNow = choice === "Pay Now";

    // 1. Filter out items that are already ordered (is_placed: true)
    const pendingItems = cart.filter((i) => !i.is_placed);

    const hasUnlimitedPackage = [...billItems, ...cart].some((item) =>
      (item.menu_name || item.item_name || item.name || "")
        .toLowerCase()
        .includes("unlimited"),
    );

    try {
      // 2. Only post new items to the kitchen if there are actually new items in the tray
      const tableId = getCurrentTableId();
      if (pendingItems.length > 0) {
        await axios.post(
          `${API_BASE}/orders/place`,
          {
            reservation_id: reservationId,
            table_id: tableId,
            items: pendingItems.map((i) => ({
              item_id: i.id,
              quantity: i.quantity,
              customizations: i.customizations,
            })),
          },
          getAuthHeader(),
        );
      }

      // 3. START the timer if they have an unlimited package and it's not already running
      if (hasUnlimitedPackage && !storage.getItem(TIMER_KEY)) {
        const endTime = Date.now() + 1.5 * 60 * 60 * 1000; // 90 mins
        storage.setItem(TIMER_KEY, endTime.toString());
        setTimeLeft(5400); // 5400s
        setIsTimerRunning(true);
      }

      // 4. Process payments only if choosing "Pay Now"
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

      // 5. Refresh backend bill records and synchronize tray states
      await fetchCurrentBill();

      // Clear the cart tray completely now that the items are submitted
      setCart([]);
      setShowBillInfo(false); // Closes the billing view cleanly

      if (isPayNow) {
        setShowSessionModal(true);
      }
    } catch (e) {
      console.error("Order submission failed:", e);
      showToast("Order submission failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    setIsLoading(true);
    try {
      const currentTableId = getCurrentTableId();
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
        "kiosk_last_refill_timestamp",
      ].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });

      setCart([]);
      setBillItems([]);
      setLocalBillHistory([]);
      setActiveResId(null);

      // REDIRECT BACK TO MANUAL CHECK-IN LANDING PAGE
      const searchString = setupTable ? `?setupTable=${setupTable}` : "";
      navigate(`/kiosk-selection/kiosk-reservation${searchString}`);
    } catch (e) {
      localStorage.removeItem("resId");
      setCart([]);
      setBillItems([]);
      setActiveResId(null);

      // REDIRECT BACK TO MANUAL CHECK-IN LANDING PAGE (FALLBACK)
      const searchString = setupTable ? `?setupTable=${setupTable}` : "";
      navigate(`/kiosk-selection/kiosk-reservation${searchString}`);
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
    if (!activeResId) return;
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
  }, [activeResId]);

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
      setCooldownMessage("Please select at least one flavor.");
      return;
    }
    if (selectedFlavors.length > 4) {
      setCooldownMessage("You can select a maximum of 4 flavors.");
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
            table_id: getCurrentTableId(),
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

        storage.setItem(LAST_REFILL_KEY, Date.now().toString());

        setShowFlavorModal(false);
        setIsRefillMode(false);
        setShowSessionModal(true);
      } catch (e) {
        if (e.response?.data?.error === "Cooldown active") {
          setCooldownMessage(e.response.data.message);
          setShowFlavorModal(false);
        } else {
          setCooldownMessage("Refill failed.");
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
    const itemName = (item.menu_name || "").toLowerCase();
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

  // ==================== LOADING RENDER ====================
  if (loading || kioskMode === "loading") {
    return <div className="loading-container">Loading Menu...</div>;
  }

  // ==================== EVENT WAITING LOCKOUT SCREEN ====================
  if (kioskMode === "event_waiting") {
    return (
      <div
        className="kiosk-resting-screen"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#080808",
          color: "#fff",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#111",
            border: "2px solid #222",
            padding: "40px 60px",
            borderRadius: "20px",
            maxWidth: "600px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <UtensilsCrossed
            size={80}
            color="#ffcc00"
            style={{ margin: "0 auto 20px" }}
          />
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "900",
              color: "#fff",
              margin: "10px 0",
            }}
          >
            Event Setup Active
          </h1>
          <p
            style={{ color: "#888", fontSize: "1.2rem", margin: "15px 0 30px" }}
          >
            This kiosk is temporarily locked during our private event. Please
            wait for our staff to activate your session.
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "#1e1a05",
              border: "1px solid #443c0c",
              padding: "10px 20px",
              borderRadius: "50px",
            }}
          >
            <RefreshCw size={18} color="#ffcc00" className="spinner-loader" />
            <span style={{ color: "#ffcc00", fontWeight: "bold" }}>
              Waiting for host activation...
            </span>
          </div>
        </div>
        <style>{` .spinner-loader { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  // ==================== STANDARD KIOSK ACTIVE VIEW ====================
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
                    alt={item.menu_name}
                    className="res-food-img"
                  />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">
                    {item.menu_name || item.name}
                  </h4>
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>
                    ₱{parseFloat(item.price).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary
          cart={cart}
          onRemoveItem={(id) => {
            setCart((prev) => prev.filter((i) => i.id !== id));
          }}
        />
      </div>

      <footer className="res-bottom-bar">
        {billItems.length === 0 && (
          <button
            className="res-btn-cancel"
            style={{ marginRight: "auto", background: "#444" }}
            onClick={handleExitKiosk}
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

            {/* Inside KioskReservationMenu.jsx -> Confirm Order / Bill Summary Modal */}
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

                // ✅ FIX: Hides the administrative reservation packages from the food receipt view
                const nameStr = (
                  item.menu_name ||
                  item.item_name ||
                  ""
                ).toLowerCase();
                if (
                  nameStr.includes("standard package") ||
                  nameStr.includes("premium package") ||
                  nameStr.includes("reservation fee") ||
                  nameStr.includes("downpayment")
                ) {
                  return null; // Skips rendering without breaking calculations
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
                        {item.menu_name || item.item_name}
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

              {/* ✅ The "Paid / Downpayment" subtraction block has been cleanly removed here */}
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
                parseFloat(calculateTotalDue()) > 0 ? (
                  <>
                    <button
                      className="res-modal-btn-primary"
                      onClick={async () => {
                        const totalBill = calculateSessionTotal();
                        setIsLoading(true);
                        try {
                          await axios.post(
                            `${API_BASE}/billing/walkin`,
                            {
                              reservation_id: reservationId,
                              amount: totalBill,
                              payment_method: "Cash",
                              payment_status: "verified",
                            },
                            getAuthHeader(),
                          );

                          storage.setItem(TOTAL_PAID_KEY, totalBill.toString());
                          await fetchCurrentBill();
                          await playCashierAlert();
                        } catch (err) {
                          showToast("Payment processing failed.");
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
                      FINISH
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
                <>
                  <button
                    className="res-modal-btn-primary"
                    onClick={() => confirmPaymentChoice("Pay Now")}
                  >
                    PAY NOW (CASHIER)
                  </button>
                  <button
                    className="res-modal-btn-primary"
                    style={{ background: "#ffcc00" }}
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

      {/* DYNAMIC DATABASE CUSTOMIZATION MODAL */}
      {showFlavorModal && (
        <div className="res-modal-overlay" style={{ zIndex: 9000 }}>
          <div className="res-modal-card flavor-modal-wide">
            <h2 className="modal-title-yellow">Customize Your Order</h2>
            <div className="customization-scroll-area">
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
                        setSelectedFlavors((prev) => {
                          if (prev.includes(f)) {
                            return prev.filter((x) => x !== f);
                          }
                          if (prev.length >= 4) {
                            setCooldownMessage(
                              "You can select a maximum of 4 flavors.",
                            );
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

      {/* COOLDOWN & NOTICE FEEDBACK MODAL */}
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
            <h3 style={{ color: "#ffcc00" }}>
              {cooldownMessage.toLowerCase().includes("cooldown")
                ? "Refill Cooldown"
                : "Notice"}
            </h3>
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

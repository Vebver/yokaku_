import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusSquare,
  Drumstick,
  CupSoda,
  Star,
  Flame,
  Wallet,
  Infinity as InfinityIcon,
  Pizza,
  Beef,
  Package,
  Utensils,
  Soup,
  Salad,
  Receipt,
  CreditCard,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  X
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import axios from "axios";
import { io as ioClient } from "socket.io-client";
import alertMusicFile from "../../assets/alert-sound.mp3";
import { useToast } from "../ToastContext";
import refillCooldown from "../../../../shared/refillCooldown.json";
import { API_BASE, SERVER_URL as BASE_URL } from "../../api";
import {
  getPackageCategories,
  getDrinkOptions,
  getPackageInclusions,
  getPackageItems,
  getPackageMenuData,
  getPackageChickenCount,
  getPackageQuantityLimit,
  getCategory,
  getUnlimitedPackage,
  inferUnlimitedPackageMode,
  isJuiceItem,
  isChickenCategory,
  isPackageCardForMode,
  sanitizePackageCart,
  validatePackageCart
} from "./unlimitedPackageRules";
const HIDDEN_CATEGORIES = [
  "Chicken Wings",
  "Beverages",
  "Drinks",
  "Chicken",
  "Ramen"
];
const DURATION = 1.5 * 60 * 60 * 1e3;
const categoryIcons = {
  "Best Seller": /* @__PURE__ */ React.createElement(Flame, null),
  "Budget Meals": /* @__PURE__ */ React.createElement(Wallet, null),
  Unlimited: /* @__PURE__ */ React.createElement(InfinityIcon, null),
  Pizzas: /* @__PURE__ */ React.createElement(Pizza, null),
  Burgers: /* @__PURE__ */ React.createElement(Beef, null),
  Bundle: /* @__PURE__ */ React.createElement(Package, null),
  Extra: /* @__PURE__ */ React.createElement(PlusSquare, null),
  "Rice Bowl Combo": /* @__PURE__ */ React.createElement(Soup, null),
  Beverages: /* @__PURE__ */ React.createElement(CupSoda, null),
  "Side Dish": /* @__PURE__ */ React.createElement(Utensils, null),
  Pasta: /* @__PURE__ */ React.createElement(Salad, null),
  "Chicken Wings": /* @__PURE__ */ React.createElement(Drumstick, null)
};
const KioskMenu = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const audioRef = useMemo(() => new Audio(alertMusicFile), []);
  const storage = window.sessionStorage;
  const TIMER_KEY = "kiosk_walkin_timer_end";
  const SAVED_TABLE_ID = "kiosk_active_table_id";
  const SAVED_RES_ID = "kiosk_active_res_id";
  const FIXED_KIOSK_KEY = "kiosk_fixed_table_id";
  const PAYMENT_CHOICE_KEY = "kiosk_payment_choice";
  const TOTAL_PAID_KEY = "kiosk_total_paid";
  const LAST_REFILL_KEY = "kiosk_last_refill_timestamp";
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPackageTimerExpired, setIsPackageTimerExpired] = useState(false);
  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );
  const setupTable = queryParams.get("setupTable");
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [tableKioskMenuMode, setTableKioskMenuMode] = useState("default");
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [localBillHistory, setLocalBillHistory] = useState([]);
  const [isPaid, setIsPaid] = useState(
    storage.getItem(PAYMENT_CHOICE_KEY) === "verified"
  );
  const [localTotalPaid, setLocalTotalPaid] = useState(
    parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0)
  );
  const hasOrderedUnlimited = [...billItems, ...cart].some(
    (item) => (item.name || item.item_name || "").toLowerCase().includes("unlimited")
  );
  const hasPlacedUnlimitedOrder = [...billItems, ...localBillHistory].some(
    (item) => (item.name || item.item_name || "").toLowerCase().includes("unlimited")
  );
  const orderedPackageMode = [...billItems, ...localBillHistory, ...cart].map(inferUnlimitedPackageMode).find(Boolean);
  const kioskMenuMode = getUnlimitedPackage(tableKioskMenuMode) ? tableKioskMenuMode : isPackageTimerExpired ? tableKioskMenuMode : orderedPackageMode || tableKioskMenuMode;
  const isUnlimitedMode = Boolean(getUnlimitedPackage(kioskMenuMode));
  const unlimitedSessionLocked = isUnlimitedMode && hasPlacedUnlimitedOrder;
  const packageInclusions = getPackageInclusions(menuData, kioskMenuMode);
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
  const flavorPackageMode = inferUnlimitedPackageMode(selectedItem) || kioskMenuMode;
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [availableTables, setAvailableTables] = useState([]);
  const [pendingOrderDetails, setPendingOrderDetails] = useState({
    tableId: null,
    mode: "Dine-In"
  });
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [dynamicFlavors, setDynamicFlavors] = useState([]);
  const [dynamicRamenFlavors, setDynamicRamenFlavors] = useState([]);
  const [dynamicDrinks, setDynamicDrinks] = useState([]);
  const [isRefillMode, setIsRefillMode] = useState(false);
  const [refillCooldownSeconds, setRefillCooldownSeconds] = useState(0);
  const [cooldownMessage, setCooldownMessage] = useState(null);
  const [browseFullMenu, setBrowseFullMenu] = useState(false);
  const showUnlimitedCategory = isUnlimitedMode && !hasOrderedUnlimited;
  const currentTableId = localStorage.getItem("tableId") || "takeout";
  const generateShortWalkInId = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `WALK-${result}`;
  };
  const getAuthHeader = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
      return { headers: {} };
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  };
  const getFetchHeaders = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return token && token !== "null" && token !== "undefined" ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  };
  const formatTime = (seconds) => {
    if (seconds <= 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  const getRefillCooldownSeconds = () => {
    const lastRefill = Number(storage.getItem(LAST_REFILL_KEY));
    if (!Number.isFinite(lastRefill) || lastRefill <= 0) return 0;
    return Math.max(
      0,
      Math.ceil(
        (refillCooldown.milliseconds - (Date.now() - lastRefill)) / 1e3
      )
    );
  };
  const formatCooldownTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };
  const playAlert = async () => {
    try {
      if (!audioRef) return;
      audioRef.currentTime = 0;
      await audioRef.play();
    } catch (e) {
      console.log("Audio blocked:", e);
    }
  };
  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => {
      const p = parseFloat(item.price || 0);
      const q = parseInt(item.quantity || 1);
      return sum + p * q;
    }, 0);
  };
  const calculateSessionTotal = (excludeCart = false) => {
    const history = billItems.length > 0 ? billItems : localBillHistory;
    const combined = excludeCart ? history : [...history, ...cart];
    return combined.reduce((sum, item) => {
      const q = parseInt(item.quantity || item.qty || 1);
      let p = parseFloat(item.price);
      if (isNaN(p)) p = parseFloat(item.unit_price);
      if (isNaN(p) && item.item_price) p = parseFloat(item.item_price) / q;
      if (isNaN(p)) p = 0;
      const isRefill = item.is_refill === 1 || item.is_refill === true || item.customizations && item.customizations.toString().includes("[REFILL]");
      if (isRefill) {
        p = 0;
      }
      return sum + p * q;
    }, 0);
  };
  const calculateTotalDue = (excludeCart = false) => {
    const totalSession = calculateSessionTotal(excludeCart);
    const due = totalSession - localTotalPaid;
    return due > 0 ? due.toFixed(2) : "0.00";
  };
  const syncWithDashboard = async (resId, amount, method = "Cash", status = "pending") => {
    try {
      await axios.post(
        `${API_BASE}/billing/walkin`,
        {
          reservation_id: resId,
          amount: parseFloat(amount),
          payment_method: method,
          payment_status: status
        },
        getAuthHeader()
      );
      return true;
    } catch (err) {
      console.error("Sync failed", err);
      throw err;
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setupTable2 = params.get("setupTable");
    if (setupTable2) {
      window.localStorage.setItem(FIXED_KIOSK_KEY, setupTable2);
      console.log(`Kiosk locked to Table ID: ${setupTable2}`);
    }
  }, []);
  const handleEndSession = async () => {
    await playAlert();
    const activeTable = storage.getItem(SAVED_TABLE_ID);
    const activeResId = storage.getItem(SAVED_RES_ID);
    if (activeResId) {
      try {
        await axios.post(
          `${API_BASE}/orders/finish`,
          {
            table_id: activeTable,
            reservation_id: activeResId
          },
          getAuthHeader()
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
      LAST_REFILL_KEY,
      "kiosk_last_refill_timestamp"
    ].forEach((k) => {
      storage.removeItem(k);
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
    setCart([]);
    setBillItems([]);
    setLocalBillHistory([]);
    sessionStorage.setItem("kiosk_exit_to_selection", "true");
    window.location.href = "/kiosk-selection";
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
        Math.floor((parseInt(savedEnd) - Date.now()) / 1e3)
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
    const interval = setInterval(syncTimer, 1e3);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const syncRefillCooldown = () => {
      setRefillCooldownSeconds(getRefillCooldownSeconds());
    };
    syncRefillCooldown();
    const interval = setInterval(syncRefillCooldown, 1e3);
    return () => clearInterval(interval);
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
  const wasWingsTimerRunning = useRef(false);
  useEffect(() => {
    if (!isUnlimitedMode) {
      wasWingsTimerRunning.current = false;
      return;
    }
    if (isTimerRunning) {
      wasWingsTimerRunning.current = true;
      return;
    }
    if (wasWingsTimerRunning.current && timeLeft <= 0) {
      wasWingsTimerRunning.current = false;
      sessionStorage.removeItem(TIMER_KEY);
      setTableKioskMenuMode("default");
      setIsPackageTimerExpired(true);
      setActiveCategory((prev) => prev === "Unlimited" ? "" : prev);
      showToast(
        "Unlimited Wings time is up. You can keep ordering from the full menu.",
        "info"
      );
      (async () => {
        try {
          if (setupTable != null) {
            await axios.post(
              `${API_BASE}/admin/kiosk-mode-expired/${setupTable}`,
              {},
              getAuthHeader()
            );
          }
        } catch (err) {
          console.warn("Could not persist kiosk mode reset:", err?.message);
        }
      })();
    }
  }, [isTimerRunning, timeLeft, isUnlimitedMode, setupTable, TIMER_KEY]);
  const fetchCurrentBill = async () => {
    const resId = storage.getItem(SAVED_RES_ID);
    if (!resId) {
      return [];
    }
    try {
      const res = await axios.get(
        `${API_BASE}/orders/reservation-items/${resId}`,
        getAuthHeader()
      );
      setBillItems(res.data || []);
      return res.data;
    } catch (err) {
      console.warn("Could not fetch billing items:", err.message);
      return [];
    }
  };
  const confirmPaymentChoice = async (choice) => {
    if (isLoading) return;
    const itemsToSubmit = [...cart];
    if (itemsToSubmit.length === 0) return;
    const existingOrderItems = billItems.length > 0 ? billItems : localBillHistory;
    const hasRefillOrder = itemsToSubmit.some(
      (item) => item.is_refill === true || (item.customizations || "").toString().includes("[REFILL]")
    );
    const cooldownRemaining = hasRefillOrder ? getRefillCooldownSeconds() : 0;
    if (cooldownRemaining > 0) {
      setRefillCooldownSeconds(cooldownRemaining);
      setCooldownMessage(
        `Refill is on cooldown. Please wait ${formatCooldownTime(cooldownRemaining)} before requesting another.`
      );
      return;
    }
    const packageError = validatePackageCart(
      [...existingOrderItems, ...itemsToSubmit],
      kioskMenuMode,
      packageInclusions
    );
    if (packageError) {
      showToast(packageError, "error");
      return;
    }
    setIsLoading(true);
    const { tableId, mode } = pendingOrderDetails;
    const activeResId = storage.getItem(SAVED_RES_ID);
    const dynamicResId = activeResId || generateShortWalkInId();
    const isPayNow = choice === "Pay Now";
    const hasUnlimited = itemsToSubmit.some(
      (i) => (i?.name || i?.item_name || "").toLowerCase().includes("unlimited")
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
            customizations: mode === "Take-Out" ? `[TAKE-OUT] ${i.customizations || ""}` : i.customizations,
            is_refill: i.price === 0
          })),
          allergy_note: allergyNote !== "None" ? allergyNote : null
        },
        getAuthHeader()
      );
      if (hasRefillOrder) {
        storage.setItem(LAST_REFILL_KEY, Date.now().toString());
        setRefillCooldownSeconds(refillCooldown.milliseconds / 1e3);
      }
      setLocalBillHistory((prev) => [...prev, ...itemsToSubmit]);
      setCart([]);
      const effectiveTableId = tableId != null && tableId !== "takeout" ? tableId : storage.getItem(SAVED_TABLE_ID) || setupTable || tableId || "takeout";
      storage.setItem(SAVED_TABLE_ID, String(effectiveTableId));
      storage.setItem(SAVED_RES_ID, dynamicResId);
      if (hasUnlimited && !sessionStorage.getItem(TIMER_KEY)) {
        const endTime = Date.now() + DURATION;
        sessionStorage.setItem(TIMER_KEY, endTime.toString());
        setIsTimerRunning(true);
        setTimeLeft(DURATION / 1e3);
      }
      if (isPayNow) {
        const currentHistory = billItems.length > 0 ? billItems : localBillHistory;
        const combinedSessionItems = [...currentHistory, ...itemsToSubmit];
        const computedSessionTotal = combinedSessionItems.reduce(
          (sum, item) => {
            const q = parseInt(item.quantity || item.qty || 1);
            let p = parseFloat(item.price);
            if (isNaN(p)) p = parseFloat(item.unit_price);
            if (isNaN(p) && item.item_price)
              p = parseFloat(item.item_price) / q;
            if (isNaN(p)) p = 0;
            const isRefill = item.is_refill === 1 || item.is_refill === true || item.customizations && item.customizations.toString().includes("[REFILL]");
            if (isRefill) p = 0;
            return sum + p * q;
          },
          0
        );
        await syncWithDashboard(
          dynamicResId,
          computedSessionTotal,
          "Cash",
          "verified"
        );
        storage.setItem(TOTAL_PAID_KEY, computedSessionTotal.toString());
        setLocalTotalPaid(computedSessionTotal);
        storage.setItem(PAYMENT_CHOICE_KEY, "verified");
        setIsPaid(true);
        showToast("Your order has been placed. Thank you!", "success");
      } else {
        setIsPaid(false);
        storage.removeItem(PAYMENT_CHOICE_KEY);
        showToast("Your order has been placed. Thank you!", "success");
      }
      await fetchCurrentBill();
      setShowPaymentModal(false);
      setShowBillInfo(false);
      setIsFinalCheckout(false);
    } catch (error) {
      console.error(error);
      if (error.response?.data?.error === "Cooldown active") {
        const message = error.response.data.message || "Please wait before requesting another refill.";
        const remainingMinutes = Number(message.match(/(\d+) more minutes?/i)?.[1]);
        if (remainingMinutes > 0) {
          const remainingSeconds = remainingMinutes * 60;
          storage.setItem(
            LAST_REFILL_KEY,
            String(
              Date.now() - (refillCooldown.milliseconds - remainingSeconds * 1e3)
            )
          );
          setRefillCooldownSeconds(remainingSeconds);
        }
        setCooldownMessage(message);
      } else {
        showToast("Order failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleRefillClick = () => {
    const cooldownRemaining = getRefillCooldownSeconds();
    if (cooldownRemaining > 0) {
      setRefillCooldownSeconds(cooldownRemaining);
      setCooldownMessage(
        `Refill is on cooldown. Please wait ${formatCooldownTime(cooldownRemaining)} before requesting another.`
      );
      return;
    }
    const chickenItems = (menuData["Chicken"] || []).filter(
      (i) => i.isStockAvailable !== false
    );
    if (chickenItems.length === 0) {
      showToast("No chicken flavors available for refill.", "error");
      return;
    }
    const refillTarget = chickenItems[0];
    const packageItems = [
      ...billItems.length > 0 ? billItems : localBillHistory,
      ...cart
    ];
    const refillItem = {
      ...refillTarget,
      price: 0,
      quantity: 1,
      customizations: `[REFILL] Flavors: ${refillTarget.name}`,
      is_refill: true
    };
    const packageError = validatePackageCart(
      [...packageItems, refillItem],
      kioskMenuMode,
      packageInclusions
    );
    if (packageError) {
      showToast(packageError, "error");
      return;
    }
    setCart((current) => [...current, refillItem]);
    showToast("Refill added to tray.", "success");
  };
  const handleHeaderPayClick = async () => {
    const packageError = validatePackageCart(
      [
        ...billItems.length > 0 ? billItems : localBillHistory,
        ...cart
      ],
      kioskMenuMode,
      packageInclusions
    );
    if (packageError) {
      showToast(packageError, "error");
      return;
    }
    setIsPaymentProcessing(false);
    await fetchCurrentBill();
    setIsFinalCheckout(true);
    const due = parseFloat(calculateTotalDue(true));
    setIsPaid(due <= 0);
    setShowBillInfo(true);
  };
  const handlePlaceOrderClick = async () => {
    const hasRefillOrder = cart.some(
      (item) => item.is_refill === true || (item.customizations || "").toString().includes("[REFILL]")
    );
    if (isUnlimitedMode && hasRefillOrder) {
      await confirmPaymentChoice("Pay Later");
      return;
    }
    setShowAllergyModal(true);
  };
  const fetchMenu = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`, {
        headers: getFetchHeaders()
      });
      const data = await response.json();
      const grouped = data.reduce((acc, item) => {
        if (item.is_available === 0 || item.is_available === false) return acc;
        const cat = item.category_name || "General";
        if (!acc[cat]) acc[cat] = [];
        let img = item.local_path || item.image_url;
        if (img && !img.startsWith("http")) {
          const cleanPath = img.startsWith("/") ? img.substring(1) : img;
          const cleanBase = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
          img = `${cleanBase}${cleanPath}`;
        }
        const stockBlocked = item.is_stock_available === 0 || item.is_stock_available === false;
        acc[cat].push({
          id: item.item_id,
          name: item.menu_name || item.name,
          image: img,
          price: item.price,
          category: cat,
          description: item.description || "",
          isStockAvailable: !stockBlocked,
          category_id: item.category_id,
          package_inclusions: item.package_inclusions || [],
          unavailableReason: stockBlocked ? item.availability_reason || "Not available" : null
        });
        return acc;
      }, {});
      setMenuData(grouped);
      setDynamicFlavors((grouped["Chicken"] || []).map((i) => i.name));
      setDynamicRamenFlavors((grouped["Ramen"] || []).map((i) => i.name));
      setDynamicDrinks(getDrinkOptions(grouped).map((item) => item.name));
      const firstVisibleCat = Object.keys(grouped).find(
        (cat) => !HIDDEN_CATEGORIES.includes(cat)
      );
      setActiveCategory((prev) => {
        if (prev && grouped[prev]) return prev;
        return firstVisibleCat || prev;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCurrentBill();
  }, []);
  useEffect(() => {
    let socket;
    try {
      socket = ioClient(BASE_URL, { transports: ["websocket", "polling"] });
    } catch (err) {
      console.warn("Kiosk interrupt listener unavailable:", err);
      return;
    }
    const handleStopped = (payload) => {
      const activeResId = storage.getItem(SAVED_RES_ID);
      const activeTable = storage.getItem(SAVED_TABLE_ID) || setupTable || window.localStorage.getItem(FIXED_KIOSK_KEY);
      const stoppedId = payload?.reservationId;
      const stoppedTable = payload?.tableId;
      if (!stoppedId && !stoppedTable) return;
      if (stoppedId && (!activeResId || String(stoppedId) !== String(activeResId))) return;
      if (stoppedTable && (!activeTable || String(stoppedTable) !== String(activeTable))) return;
      playAlert();
      [
        TIMER_KEY,
        SAVED_TABLE_ID,
        SAVED_RES_ID,
        PAYMENT_CHOICE_KEY,
        TOTAL_PAID_KEY,
        LAST_REFILL_KEY
      ].forEach((k) => {
        storage.removeItem(k);
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
      setCart([]);
      setBillItems([]);
      setLocalBillHistory([]);
      showToast(
        "This kiosk session was stopped by staff. Please start over.",
        "error"
      );
      window.location.href = "/kiosk-selection";
    };
    socket.on("kiosk_stopped", handleStopped);
    return () => {
      socket.off("kiosk_stopped", handleStopped);
      socket.disconnect();
    };
  }, []);
  useEffect(() => {
    const fetchMode = async () => {
      if (!setupTable) return;
      try {
        const res = await axios.get(`${API_BASE}/reservations/active-kiosk`, {
          params: { tableId: setupTable }
        });
        if (res.data?.success) {
          setTableKioskMenuMode(res.data.kioskMode || "default");
        }
      } catch (err) {
        console.warn("Kiosk mode poll failed:", err?.message);
      }
    };
    fetchMode();
    const pollInterval = setInterval(fetchMode, 3e3);
    let socket;
    try {
      socket = ioClient(BASE_URL, { transports: ["websocket", "polling"] });
    } catch (err) {
      console.warn("Kiosk mode socket unavailable:", err);
      return () => clearInterval(pollInterval);
    }
    const handleMode = (payload) => {
      if (payload?.tableId != null && String(payload.tableId) === String(setupTable)) {
        setTableKioskMenuMode(payload.kiosk_mode || "default");
      }
    };
    socket.on("kiosk_mode_changed", handleMode);
    return () => {
      clearInterval(pollInterval);
      socket.off("kiosk_mode_changed", handleMode);
      socket.disconnect();
    };
  }, [setupTable]);
  useEffect(() => {
    if (!isUnlimitedMode) return;
    const packageCategories = getPackageCategories(
      menuData,
      kioskMenuMode,
      packageInclusions
    );
    const fallbackCategory = packageCategories.find((category) => category !== "Unlimited") || packageCategories[0] || "";
    setActiveCategory(
      (current) => packageCategories.includes(current) ? current : fallbackCategory
    );
  }, [isUnlimitedMode, kioskMenuMode, menuData]);
  useEffect(() => {
    if (!isUnlimitedMode) return;
    if (!browseFullMenu) {
      setCart(
        (current) => sanitizePackageCart(current, kioskMenuMode, packageInclusions)
      );
    }
    const allowedCategories = getPackageCategories(
      menuData,
      kioskMenuMode,
      packageInclusions
    );
    if (!browseFullMenu && activeCategory && !allowedCategories.includes(activeCategory)) {
      setActiveCategory(allowedCategories[0] || "");
    }
  }, [activeCategory, isUnlimitedMode, kioskMenuMode, menuData, browseFullMenu]);
  useEffect(() => {
    if (!unlimitedSessionLocked) return;
    window.history.pushState(null, "", window.location.href);
    const blockBack = () => {
      window.history.pushState(null, "", window.location.href);
      showToast(
        "Please finish your Unlimited session or ask staff for help.",
        "info"
      );
    };
    window.addEventListener("popstate", blockBack);
    return () => {
      window.removeEventListener("popstate", blockBack);
    };
  }, [unlimitedSessionLocked]);
  useEffect(() => {
    if (!unlimitedSessionLocked) return;
    const blockUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", blockUnload);
    return () => window.removeEventListener("beforeunload", blockUnload);
  }, [unlimitedSessionLocked]);
  useEffect(() => {
    fetchMenu();
    const interval = setInterval(fetchMenu, 1e4);
    const handleFocus = () => fetchMenu();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
  const handleItemClick = (item) => {
    console.log("Kiosk Item Clicked:", item);
    if (item && item.isStockAvailable === false) {
      showToast(`${item.name} is currently not available.`);
      return;
    }
    const packageItems = [
      ...billItems.length > 0 ? billItems : localBillHistory,
      ...cart
    ];
    const itemPackageMode = inferUnlimitedPackageMode(item);
    if (itemPackageMode) setIsPackageTimerExpired(false);
    if (isUnlimitedMode && getPackageQuantityLimit(
      packageItems,
      item,
      kioskMenuMode,
      packageInclusions
    ) < 1) {
      showToast("You have reached this package's selection limit.", "error");
      return;
    }
    const itemName = (item?.name || "").toLowerCase();
    if (itemPackageMode && isPackageCardForMode(item, itemPackageMode)) {
      const packageInclusionsForMode = getPackageInclusions(
        menuData,
        itemPackageMode
      );
      if (getPackageQuantityLimit(
        packageItems,
        item,
        itemPackageMode,
        packageInclusionsForMode
      ) < 1) {
        showToast("You have reached this package's selection limit.", "error");
        return;
      }
      const packageError = validatePackageCart(
        [...packageItems, { ...item, quantity: 1, customizations: null }],
        itemPackageMode,
        packageInclusionsForMode
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      setCart((current) => [
        ...current.filter((i) => !isPackageCardForMode(i, itemPackageMode)),
        { ...item, quantity: 1, customizations: null }
      ]);
      return;
    }
    if (isUnlimitedMode && isChickenCategory(getCategory(item))) {
      const cooldownRemaining = getRefillCooldownSeconds();
      if (cooldownRemaining > 0) {
        setRefillCooldownSeconds(cooldownRemaining);
        setCooldownMessage(
          `Refill is on cooldown. Please wait ${formatCooldownTime(cooldownRemaining)} before requesting another.`
        );
        return;
      }
      const refillItem = {
        ...item,
        price: 0,
        quantity: 1,
        customizations: `[REFILL] Flavors: ${item.name}`,
        is_refill: true
      };
      const packageError = validatePackageCart(
        [...packageItems, refillItem],
        kioskMenuMode,
        packageInclusions
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      setCart((current) => [...current, refillItem]);
      return;
    }
    if (activeCategory === "Chicken" && !isUnlimitedMode) {
      setSelectedItem({ ...item, price: 0 });
      setSelectedFlavors([]);
      setSelectedDrink("");
      setIsRefillMode(true);
      setShowFlavorModal(true);
    } else if (itemName.includes("ramen")) {
      setSelectedItem(item);
      setSelectedFlavors([]);
      setSelectedDrink("");
      setShowFlavorModal(true);
    } else if (isJuiceItem(item) || isDrinkCategoryName(item)) {
      setSelectedItem({ ...item, category: item.category || "Beverages" });
      setIsModalOpen(false);
      addDrinkDirect(item);
    } else {
      setSelectedItem({ ...item, category: item.category || "Regular" });
      setIsModalOpen(true);
    }
  };
  const isDrinkCategoryName = (item) => {
    const cat = String(item?.category || "").toLowerCase();
    return cat.includes("drink") || cat.includes("beverage");
  };
  const addDrinkDirect = (item) => {
    const packageItems = [
      ...billItems.length > 0 ? billItems : localBillHistory,
      ...cart
    ];
    const drinkItem = {
      ...item,
      quantity: 1,
      customizations: item.customizations || null
    };
    if (isUnlimitedMode) {
      const packageError = validatePackageCart(
        [...packageItems, drinkItem],
        kioskMenuMode,
        packageInclusions
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
    }
    setCart((current) => {
      const existingIdx = current.findIndex(
        (i) => i.id === drinkItem.id && i.customizations === drinkItem.customizations
      );
      if (existingIdx > -1) {
        const updated = [...current];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1
        };
        return updated;
      }
      return [...current, drinkItem];
    });
    showToast(`${item.name} added to tray.`, "success");
  };
  const confirmFlavors = async () => {
    const flavorLimit = flavorPackageMode === "unlimited_wings_a" ? Math.max(
      0,
      6 - getPackageChickenCount(
        [...billItems.length > 0 ? billItems : localBillHistory, ...cart],
        flavorPackageMode
      )
    ) : Infinity;
    if (selectedFlavors.length === 0) {
      setCooldownMessage("Please select at least one flavor.");
      return;
    }
    if (selectedFlavors.length > flavorLimit) {
      setCooldownMessage(`You can select a maximum of ${flavorLimit} flavors.`);
      return;
    }
    if (getUnlimitedPackage(flavorPackageMode) && !isRefillMode && !selectedDrink) {
      setCooldownMessage("Please select one included drink.");
      return;
    }
    const isRefill = parseFloat(selectedItem.price) === 0 || isRefillMode;
    const customization = `${isRefill ? "[REFILL] " : ""}Flavors: ${selectedFlavors.join(", ")}${selectedDrink ? " | Drink: " + selectedDrink : ""}`;
    const newItem = {
      ...selectedItem,
      quantity: 1,
      customizations: customization,
      price: isRefill ? 0 : selectedItem.price,
      is_refill: isRefill
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
                is_refill: true
              }
            ]
          },
          getAuthHeader()
        );
        sessionStorage.setItem(LAST_REFILL_KEY, Date.now().toString());
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
      const packageError = getUnlimitedPackage(flavorPackageMode) ? validatePackageCart(
        [
          ...billItems.length > 0 ? billItems : localBillHistory,
          ...cart,
          newItem
        ],
        flavorPackageMode,
        packageInclusions
      ) : null;
      if (packageError) {
        setCooldownMessage(packageError);
        return;
      }
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
  const handleBackToSelection = () => {
    if (unlimitedSessionLocked) {
      showToast(
        "You cannot exit during an Unlimited session. Please call staff.",
        "info"
      );
      return;
    }
    if (isUnlimitedMode || browseFullMenu) {
      setBrowseFullMenu(false);
      setTableKioskMenuMode("default");
      setActiveCategory("");
      return;
    }
    sessionStorage.setItem("kiosk_exit_to_selection", "true");
    navigate("/kiosk-selection");
  };
  const displayTable = storage.getItem(SAVED_TABLE_ID) || setupTable || window.localStorage.getItem(FIXED_KIOSK_KEY);
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "loading-container" }, "Loading Menu...");
  return /* @__PURE__ */ React.createElement("div", { className: "res-kiosk-container" }, /* @__PURE__ */ React.createElement("div", { className: "kiosk-timer-wrapper" }, /* @__PURE__ */ React.createElement("div", { className: "header-left-group" }, /* @__PURE__ */ React.createElement("div", { className: "header-id-section" }, /* @__PURE__ */ React.createElement("div", { className: "id-details" }, /* @__PURE__ */ React.createElement("span", { className: "id-label" }, "TABLE NUMBER:"), /* @__PURE__ */ React.createElement("span", { className: "id-value" }, displayTable === "takeout" ? "TAKE-OUT" : `TABLE ${displayTable || "?"}`)))), /* @__PURE__ */ React.createElement("div", { className: "header-center-group" }, isTimerRunning && /* @__PURE__ */ React.createElement("div", { className: "unlimited-timer-pill" }, /* @__PURE__ */ React.createElement("span", { className: "timer-tag" }, "Time:"), /* @__PURE__ */ React.createElement(
    "span",
    {
      className: `timer-digits ${timeLeft < 600 ? "urgent" : ""}`
    },
    formatTime(timeLeft)
  )), isUnlimitedMode && refillCooldownSeconds > 0 && /* @__PURE__ */ React.createElement(
    "span",
    {
      role: "status",
      style: { color: "#fff", fontSize: "12px", whiteSpace: "nowrap" }
    },
    "Refill in ",
    formatCooldownTime(refillCooldownSeconds)
  ), isUnlimitedMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "refill-action-btn",
      onClick: handleRefillClick,
      disabled: isLoading || refillCooldownSeconds > 0,
      style: {
        background: refillCooldownSeconds > 0 ? "#555" : "#ffcc00",
        color: refillCooldownSeconds > 0 ? "#aaa" : "#000",
        border: "none",
        padding: "10px 20px",
        borderRadius: "8px",
        fontWeight: "900",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        cursor: refillCooldownSeconds > 0 ? "not-allowed" : "pointer"
      }
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 18 }),
    " REFILL"
  ), isUnlimitedMode && hasPlacedUnlimitedOrder && /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "billing-btn-header",
      onClick: handleHeaderPayClick,
      disabled: isLoading
    },
    /* @__PURE__ */ React.createElement(CreditCard, { size: 18 }),
    " CHECKOUT"
  ))), /* @__PURE__ */ React.createElement("div", { className: "res-main-layout" }, /* @__PURE__ */ React.createElement("aside", { className: "res-sidebar" }, /* @__PURE__ */ React.createElement("div", { className: "res-brand" }, /* @__PURE__ */ React.createElement("h1", null, "HANGOUT"), /* @__PURE__ */ React.createElement("p", null, "Resto Bar")), /* @__PURE__ */ React.createElement("div", { className: "res-category-list" }, /* @__PURE__ */ React.createElement("div", { className: "res-cat-scroll-wrapper" }, Object.keys(menuData).filter(
    (cat) => isUnlimitedMode && !browseFullMenu ? getPackageCategories(
      menuData,
      kioskMenuMode,
      packageInclusions
    ).includes(cat) && cat !== "Unlimited" : !HIDDEN_CATEGORIES.includes(cat) && cat !== "Unlimited"
  ).map((cat) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: cat,
      className: `res-cat-btn ${activeCategory === cat ? "res-active" : ""}`,
      onClick: () => setActiveCategory(cat)
    },
    /* @__PURE__ */ React.createElement("div", { className: "res-cat-icon-placeholder" }, categoryIcons[cat] || /* @__PURE__ */ React.createElement(Star, { size: 20 })),
    /* @__PURE__ */ React.createElement("span", null, cat)
  ))))), /* @__PURE__ */ React.createElement("main", { className: "res-content-area" }, isUnlimitedMode && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "unlimited-package-summary",
      style: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px 16px",
        padding: "12px 16px",
        marginBottom: "12px",
        borderBottom: "1px solid rgba(255, 204, 0, 0.35)",
        color: "#fff"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 auto" } }, /* @__PURE__ */ React.createElement("strong", null, getUnlimitedPackage(kioskMenuMode)?.label), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "12px" } }, getUnlimitedPackage(kioskMenuMode)?.included))
  ), /* @__PURE__ */ React.createElement("div", { className: "res-grid-container" }, (() => {
    const items = menuData[activeCategory] || [];
    if (!isUnlimitedMode) return items;
    return getPackageItems(
      items,
      activeCategory,
      kioskMenuMode,
      packageInclusions
    );
  })().map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.id,
      className: `res-food-card ${item.isStockAvailable === false ? "res-food-card-unavailable" : ""}`,
      style: item.isStockAvailable === false ? {
        opacity: 0.45,
        filter: "grayscale(0.7)",
        cursor: "not-allowed"
      } : void 0,
      onClick: () => handleItemClick(item)
    },
    /* @__PURE__ */ React.createElement("div", { className: "res-card-image-container" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: item.image,
        alt: item.name,
        className: "res-food-img",
        onError: (e) => e.target.src = "/fallback-food.png"
      }
    )),
    /* @__PURE__ */ React.createElement("div", { className: "res-card-info" }, /* @__PURE__ */ React.createElement("h4", { className: "res-food-label" }, item.name), item.isStockAvailable === false && /* @__PURE__ */ React.createElement(
      "p",
      {
        style: {
          color: "#ff5c5c",
          fontWeight: "bold",
          margin: 0
        }
      },
      "NOT AVAILABLE"
    ))
  )))), /* @__PURE__ */ React.createElement(
    OrderSummary,
    {
      cart,
      packageLabel: getUnlimitedPackage(kioskMenuMode)?.label,
      onRemoveItem: (id) => setCart(cart.filter((i) => i.id !== id))
    }
  )), /* @__PURE__ */ React.createElement("footer", { className: "res-bottom-bar" }, !unlimitedSessionLocked && /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "res-btn-cancel",
      onClick: handleBackToSelection,
      style: {
        marginRight: "auto",
        background: "#444",
        display: "flex",
        alignItems: "center"
      }
    },
    /* @__PURE__ */ React.createElement(ArrowLeft, { size: 18, style: { marginRight: "8px" } }),
    " Back"
  ), /* @__PURE__ */ React.createElement("div", { className: "res-action-btns" }, !isUnlimitedMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "billing-btn-footer",
      onClick: () => storage.getItem(SAVED_RES_ID) ? handleHeaderPayClick() : setShowAllergyModal(true),
      disabled: isLoading || !storage.getItem(SAVED_RES_ID) && cart.length === 0
    },
    /* @__PURE__ */ React.createElement(CreditCard, { size: 18 }),
    storage.getItem(SAVED_RES_ID) ? parseFloat(calculateTotalDue(true)) <= 0 ? "VIEW RECEIPT" : "PAY BILL" : "CHECKOUT"
  ), /* @__PURE__ */ React.createElement("button", { className: "res-btn-cancel", onClick: () => setCart([]) }, "Clear Tray"), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "res-btn-view",
      disabled: isLoading || cart.length === 0,
      onClick: handlePlaceOrderClick
    },
    "Place Order (",
    cart.length,
    ")"
  ))), showAllergyModal && /* @__PURE__ */ React.createElement("div", { className: "res-modal-overlay", style: { zIndex: 7e3 } }, /* @__PURE__ */ React.createElement("div", { className: "res-modal-card", style: { maxWidth: "500px" } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
      }
    },
    /* @__PURE__ */ React.createElement(
      "h2",
      {
        style: {
          color: "#ffcc00",
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }
      },
      /* @__PURE__ */ React.createElement(AlertCircle, { size: 28 }),
      " Allergy Information"
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowAllergyModal(false),
        style: {
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer"
        }
      },
      /* @__PURE__ */ React.createElement(X, { size: 24 })
    )
  ), /* @__PURE__ */ React.createElement(
    "p",
    {
      style: {
        color: "#aaa",
        marginBottom: "15px",
        fontSize: "0.9rem"
      }
    },
    "Please let us know if you have any food allergies. This information will be shared with our kitchen staff."
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "allergy-input-group",
      style: { marginBottom: "25px" }
    },
    /* @__PURE__ */ React.createElement(
      "label",
      {
        style: {
          display: "block",
          color: "#ffcc00",
          marginBottom: "8px",
          fontWeight: "bold",
          fontSize: "0.85rem"
        }
      },
      "Allergies / Dietary Restrictions"
    ),
    /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: allergyNote,
        onChange: (e) => setAllergyNote(e.target.value),
        placeholder: "e.g., Peanuts, Shellfish, Dairy, Gluten, etc. (Leave as 'None' if no allergies)",
        rows: "3",
        style: {
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #333",
          background: "#1a1a1a",
          color: "#fff",
          fontSize: "0.9rem",
          resize: "vertical",
          fontFamily: "inherit"
        }
      }
    ),
    /* @__PURE__ */ React.createElement(
      "p",
      {
        style: { color: "#888", fontSize: "0.7rem", marginTop: "5px" }
      },
      'Default: "None" - Kitchen will be notified of any allergies you specify'
    )
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "15px" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "res-btn-cancel",
      onClick: () => setShowAllergyModal(false),
      style: { flex: 1 }
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "res-modal-btn-primary",
      onClick: () => {
        setShowAllergyModal(false);
        if (storage.getItem(SAVED_RES_ID)) {
          setPendingOrderDetails({
            tableId: storage.getItem(SAVED_TABLE_ID),
            mode: storage.getItem(SAVED_TABLE_ID) === "takeout" ? "Take-Out" : "Dine-In"
          });
          setIsFinalCheckout(false);
          setShowBillInfo(true);
        } else {
          const fixedTable = setupTable || window.localStorage.getItem(FIXED_KIOSK_KEY);
          if (fixedTable) {
            setPendingOrderDetails({
              tableId: fixedTable,
              mode: "Dine-In"
            });
            setIsFinalCheckout(false);
            setShowBillInfo(true);
          } else {
            setShowTypeModal(true);
          }
        }
      },
      style: { flex: 1 }
    },
    "Continue to Order"
  )))), showTypeModal && /* @__PURE__ */ React.createElement("div", { className: "res-modal-overlay", style: { zIndex: 6e3 } }, /* @__PURE__ */ React.createElement("div", { className: "res-modal-card" }, /* @__PURE__ */ React.createElement("h2", { style: { color: "#ffcc00", marginBottom: "20px" } }, "Order Mode"), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { display: "flex", flexDirection: "column", gap: "15px" }
    },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        onClick: () => {
          const fixed = window.localStorage.getItem(FIXED_KIOSK_KEY);
          if (fixed) {
            setPendingOrderDetails({ tableId: fixed, mode: "Dine-In" });
            setShowTypeModal(false);
            setIsFinalCheckout(false);
            setShowBillInfo(true);
          } else {
            axios.get(`${API_BASE}/admin/public/getTable`, getAuthHeader()).then((r) => setAvailableTables(r.data));
            setShowTypeModal(false);
            setShowTablePicker(true);
          }
        }
      },
      "DINE-IN"
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        style: { background: "#ffcc00", color: "#000" },
        onClick: () => {
          setPendingOrderDetails({
            tableId: "takeout",
            mode: "Take-Out"
          });
          setShowTypeModal(false);
          setIsFinalCheckout(false);
          setShowBillInfo(true);
        }
      },
      "TAKE-OUT"
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-btn-cancel",
        onClick: () => setShowTypeModal(false)
      },
      "Cancel"
    )
  ))), showTablePicker && /* @__PURE__ */ React.createElement("div", { className: "res-modal-overlay", style: { zIndex: 6500 } }, /* @__PURE__ */ React.createElement("div", { className: "res-modal-card", style: { maxWidth: "600px" } }, /* @__PURE__ */ React.createElement("h2", { style: { color: "#ffcc00" } }, "Select Your Table"), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "table-grid-kiosk",
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "15px",
        margin: "20px 0"
      }
    },
    availableTables.map((t) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: t.table_id,
        disabled: t.bridge_status === "seated",
        onClick: () => {
          setPendingOrderDetails({
            tableId: t.table_id,
            mode: "Dine-In"
          });
          setShowTablePicker(false);
          setIsFinalCheckout(false);
          setShowBillInfo(true);
        },
        style: {
          padding: "15px",
          borderRadius: "8px",
          border: "none",
          fontWeight: "bold",
          background: t.bridge_status === "seated" ? "#333" : "#ffcc00",
          color: t.bridge_status === "seated" ? "#777" : "#000"
        }
      },
      t.table_number
    ))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "res-btn-cancel",
      onClick: () => setShowTablePicker(false)
    },
    "Back"
  ))), showPaymentModal && /* @__PURE__ */ React.createElement("div", { className: "res-modal-overlay", style: { zIndex: 1e4 } }, /* @__PURE__ */ React.createElement("div", { className: "res-modal-card" }, /* @__PURE__ */ React.createElement(
    Receipt,
    {
      size: 50,
      color: "#ffcc00",
      style: { margin: "0 auto 15px" }
    }
  ), /* @__PURE__ */ React.createElement("h2", { style: { color: "#ffcc00" } }, "Payment Choice"), /* @__PURE__ */ React.createElement(
    "p",
    {
      style: { color: "#fff", fontSize: "1.4rem", fontWeight: "bold" }
    },
    "Amount to Pay:",
    " ",
    /* @__PURE__ */ React.createElement("span", { style: { color: "#ffcc00" } }, "\u20B1", calculateTotalDue())
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginTop: "20px"
      }
    },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        disabled: isLoading,
        onClick: () => confirmPaymentChoice("Pay Now")
      },
      /* @__PURE__ */ React.createElement("div", { className: "me-2" }),
      " PAY NOW (CASHIER)"
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        disabled: isLoading,
        style: { background: "#ffcc00" },
        onClick: () => confirmPaymentChoice("Pay Later")
      },
      /* @__PURE__ */ React.createElement("div", { className: "me-2" }),
      " ORDER NOW, PAY LATER"
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-btn-cancel",
        onClick: () => setShowPaymentModal(false)
      },
      "BACK"
    )
  ))), showBillInfo && /* @__PURE__ */ React.createElement("div", { className: "res-modal-overlay", style: { zIndex: 1e4 } }, /* @__PURE__ */ React.createElement("div", { className: "res-modal-card" }, /* @__PURE__ */ React.createElement(
    Receipt,
    {
      size: 50,
      color: "#ffcc00",
      style: { margin: "0 auto 15px" }
    }
  ), /* @__PURE__ */ React.createElement("h2", { style: { color: "#ffcc00" } }, isFinalCheckout ? "Bill Summary" : "Current Tray"), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "bill-scroll",
      style: {
        maxHeight: "200px",
        overflowY: "auto",
        margin: "20px 0"
      }
    },
    (isFinalCheckout ? billItems.length > 0 ? billItems : localBillHistory : cart).map((item, idx) => {
      const q = parseInt(item.quantity || item.qty || 1);
      let p = parseFloat(item.price);
      if (isNaN(p)) p = parseFloat(item.unit_price);
      if (isNaN(p) && item.item_price)
        p = parseFloat(item.item_price) / q;
      if (isNaN(p)) p = 0;
      const isRefill = item.is_refill === 1 || item.is_refill === true || item.customizations && item.customizations.toString().includes("[REFILL]");
      if (isRefill) {
        p = 0;
      }
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: idx,
          style: {
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 5px",
            color: "#fff",
            borderBottom: "1px solid #222"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { textAlign: "left", flex: 1 } }, /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              fontWeight: "bold",
              display: "block",
              color: "#ffffff"
            }
          },
          item.name || item.item_name || item.menu_name || "Ordered Item"
        ), /* @__PURE__ */ React.createElement("small", { style: { color: "#888" } }, isRefill ? "REFILL" : `\u20B1${p.toFixed(2)} x ${q}`)),
        /* @__PURE__ */ React.createElement("span", { style: { alignSelf: "center" } }, "\u20B1", (p * q).toFixed(2))
      );
    })
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "1.4rem",
        fontWeight: "bold",
        color: "#fff",
        marginBottom: "20px"
      }
    },
    /* @__PURE__ */ React.createElement("span", null, "Total Due:"),
    /* @__PURE__ */ React.createElement("span", { style: { color: "#ffcc00" } }, "\u20B1", calculateTotalDue(isFinalCheckout))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginTop: "20px"
      }
    },
    !isFinalCheckout ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        onClick: () => confirmPaymentChoice("Pay Now"),
        disabled: isLoading
      },
      "PAY NOW (CASHIER)"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        style: { background: "#ffcc00" },
        onClick: () => confirmPaymentChoice("Pay Later"),
        disabled: isLoading
      },
      "ORDER NOW, PAY LATER"
    )) : parseFloat(calculateTotalDue(isFinalCheckout)) > 0 ? /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        onClick: async () => {
          const totalBill = calculateSessionTotal(isFinalCheckout);
          setIsLoading(true);
          try {
            await syncWithDashboard(
              storage.getItem(SAVED_RES_ID),
              totalBill,
              "Cash",
              "verified"
            );
            storage.setItem(TOTAL_PAID_KEY, totalBill.toString());
            setLocalTotalPaid(totalBill);
            setIsLoading(false);
            fetchCurrentBill();
            setShowBillInfo(false);
          } catch (err) {
            showToast("Payment processing failed.");
            setIsLoading(false);
          }
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "me-2" }),
      " PAY NOW"
    ) : /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        style: { background: "#28a745" },
        onClick: handleEndSession
      },
      "FINISH"
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-btn-cancel",
        onClick: () => setShowBillInfo(false)
      },
      !isFinalCheckout ? "BACK" : parseFloat(calculateTotalDue(isFinalCheckout)) > 0 ? "PAY LATER" : "Close"
    )
  ))), showFlavorModal && /* @__PURE__ */ React.createElement("div", { className: "res-modal-overlay", style: { zIndex: 9e3 } }, /* @__PURE__ */ React.createElement("div", { className: "res-modal-card flavor-modal-wide" }, /* @__PURE__ */ React.createElement("h2", { className: "modal-title-yellow" }, "Customize Your Order"), getUnlimitedPackage(flavorPackageMode) && /* @__PURE__ */ React.createElement("p", { className: "section-label" }, getUnlimitedPackage(flavorPackageMode).label, ": ", getUnlimitedPackage(flavorPackageMode).included), /* @__PURE__ */ React.createElement("div", { className: "customization-scroll-area" }, /* @__PURE__ */ React.createElement("section", { className: "modal-section" }, /* @__PURE__ */ React.createElement("h3", { className: "section-label" }, flavorPackageMode === "unlimited_wings_a" ? "Select Chicken Flavors (Up to 6)" : getUnlimitedPackage(flavorPackageMode) ? "Select Wing Flavors" : "Select Flavors"), /* @__PURE__ */ React.createElement("div", { className: "flavor-grid" }, (selectedItem?.name.toLowerCase().includes("ramen") ? dynamicRamenFlavors : dynamicFlavors).filter(
    (flavor) => !getUnlimitedPackage(flavorPackageMode) || flavorPackageMode === "unlimited_wings_a" || /wing/i.test(flavor)
  ).map((f) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: f,
      onClick: () => setSelectedFlavors((prev) => {
        if (prev.includes(f)) {
          return prev.filter((x) => x !== f);
        }
        const flavorLimit = flavorPackageMode === "unlimited_wings_a" ? Math.max(
          0,
          6 - getPackageChickenCount(
            [
              ...billItems.length > 0 ? billItems : localBillHistory,
              ...cart
            ],
            flavorPackageMode
          )
        ) : Infinity;
        if (prev.length >= flavorLimit) {
          setCooldownMessage(
            `You can select a maximum of ${flavorLimit} flavors.`
          );
          return prev;
        }
        return [...prev, f];
      }),
      className: `flavor-btn ${selectedFlavors.includes(f) ? "active" : ""}`
    },
    f
  )))), /* @__PURE__ */ React.createElement("section", { className: "modal-section" }, /* @__PURE__ */ React.createElement("h3", { className: "section-label" }, "Select Drink (Choose One)"), /* @__PURE__ */ React.createElement("div", { className: "drink-grid" }, dynamicDrinks.filter(
    (drink) => flavorPackageMode === "unlimited_wings_a" || !getUnlimitedPackage(flavorPackageMode) || isJuiceItem({ name: drink, category: "Drinks" })
  ).map((drink) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: drink,
      onClick: () => setSelectedDrink(drink),
      className: `flavor-btn ${selectedDrink === drink ? "active-drink" : ""}`
    },
    drink
  ))))), /* @__PURE__ */ React.createElement("div", { className: "modal-footer-actions" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "res-btn-cancel-ui",
      onClick: () => {
        setShowFlavorModal(false);
        setIsRefillMode(false);
      }
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement("button", { className: "res-btn-confirm-ui", onClick: confirmFlavors }, isRefillMode ? "Order Refill" : "Add to Tray")))), cooldownMessage && /* @__PURE__ */ React.createElement("div", { className: "res-modal-overlay", style: { zIndex: 12e3 } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "res-modal-card",
      style: { maxWidth: "400px", textAlign: "center" }
    },
    /* @__PURE__ */ React.createElement(
      AlertCircle,
      {
        size: 50,
        color: "#ffcc00",
        style: { margin: "0 auto 15px" }
      }
    ),
    /* @__PURE__ */ React.createElement("h3", { style: { color: "#ffcc00" } }, cooldownMessage.toLowerCase().includes("cooldown") ? "Refill Cooldown" : "Notice"),
    /* @__PURE__ */ React.createElement("p", { style: { color: "#fff", margin: "15px 0" } }, cooldownMessage),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "res-modal-btn-primary",
        onClick: () => setCooldownMessage(null)
      },
      "OK"
    )
  )), isLoading && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "res-modal-overlay",
      style: { zIndex: 11e3, background: "rgba(0, 0, 0, 0.8)" }
    },
    /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement(RefreshCw, { className: "spinner-loader", color: "#ffcc00", size: 60 }), /* @__PURE__ */ React.createElement("p", { style: { color: "#fff", marginTop: "15px", fontWeight: "bold" } }, "Processing Order..."))
  ), /* @__PURE__ */ React.createElement(
    ReservationOrderModal,
    {
      isOpen: isModalOpen,
      onClose: () => setIsModalOpen(false),
      item: selectedItem,
      onAdd: (newItem) => {
        setCart((prevCart) => {
          const existingIdx = prevCart.findIndex(
            (i) => i.id === newItem.id && i.customizations === newItem.customizations
          );
          let nextCart;
          if (existingIdx > -1) {
            const updated = [...prevCart];
            updated[existingIdx] = {
              ...updated[existingIdx],
              quantity: updated[existingIdx].quantity + (newItem.quantity || 1)
            };
            nextCart = updated;
          } else {
            nextCart = [
              ...prevCart,
              {
                ...newItem,
                category: newItem.category || selectedItem?.category,
                quantity: newItem.quantity || 1
              }
            ];
          }
          if (!isUnlimitedMode) return nextCart;
          const packageError = validatePackageCart(
            [
              ...billItems.length > 0 ? billItems : localBillHistory,
              ...nextCart
            ],
            kioskMenuMode,
            packageInclusions
          );
          if (packageError) {
            showToast(packageError, "error");
            return prevCart;
          }
          const validated = sanitizePackageCart(
            nextCart,
            kioskMenuMode,
            packageInclusions
          );
          if (validated.length !== nextCart.length || validated.some((item, index) => item.quantity !== nextCart[index]?.quantity)) {
            showToast("That item exceeds the selected package limits.", "error");
          }
          return validated;
        });
      },
      allProducts: isUnlimitedMode ? getPackageMenuData(menuData, kioskMenuMode, packageInclusions) : menuData,
      flavorLimit: isUnlimitedMode ? kioskMenuMode === "unlimited_wings_a" ? Math.max(
        0,
        6 - getPackageChickenCount(
          [
            ...billItems.length > 0 ? billItems : localBillHistory,
            ...cart
          ],
          kioskMenuMode
        )
      ) : Infinity : 4,
      quantityLimit: isUnlimitedMode ? getPackageQuantityLimit(
        [
          ...billItems.length > 0 ? billItems : localBillHistory,
          ...cart
        ],
        selectedItem,
        kioskMenuMode,
        packageInclusions
      ) : 20
    }
  ));
};
export default KioskMenu;

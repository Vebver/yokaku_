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
  X,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import OfflineMenuImage from "./OfflineMenuImage";
import axios from "axios";
import { io as ioClient } from "socket.io-client";
import alertMusicFile from "../../assets/alert-sound.mp3";
import { useToast } from "../ToastContext";
import refillCooldown from "../../../../shared/refillCooldown.json";
import { API_BASE, SERVER_URL as BASE_URL } from "../../api";
import {
  getQueuedOrderItemsForReservation,
  submitKioskOrder,
} from "../../utils/offlineOrderQueue";
import {
  isKioskCategoryVisible,
  parseKioskVisibleCategoryIds,
} from "../../utils/kioskCategoryVisibility";
import {
  getPackageCategories,
  getDrinkOptions,
  getPackageInclusions,
  getPackageInclusionSummary,
  getUnlimitedPackageRefillItems,
  getPackageItems,
  getPackageMenuData,
  getPackageChickenCount,
  getPackageQuantityLimit,
  getCategory,
  getUnlimitedPackage,
  inferUnlimitedPackageMode,
  isJuiceItem,
  isChickenCategory,
  isUnlimitedPackageItem,
  isSetItem,
  isPackageCardForMode,
  hasUnlimitedFlavorSelection,
  sanitizePackageCart,
  validatePackageCart,
} from "./unlimitedPackageRules";

const DURATION = 1.5 * 60 * 60 * 1000; // 1:30 Hours in milliseconds

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
  [TIMER_KEY, SAVED_TABLE_ID, SAVED_RES_ID, PAYMENT_CHOICE_KEY, TOTAL_PAID_KEY, LAST_REFILL_KEY].forEach((key) => {
    if (!storage.getItem(key) && localStorage.getItem(key)) {
      storage.setItem(key, localStorage.getItem(key));
    }
  });
  const persistKioskValue = (key, value) => {
    storage.setItem(key, value);
    localStorage.setItem(key, value);
  };
  const removeKioskValue = (key) => {
    storage.removeItem(key);
    localStorage.removeItem(key);
  };

  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPackageTimerExpired, setIsPackageTimerExpired] = useState(false);
  const [isKioskModeResetPending, setIsKioskModeResetPending] = useState(false);

  // Extract physical table configuration from URL
  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const setupTable = queryParams.get("setupTable");

  const [menuData, setMenuData] = useState({});
  const [visibleCategoryIds, setVisibleCategoryIds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [tableKioskMenuMode, setTableKioskMenuMode] = useState("default");
  const isCategoryVisible = (categoryName) =>
    isKioskCategoryVisible(categoryName, menuData, visibleCategoryIds);

  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [localBillHistory, setLocalBillHistory] = useState(() =>
    getQueuedOrderItemsForReservation(storage.getItem(SAVED_RES_ID)),
  );
  const [isPaid, setIsPaid] = useState(
    storage.getItem(PAYMENT_CHOICE_KEY) === "verified",
  );

  const [localTotalPaid, setLocalTotalPaid] = useState(
    parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0),
  );

  const hasOrderedUnlimited = [...billItems, ...cart].some(
    isUnlimitedPackageItem,
  );
  // An Unlimited order counts as "placed" only once it exists in the bill
  // (server-synced) or local bill history — not while it's still sitting in
  // the cart. The back-button lock engages only after that point.
  const placedOrderItems = [...billItems, ...localBillHistory];
  const hasPlacedOrder = placedOrderItems.length > 0;
  const hasPlacedUnlimitedOrder = placedOrderItems.some(
    isUnlimitedPackageItem,
  );
  const hasPlacedUnlimitedFlavorOrder =
    hasUnlimitedFlavorSelection(placedOrderItems);
  const hasPendingUnlimitedPackage = cart.some(
    (item) => !item.is_placed && Boolean(inferUnlimitedPackageMode(item)),
  );
  const orderedPackageMode = [...billItems, ...localBillHistory, ...cart]
    .map(inferUnlimitedPackageMode)
    .find(Boolean);
  const activePackageItem =
    cart.find((item) => inferUnlimitedPackageMode(item)) ||
    placedOrderItems.find((item) => inferUnlimitedPackageMode(item));
  const kioskMenuMode = isPackageTimerExpired
    ? "default"
    : getUnlimitedPackage(tableKioskMenuMode)
    ? tableKioskMenuMode
    : orderedPackageMode || tableKioskMenuMode;
  const isUnlimitedMode = Boolean(getUnlimitedPackage(kioskMenuMode));
  const unlimitedSessionLocked = isUnlimitedMode && hasPlacedUnlimitedOrder;
  const packageInclusions = getPackageInclusions(
    menuData,
    kioskMenuMode,
    activePackageItem,
  );
  const activeSetItem = [...billItems, ...localBillHistory, ...cart].find(
    isSetItem,
  );
  const setInclusions = activeSetItem
    ? getPackageInclusions(menuData, "set", activeSetItem).map(
        (inclusion) => ({
          ...inclusion,
          is_unlimited: false,
          quantity_limit: Math.max(1, Number(inclusion.quantity_limit) || 1),
        }),
      )
    : [];
  const isSetMode =
    !isUnlimitedMode && Boolean(activeSetItem) && setInclusions.length > 0;
  const visiblePackageMode = isSetMode ? "set" : kioskMenuMode;
  const visiblePackageInclusions = isSetMode
    ? setInclusions
    : packageInclusions;
  useEffect(() => {
    if (!isSetMode) return;
    const categories = getPackageCategories(
      menuData,
      "set",
      setInclusions,
    ).filter(isCategoryVisible);
    if (!categories.includes(activeCategory)) {
      setActiveCategory(categories[0] || "");
    }
  }, [
    activeCategory,
    isSetMode,
    menuData,
    setInclusions,
    visibleCategoryIds,
  ]);
  const activePackageLabel =
    (isSetMode ? activeSetItem : activePackageItem)?.name ||
    (isSetMode ? activeSetItem : activePackageItem)?.menu_name ||
    (isSetMode ? activeSetItem : activePackageItem)?.item_name ||
    getUnlimitedPackage(kioskMenuMode)?.label;
  const activePackageSummary =
    getPackageInclusionSummary(menuData, visiblePackageInclusions) ||
    getUnlimitedPackage(kioskMenuMode)?.included;
  const refillTargets =
    packageInclusions.length > 0
      ? getUnlimitedPackageRefillItems(menuData, packageInclusions).filter(
          (item) => item.isStockAvailable !== false,
        )
      : (menuData["Chicken"] || []).filter(
          (item) => item.isStockAvailable !== false,
        );
  const canRefillUnlimited =
    packageInclusions.length > 0
      ? refillTargets.length > 0
      : hasPlacedUnlimitedFlavorOrder;
  const hasRefillInTray = cart.some(
    (item) =>
      item.is_refill === true ||
      (item.customizations || "").toString().includes("[REFILL]"),
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
  const [cookingInstructions, setCookingInstructions] = useState("");

  const [isFinalCheckout, setIsFinalCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const flavorPackageMode =
    inferUnlimitedPackageMode(selectedItem) || kioskMenuMode;
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
  const [refillCooldownSeconds, setRefillCooldownSeconds] = useState(0);
  const [cooldownMessage, setCooldownMessage] = useState(null);
  // Lets the customer browse the full menu before placing the package order
  // without losing their current package selections.
  const [browseFullMenu, setBrowseFullMenu] = useState(false);

  const resetMenuSelections = () => {
    setSelectedItem(null);
    setSelectedFlavors([]);
    setSelectedDrink("");
    setShowFlavorModal(false);
    setIsModalOpen(false);
    setIsRefillMode(false);
    setCooldownMessage(null);
  };

  const clearTray = () => {
    setCart([]);
    resetMenuSelections();
    setShowBillInfo(false);
    setIsFinalCheckout(false);
    if (hasPendingUnlimitedPackage) {
      setTableKioskMenuMode("default");
      setActiveCategory(
        Object.keys(menuData).find(
          (category) => isCategoryVisible(category),
        ) || "",
      );
    }
  };

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
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
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

  const getRefillCooldownSeconds = () => {
    const lastRefill = Number(storage.getItem(LAST_REFILL_KEY));
    if (!Number.isFinite(lastRefill) || lastRefill <= 0) return 0;
    return Math.max(
      0,
      Math.ceil(
        (refillCooldown.milliseconds - (Date.now() - lastRefill)) / 1000,
      ),
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

      const isRefill =
        item.is_refill === 1 ||
        item.is_refill === true ||
        (item.customizations &&
          item.customizations.toString().includes("[REFILL]"));
      const isPackageIncluded = (item.customizations || "")
        .toString()
        .includes("[PACKAGE INCLUDED]");
      if (isRefill || isPackageIncluded) {
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
      window.localStorage.setItem(FIXED_KIOSK_KEY, setupTable);
      console.log(`Kiosk locked to Table ID: ${setupTable}`);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCategoryVisibility = () =>
      axios
        .get(`${API_BASE}/settings`)
        .then(({ data }) => {
          const visibleIds = parseKioskVisibleCategoryIds(
            data.kiosk_visible_categories,
          );
          if (!cancelled) setVisibleCategoryIds(visibleIds);
        })
        .catch((error) => {
          console.error("Could not load kiosk category visibility:", error);
        });
    loadCategoryVisibility();
    const interval = setInterval(loadCategoryVisibility, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const firstVisibleCategory = Object.keys(menuData).find((category) =>
      isCategoryVisible(category),
    );
    if (!isCategoryVisible(activeCategory)) {
      setActiveCategory(firstVisibleCategory || "");
    }
  }, [activeCategory, menuData, visibleCategoryIds]);

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
      LAST_REFILL_KEY,
      `kiosk_bill_cache_${activeResId}`,
      "kiosk_last_refill_timestamp",
    ].forEach((k) => {
      storage.removeItem(k);
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });

    clearTray();
    setBillItems([]);
    setLocalBillHistory([]);

    sessionStorage.setItem("kiosk_exit_to_selection", "true");
    window.location.href = "/kiosk-selection";
  };

  useEffect(() => {
    const syncTimer = () => {
      const savedEnd = sessionStorage.getItem(TIMER_KEY) || localStorage.getItem(TIMER_KEY);
      if (!savedEnd) {
        setIsTimerRunning(false);
        return;
      }

      const remaining = Math.max(
        0,
        Math.floor((parseInt(savedEnd) - Date.now()) / 1000),
      );

      if (remaining > 0) {
        sessionStorage.setItem(TIMER_KEY, savedEnd);
        setTimeLeft(remaining);
        setIsTimerRunning(true);
      } else {
        setTimeLeft(0);
        setIsTimerRunning(false);
        sessionStorage.removeItem(TIMER_KEY);
        localStorage.removeItem(TIMER_KEY);
        wasWingsTimerRunning.current = false;
        setTableKioskMenuMode("default");
        setIsPackageTimerExpired(true);
        setIsKioskModeResetPending(setupTable != null);
        setActiveCategory((prev) => (prev === "Unlimited" ? "" : prev));
        showToast(
          "Unlimited Wings time is up. You can keep ordering from the full menu.",
          "info",
        );
      }
    };

    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isKioskModeResetPending) return;
    if (setupTable == null) {
      setIsKioskModeResetPending(false);
      return;
    }

    let isActive = true;
    let isRequestInFlight = false;
    const persistKioskModeReset = async () => {
      if (isRequestInFlight) return;
      isRequestInFlight = true;
      try {
        await axios.post(
          `${API_BASE}/admin/kiosk-mode-expired/${setupTable}`,
          {},
          { ...getAuthHeader(), timeout: 5000 },
        );
        if (isActive) {
          setIsKioskModeResetPending(false);
          setTableKioskMenuMode("default");
        }
      } catch (err) {
        console.warn("Could not persist kiosk mode reset; retrying:", err?.message);
      } finally {
        isRequestInFlight = false;
      }
    };

    persistKioskModeReset();
    const interval = setInterval(persistKioskModeReset, 5000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [isKioskModeResetPending, setupTable]);

  useEffect(() => {
    const syncRefillCooldown = () => {
      setRefillCooldownSeconds(getRefillCooldownSeconds());
    };

    syncRefillCooldown();
    const interval = setInterval(syncRefillCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  // If the customer somehow lands on the Unlimited category after ordering,
  // bounce them out so they can't loop back into the chicken-flavor flow.
  useEffect(() => {
    if (activeCategory === "Unlimited" && hasOrderedUnlimited) {
      const fallbackCategory = Object.keys(menuData).find(
        (cat) => isCategoryVisible(cat) && cat !== "Unlimited",
      );
      if (fallbackCategory) {
        setActiveCategory(fallbackCategory);
      }
    } else if (activeCategory === "Unlimited" && isUnlimitedMode) {
      const packageCategory = getPackageCategories(
        menuData,
        kioskMenuMode,
        packageInclusions,
      )[0];
      setActiveCategory(packageCategory || "");
    }
  }, [
    activeCategory,
    hasOrderedUnlimited,
    isUnlimitedMode,
    kioskMenuMode,
    menuData,
    packageInclusions,
  ]);

  // When the walk-in Unlimited Wings timer hits 0

  // When the walk-in Unlimited Wings timer hits 0, revert to Full Menu
  // and tell the backend so the DB matches (survives page reload).
  const wasWingsTimerRunning = useRef(false);

  useEffect(() => {
    // Reset the flag when we're not in Unlimited mode
    if (!isUnlimitedMode) {
      wasWingsTimerRunning.current = false;
      return;
    }

    // Remember the timer actually ran
    if (isTimerRunning) {
      wasWingsTimerRunning.current = true;
      return;
    }

    // Timer was running and just hit 0 — do the revert
    if (wasWingsTimerRunning.current && timeLeft <= 0) {
      wasWingsTimerRunning.current = false;

      sessionStorage.removeItem(TIMER_KEY);
      localStorage.removeItem(TIMER_KEY);
      setTableKioskMenuMode("default");
      setIsPackageTimerExpired(true);
      setIsKioskModeResetPending(setupTable != null);
      setActiveCategory((prev) => (prev === "Unlimited" ? "" : prev));
      showToast(
        "Unlimited Wings time is up. You can keep ordering from the full menu.",
        "info",
      );

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
        getAuthHeader(),
      );
      setBillItems(res.data || []);
      localStorage.setItem(`kiosk_bill_cache_${resId}`, JSON.stringify(res.data || []));
      const pendingKeys = new Set(
        getQueuedOrderItemsForReservation(resId).map((item) => item.local_queue_key),
      );
      setLocalBillHistory((items) =>
        items.filter(
          (item) => !item.local_queue_key || pendingKeys.has(item.local_queue_key),
        ),
      );
      return res.data;
    } catch (err) {
      console.warn("Could not fetch billing items:", err.message);
      try {
        const cachedItems = JSON.parse(
          localStorage.getItem(`kiosk_bill_cache_${resId}`) || "[]",
        );
        setBillItems(cachedItems);
        return cachedItems;
      } catch {
        return [];
      }
    }
  };

  useEffect(() => {
    const handleOffline = () =>
      showToast("Internet connection lost. Your kiosk timer will continue.", "info");
    const handleOnline = () => {
      showToast("Internet connection restored. Kiosk data is syncing.", "success");
      fetchCurrentBill();
      fetchMenu();
    };
    const handleOrderSynced = (event) => {
      const { idempotencyKey, payload } = event.detail || {};
      if (payload?.reservation_id !== storage.getItem(SAVED_RES_ID)) return;
      setLocalBillHistory((items) =>
        items.filter((item) => item.local_queue_key !== idempotencyKey),
      );
      fetchCurrentBill();
      showToast("Your offline order has synced.", "success");
    };
    const handleOrderSyncFailed = (event) => {
      if (event.detail?.payload?.reservation_id !== storage.getItem(SAVED_RES_ID)) return;
      showToast(
        `An offline order needs staff attention: ${event.detail.error}`,
        "error",
      );
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("kiosk-order-synced", handleOrderSynced);
    window.addEventListener("kiosk-order-sync-failed", handleOrderSyncFailed);
    if (!navigator.onLine) handleOffline();
    const savedOrders = getQueuedOrderItemsForReservation(storage.getItem(SAVED_RES_ID));
    if (savedOrders.some((item) => item.sync_error)) {
      showToast("A saved offline order needs staff attention.", "error");
    } else if (savedOrders.length > 0) {
      showToast(`${savedOrders.length} offline order item(s) are waiting to sync.`, "info");
    }
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("kiosk-order-synced", handleOrderSynced);
      window.removeEventListener("kiosk-order-sync-failed", handleOrderSyncFailed);
    };
  }, []);

  const confirmPaymentChoice = async (choice) => {
    if (isLoading) return;
    const itemsToSubmit = [...cart];
    if (itemsToSubmit.length === 0) return;
    const existingOrderItems = billItems.length > 0 ? billItems : localBillHistory;
    const hasRefillOrder = itemsToSubmit.some(
      (item) =>
        item.is_refill === true ||
        (item.customizations || "").toString().includes("[REFILL]"),
    );
    const cooldownRemaining = hasRefillOrder
      ? getRefillCooldownSeconds()
      : 0;
    if (cooldownRemaining > 0) {
      setRefillCooldownSeconds(cooldownRemaining);
      setCooldownMessage(
        `Refill is on cooldown. Please wait ${formatCooldownTime(cooldownRemaining)} before requesting another.`,
      );
      return;
    }
    const packageError = validatePackageCart(
      [...existingOrderItems, ...itemsToSubmit],
      visiblePackageMode,
      visiblePackageInclusions,
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

    const hasUnlimited = itemsToSubmit.some((i) =>
      (i?.name || i?.item_name || "").toLowerCase().includes("unlimited"),
    );
    const assignedTableId = [
      tableId,
      setupTable,
      storage.getItem(SAVED_TABLE_ID),
      localStorage.getItem(FIXED_KIOSK_KEY),
      localStorage.getItem("tableId"),
    ].find(
      (candidate) =>
        candidate != null && String(candidate).toLowerCase() !== "takeout",
    );
    const rawTableId = mode === "Take-Out" ? "takeout" : assignedTableId;
    const parsedTableId = Number.parseInt(rawTableId, 10);
    const finalTableId = Number.isInteger(parsedTableId) ? parsedTableId : null;

    try {
      const orderPayload = {
        reservation_id: dynamicResId,
        table_id: finalTableId,
        items: itemsToSubmit.map((i) => {
          const cookingNote = cookingInstructions.trim();
          const itemCustomizations = cookingNote
            ? {
                ...(i.customizations &&
                typeof i.customizations === "object" &&
                !Array.isArray(i.customizations)
                  ? i.customizations
                  : i.customizations
                    ? {
                        "Order options": Array.isArray(i.customizations)
                          ? i.customizations.join(" | ")
                          : String(i.customizations),
                      }
                    : {}),
                "Cooking instructions": cookingNote,
              }
            : i.customizations;
          return {
            item_id: i.id,
            quantity: i.quantity,
            customizations:
              mode === "Take-Out"
                ? cookingNote
                  ? { ...itemCustomizations, "Order type": "TAKE-OUT" }
                  : `[TAKE-OUT] ${i.customizations || ""}`
                : itemCustomizations,
            is_refill: Boolean(i.is_refill),
            is_package_included: Boolean(i.is_package_included),
            is_set_included: Boolean(i.is_set_included),
          };
        }),
        allergy_note: allergyNote !== "None" ? allergyNote : null,
      };
      const submission = await submitKioskOrder(orderPayload, getAuthHeader());

      if (submission.queued) {
        const tableValue = mode === "Take-Out" ? "takeout" : finalTableId;
        storage.setItem(SAVED_TABLE_ID, String(tableValue));
        storage.setItem(SAVED_RES_ID, dynamicResId);
        localStorage.setItem(SAVED_TABLE_ID, String(tableValue));
        localStorage.setItem(SAVED_RES_ID, dynamicResId);
        setLocalBillHistory((previous) => [
          ...previous,
          ...itemsToSubmit.map((item) => ({
            ...item,
            is_placed: true,
            local_queue_key: submission.idempotencyKey,
          })),
        ]);
        setCart([]);
        resetMenuSelections();
        if (hasRefillOrder) {
          persistKioskValue(LAST_REFILL_KEY, Date.now().toString());
          setRefillCooldownSeconds(refillCooldown.milliseconds / 1000);
        }
        if (hasUnlimited && !storage.getItem(TIMER_KEY)) {
          const endTime = Date.now() + DURATION;
          sessionStorage.setItem(TIMER_KEY, endTime.toString());
          localStorage.setItem(TIMER_KEY, endTime.toString());
          setIsTimerRunning(true);
          setTimeLeft(DURATION / 1000);
        }
        setIsPaid(false);
        setShowPaymentModal(false);
        setShowBillInfo(false);
        setIsFinalCheckout(false);
        showToast(
          "Order saved on this kiosk. It will sync when internet returns; payment was not processed.",
          "info",
        );
        return;
      }

      if (hasRefillOrder) {
        persistKioskValue(LAST_REFILL_KEY, Date.now().toString());
        setRefillCooldownSeconds(refillCooldown.milliseconds / 1000);
      }

      // Queue state updates for the background UI
      setLocalBillHistory((prev) => [...prev, ...itemsToSubmit]);
      setCart([]);
      resetMenuSelections();
      // Preserve the actual assigned table; only record "takeout" when the
      // customer explicitly chose Take-Out mode.
      const effectiveTableId =
        mode === "Take-Out"
          ? "takeout"
          : finalTableId ??
            storage.getItem(SAVED_TABLE_ID) ??
            setupTable ??
            localStorage.getItem(FIXED_KIOSK_KEY) ??
            currentTableId;
      storage.setItem(SAVED_TABLE_ID, String(effectiveTableId));
      storage.setItem(SAVED_RES_ID, dynamicResId);
      localStorage.setItem(SAVED_TABLE_ID, String(effectiveTableId));
      localStorage.setItem(SAVED_RES_ID, dynamicResId);

      if (hasUnlimited && !sessionStorage.getItem(TIMER_KEY)) {
        const endTime = Date.now() + DURATION;
        sessionStorage.setItem(TIMER_KEY, endTime.toString());
        localStorage.setItem(TIMER_KEY, endTime.toString());
        setIsTimerRunning(true);
        setTimeLeft(DURATION / 1000);
      }

      if (isPayNow) {
        // --- SYNCHRONOUS CALCULATION (Prevents React State Lag) ---
        const currentHistory =
          billItems.length > 0 ? billItems : localBillHistory;
        const combinedSessionItems = [...currentHistory, ...itemsToSubmit];

        const computedSessionTotal = combinedSessionItems.reduce(
          (sum, item) => {
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
            if (isRefill) p = 0;

            return sum + p * q;
          },
          0,
        );

        // Submit the cumulative total paid to sync precisely with the backend overwrite behavior
        await syncWithDashboard(
          dynamicResId,
          computedSessionTotal,
          "Cash",
          "verified",
        );

        persistKioskValue(TOTAL_PAID_KEY, computedSessionTotal.toString());
        setLocalTotalPaid(computedSessionTotal);

        persistKioskValue(PAYMENT_CHOICE_KEY, "verified");
        setIsPaid(true);
        showToast("Your order has been placed. Thank you!", "success");
      } else {
        setIsPaid(false);
        removeKioskValue(PAYMENT_CHOICE_KEY);
        showToast("Your order has been placed. Thank you!", "success");
      }

      await fetchCurrentBill();

      // Close every checkout/payment overlay so the customer is not left
      // staring at the Pay Now / Pay Later card after ordering.
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
          persistKioskValue(
            LAST_REFILL_KEY,
            String(
              Date.now() -
                (refillCooldown.milliseconds - remainingSeconds * 1000),
            ),
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

  // Place one admin-configured refill directly from the footer action.
  const handleRefillClick = async () => {
    if (!hasPlacedUnlimitedOrder || !canRefillUnlimited) return;
    const cooldownRemaining = getRefillCooldownSeconds();
    if (cooldownRemaining > 0) {
      setRefillCooldownSeconds(cooldownRemaining);
      setCooldownMessage(
        `Refill is on cooldown. Please wait ${formatCooldownTime(cooldownRemaining)} before requesting another.`,
      );
      return;
    }
    const refillTarget = refillTargets[0];
    if (!refillTarget) {
      showToast("No included items are available for refill.", "error");
      return;
    }
    const packageItems = [
      ...(billItems.length > 0 ? billItems : localBillHistory),
      ...cart,
    ];
    const refillItem = {
      ...refillTarget,
      price: 0,
      quantity: 1,
      customizations: `[REFILL] ${refillTarget.name}`,
      is_refill: true,
    };
    const packageError = validatePackageCart(
      [...packageItems, refillItem],
      kioskMenuMode,
      packageInclusions,
    );
    if (packageError) {
      showToast(packageError, "error");
      return;
    }
    const activeResId = storage.getItem(SAVED_RES_ID);
    if (!activeResId) {
      showToast("Place the Unlimited package order before requesting a refill.", "error");
      return;
    }
    const activeTable = storage.getItem(SAVED_TABLE_ID) || setupTable;
    const parsedTableId = Number.parseInt(activeTable, 10);
    setIsLoading(true);
    try {
      const submission = await submitKioskOrder(
        {
          reservation_id: activeResId,
          table_id: Number.isInteger(parsedTableId) ? parsedTableId : null,
          items: [
            {
              item_id: refillItem.id,
              quantity: 1,
              customizations: refillItem.customizations,
              is_refill: true,
            },
          ],
        },
        getAuthHeader(),
      );
      if (submission.queued) {
        const queuedAt = Date.now();
        persistKioskValue(LAST_REFILL_KEY, queuedAt.toString());
        setRefillCooldownSeconds(refillCooldown.milliseconds / 1000);
        setLocalBillHistory((previous) => [
          ...previous,
          { ...refillItem, is_placed: true, local_queue_key: submission.idempotencyKey },
        ]);
        showToast("Refill saved offline and will sync when internet returns.", "info");
        return;
      }
      persistKioskValue(LAST_REFILL_KEY, Date.now().toString());
      setRefillCooldownSeconds(refillCooldown.milliseconds / 1000);
      await fetchCurrentBill();
      showToast("Refill order placed.", "success");
    } catch (error) {
      if (error.response?.data?.error === "Cooldown active") {
        const message = error.response.data.message || "Refill is on cooldown.";
        const remainingMinutes = Number(message.match(/(\d+) more minutes?/i)?.[1]);
        if (remainingMinutes > 0) {
          const remainingSeconds = remainingMinutes * 60;
          persistKioskValue(
            LAST_REFILL_KEY,
            String(Date.now() - (refillCooldown.milliseconds - remainingSeconds * 1000)),
          );
          setRefillCooldownSeconds(remainingSeconds);
        }
        setCooldownMessage(message);
      } else {
        showToast("Refill order failed.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderPayClick = async () => {
    const packageError = validatePackageCart(
      [
        ...(billItems.length > 0 ? billItems : localBillHistory),
        ...cart,
      ],
      visiblePackageMode,
      visiblePackageInclusions,
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
    if (
      cart.length === 0 &&
      isUnlimitedMode &&
      hasPlacedUnlimitedOrder &&
      canRefillUnlimited
    ) {
      await handleRefillClick();
      return;
    }
    const hasRefillOrder = cart.some(
      (item) =>
        item.is_refill === true ||
        (item.customizations || "").toString().includes("[REFILL]"),
    );

    if (isUnlimitedMode && hasRefillOrder) {
      await confirmPaymentChoice("Pay Later");
      return;
    }

    setShowAllergyModal(true);
  };

  // Shared grouping logic used for both live fetches and the localStorage
  // cache, so the kiosk can paint the cached menu instantly on cold start.
  const applyMenuData = (data) => {
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
      const stockBlocked =
        item.is_stock_available === 0 || item.is_stock_available === false;
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
        unavailableReason: stockBlocked
          ? item.availability_reason || "Not available"
          : null,
      });
      return acc;
    }, {});
    setMenuData(grouped);
    setDynamicFlavors((grouped["Chicken"] || []).map((i) => i.name));
    setDynamicRamenFlavors((grouped["Ramen"] || []).map((i) => i.name));
    setDynamicDrinks(getDrinkOptions(grouped).map((item) => item.name));
    const firstVisibleCat = Object.keys(grouped).find(
      (cat) => isKioskCategoryVisible(cat, grouped, visibleCategoryIds),
    );
    setActiveCategory((prev) => {
      if (
        prev &&
        grouped[prev] &&
        isKioskCategoryVisible(prev, grouped, visibleCategoryIds)
      ) {
        return prev;
      }
      return firstVisibleCat || prev;
    });
  };

  const fetchMenu = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`, {
        headers: getFetchHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem("kiosk_menu_cache", JSON.stringify(data));
      }
      applyMenuData(data);
    } catch (e) {
      console.error(e);
      try {
        const cachedProducts = JSON.parse(localStorage.getItem("kiosk_menu_cache") || "[]");
        if (cachedProducts.length > 0) applyMenuData(cachedProducts);
      } catch (cacheError) {
        console.warn("No cached kiosk menu is available.", cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cache-first: paint the menu immediately from localStorage so the kiosk
    // never sits on a blank "Loading Menu..." screen during a cold start.
    // The live fetch below then refreshes it in the background.
    try {
      const cachedProducts = JSON.parse(
        localStorage.getItem("kiosk_menu_cache") || "[]",
      );
      if (cachedProducts.length > 0) applyMenuData(cachedProducts);
    } catch {
      /* no cache — fall through to the network fetch */
    }
    fetchCurrentBill();
  }, []);

  // Admin / cashier can interrupt a stuck (bugged) kiosk: when a staff member
  // stops the session from Table Status, the kiosk is sent back to its home
  // screen instead of leaving the customer trapped on a broken page.
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
      const activeTable =
        storage.getItem(SAVED_TABLE_ID) ||
        setupTable ||
        window.localStorage.getItem(FIXED_KIOSK_KEY);
      const stoppedId = payload?.reservationId;
      const stoppedTable = payload?.tableId;

      if (!stoppedId && !stoppedTable) return;
      if (
        stoppedId &&
        (!activeResId || String(stoppedId) !== String(activeResId))
      ) return;
      if (
        stoppedTable &&
        (!activeTable || String(stoppedTable) !== String(activeTable))
      ) return;

      playAlert();
      [
        TIMER_KEY,
        SAVED_TABLE_ID,
        SAVED_RES_ID,
        PAYMENT_CHOICE_KEY,
        TOTAL_PAID_KEY,
        LAST_REFILL_KEY,
      ].forEach((k) => {
        storage.removeItem(k);
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });

      clearTray();
      setBillItems([]);
      setLocalBillHistory([]);
      showToast(
        "This kiosk session was stopped by staff. Please start over.",
        "error",
      );
      window.location.href = "/kiosk-selection";
    };

    socket.on("kiosk_stopped", handleStopped);
    return () => {
      socket.off("kiosk_stopped", handleStopped);
      socket.disconnect();
    };
  }, []);

  // Read the admin-selected kiosk mode for THIS table and react to changes.
  // `unlimited_wings_a` / `unlimited_wings_b` → collapse the sidebar to
  // Unlimited + start the 90-min timer.

  useEffect(() => {
    const fetchMode = async () => {
      if (!setupTable) return;
      try {
        const res = await axios.get(`${API_BASE}/reservations/active-kiosk`, {
          params: { tableId: setupTable },
        });
        if (res.data?.success) {
          const serverMode = res.data.kioskMode || "default";
          if (isKioskModeResetPending && getUnlimitedPackage(serverMode)) {
            setTableKioskMenuMode("default");
            return;
          }
          if (isPackageTimerExpired && getUnlimitedPackage(serverMode)) {
            setIsPackageTimerExpired(false);
          }
          setTableKioskMenuMode(serverMode);
        }
      } catch (err) {
        console.warn("Kiosk mode poll failed:", err?.message);
      }
    };

    fetchMode();
    const pollInterval = setInterval(fetchMode, 3000);

    // Instant flip when the admin changes the mode
    let socket;
    try {
      socket = ioClient(BASE_URL, { transports: ["websocket", "polling"] });
    } catch (err) {
      console.warn("Kiosk mode socket unavailable:", err);
      return () => clearInterval(pollInterval);
    }

    const handleMode = (payload) => {
      if (
        payload?.tableId != null &&
        String(payload.tableId) === String(setupTable)
      ) {
        if (getUnlimitedPackage(payload.kiosk_mode)) {
          setIsKioskModeResetPending(false);
          setIsPackageTimerExpired(false);
        }
        setTableKioskMenuMode(payload.kiosk_mode || "default");
      }
    };
    socket.on("kiosk_mode_changed", handleMode);

    return () => {
      clearInterval(pollInterval);
      socket.off("kiosk_mode_changed", handleMode);
      socket.disconnect();
    };
  }, [isKioskModeResetPending, isPackageTimerExpired, setupTable]);

  // When the mode flips to either Unlimited mode, force the Unlimited
  // category. NOTE: the 90-minute timer intentionally does NOT start here —
  // it starts only after the customer places their order.
  useEffect(() => {
    if (!isUnlimitedMode) return;

    const packageCategories = getPackageCategories(
      menuData,
      kioskMenuMode,
      packageInclusions,
    );
    const fallbackCategory =
      packageCategories.find((category) => category !== "Unlimited") || "";
    setActiveCategory((current) =>
      packageCategories.includes(current) && current !== "Unlimited"
        ? current
        : fallbackCategory,
    );
  }, [isUnlimitedMode, kioskMenuMode, menuData, packageInclusions]);

  useEffect(() => {
    if (!isUnlimitedMode) return;
    // Only sanitize while the package menu is active; while browsing the full
    // menu the cart is validated at checkout instead.
    if (!browseFullMenu) {
      setCart((current) =>
        sanitizePackageCart(current, kioskMenuMode, packageInclusions),
      );
    }
    const allowedCategories = getPackageCategories(
      menuData,
      kioskMenuMode,
      packageInclusions,
    );
    if (
      !browseFullMenu &&
      activeCategory &&
      !allowedCategories.includes(activeCategory)
    ) {
      setActiveCategory(allowedCategories[0] || "");
    }
  }, [
    activeCategory,
    isUnlimitedMode,
    kioskMenuMode,
    menuData,
    browseFullMenu,
    packageInclusions,
  ]);

  // While an Unlimited order is actually placed, block the browser's own back
  // button / swipe-back so the customer can't escape the locked kiosk session.
  // Before placing an order the customer can still back out to /kiosk-selection.
  useEffect(() => {
    if (!unlimitedSessionLocked) return;

    window.history.pushState(null, "", window.location.href);

    const blockBack = () => {
      window.history.pushState(null, "", window.location.href);
      showToast(
        "Please finish your Unlimited session or ask staff for help.",
        "info",
      );
    };

    window.addEventListener("popstate", blockBack);
    return () => {
      window.removeEventListener("popstate", blockBack);
    };
  }, [unlimitedSessionLocked]);

  useEffect(() => {
    fetchMenu();
    const interval = setInterval(fetchMenu, 10000);
    const handleFocus = () => fetchMenu();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const handleItemClick = (item) => {
    console.log("Kiosk Item Clicked:", item);
    // Blocked by inventory (expired / out of stock) raw materials
    if (item && item.isStockAvailable === false) {
      showToast(`${item.name} is currently not available.`);
      return;
    }
    const packageItems = [
      ...(billItems.length > 0 ? billItems : localBillHistory),
      ...cart,
    ];
    const itemPackageMode = inferUnlimitedPackageMode(item);
    if (isSetItem(item)) {
      const setAlreadyInOrder = packageItems.some(isSetItem);
      if (setAlreadyInOrder) {
        showToast("A set is already in your order.");
        return;
      }
      const inclusions = getPackageInclusions(menuData, "set", item);
      const packageError = validatePackageCart(
        [...packageItems, { ...item, quantity: 1, customizations: null }],
        "set",
        inclusions,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      setCart((current) => [...current, { ...item, quantity: 1, customizations: null }]);
      if (inclusions.length > 0) {
        const categories = getPackageCategories(menuData, "set", inclusions);
        setActiveCategory(categories[0] || "");
      }
      return;
    }
    if (itemPackageMode) setIsPackageTimerExpired(false);
    if (
      isUnlimitedMode &&
      getPackageQuantityLimit(
        packageItems,
        item,
        kioskMenuMode,
        packageInclusions,
      ) < 1
    ) {
      showToast("You have reached this package's selection limit.", "error");
      return;
    }
    // Add the package card directly so its menu opens without a flavor modal.
    if (
      itemPackageMode &&
      isPackageCardForMode(item, itemPackageMode)
    ) {
      const packageInclusionsForMode = getPackageInclusions(
        menuData,
        itemPackageMode,
        item,
      );
      if (
        getPackageQuantityLimit(
          packageItems,
          item,
          itemPackageMode,
          packageInclusionsForMode,
        ) < 1
      ) {
        showToast("You have reached this package's selection limit.", "error");
        return;
      }
      const packageError = validatePackageCart(
        [...packageItems, { ...item, quantity: 1, customizations: null }],
        itemPackageMode,
        packageInclusionsForMode,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      resetMenuSelections();
      setCart((current) => [
        ...current.filter((i) => !inferUnlimitedPackageMode(i)),
        { ...item, quantity: 1, customizations: null },
      ]);
      setBrowseFullMenu(false);
      return;
    }

    if (isUnlimitedMode && isChickenCategory(getCategory(item))) {
      const isRefill = hasPlacedUnlimitedFlavorOrder;
      const cooldownRemaining = isRefill ? getRefillCooldownSeconds() : 0;
      if (cooldownRemaining > 0) {
        setRefillCooldownSeconds(cooldownRemaining);
        setCooldownMessage(
          `Refill is on cooldown. Please wait ${formatCooldownTime(cooldownRemaining)} before requesting another.`,
        );
        return;
      }
      const refillItem = {
        ...item,
        price: 0,
        quantity: 1,
        customizations: `${isRefill ? "[REFILL] " : ""}Flavors: ${item.name}`,
        is_refill: isRefill,
      };
      const packageError = validatePackageCart(
        [...packageItems, refillItem],
        visiblePackageMode,
        visiblePackageInclusions,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      setCart((current) => [...current, refillItem]);
      return;
    }

    if (isUnlimitedMode) {
      const packageItemIncluded =
        hasPendingUnlimitedPackage || hasPlacedUnlimitedOrder || isPaid;
      const packageItem = {
        ...item,
        price: packageItemIncluded ? 0 : item.price,
        quantity: 1,
        customizations: packageItemIncluded ? "[PACKAGE INCLUDED]" : null,
        is_refill: false,
      };
      const packageError = validatePackageCart(
        [...packageItems, packageItem],
        kioskMenuMode,
        packageInclusions,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      setCart((current) => [...current, packageItem]);
      return;
    }

    if (isSetMode) {
      if (
        getPackageQuantityLimit(
          packageItems,
          item,
          "set",
          setInclusions,
        ) < 1
      ) {
        showToast("This item is not included in the set or its limit was reached.");
        return;
      }
      const setIncludedItem = {
        ...item,
        price: 0,
        quantity: 1,
        customizations: "[PACKAGE INCLUDED]",
        is_package_included: true,
        is_set_included: true,
        is_refill: false,
      };
      const packageError = validatePackageCart(
        [...packageItems, setIncludedItem],
        "set",
        setInclusions,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      setCart((current) => [...current, setIncludedItem]);
      return;
    }

    if (activeCategory === "Chicken" && !isUnlimitedMode) {
      setSelectedItem({ ...item, price: 0 });
      setSelectedFlavors([]);
      setSelectedDrink("");
      setIsRefillMode(true);
      setShowFlavorModal(true);
    } else if (isJuiceItem(item) || isDrinkCategoryName(item)) {
      // Drinks / juice: no modal — behave like the chicken flavor picker flow
      // but add straight to the tray.
      setSelectedItem({ ...item, category: item.category || "Beverages" });
      setIsModalOpen(false);
      addDrinkDirect(item);
    } else {
      addItemDirect(item);
    }
  };

  const isDrinkCategoryName = (item) => {
    const cat = String(item?.category || "").toLowerCase();
    return cat.includes("drink") || cat.includes("beverage");
  };

  const addDrinkDirect = (item) => {
    const packageItems = [
      ...(billItems.length > 0 ? billItems : localBillHistory),
      ...cart,
    ];
    const drinkItem = {
      ...item,
      quantity: 1,
      customizations: item.customizations || null,
    };
    if (isUnlimitedMode) {
      const packageError = validatePackageCart(
        [...packageItems, drinkItem],
        kioskMenuMode,
        packageInclusions,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
    }
    setCart((current) => {
      const existingIdx = current.findIndex(
        (i) =>
          i.id === drinkItem.id &&
          i.customizations === drinkItem.customizations,
      );
      if (existingIdx > -1) {
        const updated = [...current];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }
      return [...current, drinkItem];
    });
  };

  const addItemDirect = (item) => {
    const cartItem = { ...item, quantity: 1, customizations: null };
    setCart((current) => {
      const existingIndex = current.findIndex(
        (existing) =>
          existing.id === cartItem.id &&
          existing.customizations === cartItem.customizations,
      );
      if (existingIndex < 0) return [...current, cartItem];
      return current.map((existing, index) =>
        index === existingIndex
          ? { ...existing, quantity: existing.quantity + 1 }
          : existing,
      );
    });
    showToast(`${item.name} added to tray.`, "success");
  };

  const confirmFlavors = async () => {
    const flavorLimit =
      flavorPackageMode === "unlimited_wings_a"
        ? Math.max(
            0,
            6 -
              getPackageChickenCount(
                [...(billItems.length > 0 ? billItems : localBillHistory), ...cart],
                flavorPackageMode,
              ),
          )
        : Infinity;
    if (selectedFlavors.length === 0) {
      setCooldownMessage("Please select at least one flavor.");
      return;
    }
    if (selectedFlavors.length > flavorLimit) {
      setCooldownMessage(`You can select a maximum of ${flavorLimit} flavors.`);
      return;
    }
    if (
      getUnlimitedPackage(flavorPackageMode) &&
      !isRefillMode &&
      !selectedDrink &&
      !inferUnlimitedPackageMode(selectedItem)
    ) {
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
      is_refill: isRefill,
    };

    if (isRefill) {
      setIsLoading(true);
      const activeResId = storage.getItem(SAVED_RES_ID);
      const activeTable = storage.getItem(SAVED_TABLE_ID);
      const parsedTableId = parseInt(activeTable, 10);
      const finalTableId = isNaN(parsedTableId) ? null : parsedTableId;

      try {
        const submission = await submitKioskOrder(
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

        if (submission.queued) {
          persistKioskValue(LAST_REFILL_KEY, Date.now().toString());
          setRefillCooldownSeconds(refillCooldown.milliseconds / 1000);
          setLocalBillHistory((previous) => [
            ...previous,
            { ...newItem, is_placed: true, local_queue_key: submission.idempotencyKey },
          ]);
          setShowFlavorModal(false);
          setIsRefillMode(false);
          showToast("Refill saved offline and will sync when internet returns.", "info");
          return;
        }

        persistKioskValue(LAST_REFILL_KEY, Date.now().toString());
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
      const packageError = getUnlimitedPackage(flavorPackageMode)
        ? validatePackageCart(
            [
              ...(billItems.length > 0 ? billItems : localBillHistory),
              ...cart,
              newItem,
            ],
            flavorPackageMode,
            packageInclusions,
          )
        : null;
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

  // Guarded back-to-default handler. The back button returns the customer to
  // the default kiosk view (full menu). Once an Unlimited order has actually
  // been placed, only staff can end the session.
  const handleBackToSelection = () => {
    if (unlimitedSessionLocked) {
      showToast(
        "You cannot exit during an Unlimited session. Please call staff.",
        "info",
      );
      return;
    }
    if (hasPendingUnlimitedPackage) {
      clearTray();
      return;
    }
    clearTray();
    sessionStorage.setItem("kiosk_exit_to_selection", "true");
    navigate("/kiosk-selection");
  };

  const displayTable =
    storage.getItem(SAVED_TABLE_ID) ||
    setupTable ||
    window.localStorage.getItem(FIXED_KIOSK_KEY);

  // Only show the blocking loader when we truly have nothing to render —
  // a cached menu paints instantly while the live fetch refreshes it.
  if (loading && Object.keys(menuData).length === 0)
    return <div className="loading-container">Loading Menu...</div>;

  return (
    <div className="res-kiosk-container">
      <div className="kiosk-timer-wrapper">
        <div className="header-left-group">
          <div className="header-id-section"> 
            <div className="id-details">
              <span className="id-label">TABLE NUMBER:</span>
              <span className="id-value">
                {displayTable === "takeout"
                  ? "TAKE-OUT"
                  : `TABLE ${displayTable || "?"}`}
              </span>
            </div>
          </div>
        </div>

        <div className="header-center-group">
          {isTimerRunning && (
            <div className="unlimited-timer-pill">
              <span className="timer-tag">Time:</span>
              <span
                className={`timer-digits ${timeLeft < 600 ? "urgent" : ""}`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
          {((isUnlimitedMode && hasPlacedUnlimitedOrder) ||
            (!isUnlimitedMode && hasPlacedOrder)) && (
            <button
              className="billing-btn-header"
              onClick={handleHeaderPayClick}
              disabled={isLoading}
            >
              <CreditCard size={18} />
              {parseFloat(calculateTotalDue(true)) <= 0
                ? "VIEW RECEIPT"
                : "PAY BILL"}
            </button>
          )}
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
                .filter(
                  (cat) =>
                    isCategoryVisible(cat) &&
                    ((isUnlimitedMode || isSetMode) &&
                    (!isUnlimitedMode || !browseFullMenu)
                      ? getPackageCategories(
                          menuData,
                          visiblePackageMode,
                          visiblePackageInclusions,
                        ).includes(cat) && cat !== "Unlimited"
                      : true),
                )
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
          {(isUnlimitedMode || isSetMode) && (
            <div
              className="unlimited-package-summary"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px 16px",
                padding: "12px 16px",
                marginBottom: "12px",
                borderBottom: "1px solid rgba(255, 204, 0, 0.35)",
                color: "#fff",
              }}
            >
              <div style={{ flex: "1 1 auto" }}>
                <strong>{activePackageLabel}</strong>
                <span style={{ marginLeft: "12px" }}>
                  {activePackageSummary}
                </span>
              </div>
            </div>
          )}
          <div className="res-grid-container">
            {(() => {
              const items = menuData[activeCategory] || [];
              if (!isUnlimitedMode && !isSetMode) return items;
              return getPackageItems(
                items,
                activeCategory,
                visiblePackageMode,
                visiblePackageInclusions,
              );
            })().map((item) => (
              <div
                key={item.id}
                className={`res-food-card ${item.isStockAvailable === false ? "res-food-card-unavailable" : ""}`}
                style={
                  item.isStockAvailable === false
                    ? {
                        opacity: 0.45,
                        filter: "grayscale(0.7)",
                        cursor: "not-allowed",
                      }
                    : undefined
                }
                onClick={() => handleItemClick(item)}
              >
                <div className="res-card-image-container">
                  <OfflineMenuImage
                    src={item.image}
                    alt={item.name}
                    className="res-food-img"
                    onError={(e) => (e.target.src = "/fallback-food.png")}
                  />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">{item.name}</h4>
                  {item.description && (
                    <p className="res-food-description">{item.description}</p>
                  )}
                  {item.isStockAvailable === false && (
                    <p
                      style={{
                        color: "#ff5c5c",
                        fontWeight: "bold",
                        margin: 0,
                      }}
                    >
                      NOT AVAILABLE
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        <OrderSummary
          cart={cart}
          packageLabel={activePackageLabel}
          onRemoveItem={(id) => setCart(cart.filter((i) => i.id !== id))}
        />
      </div>

      <footer className="res-bottom-bar">
        {/* Back is available until an Unlimited order is actually placed.
            Before that the customer can freely return to the selection screen. */}
        {!unlimitedSessionLocked && (
          <button
            className="res-btn-cancel"
            onClick={handleBackToSelection}
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
          <button className="res-btn-cancel" onClick={clearTray}>
            Clear Tray
          </button>
          <button
            className="res-btn-view"
            disabled={
              isLoading ||
              (isUnlimitedMode &&
                hasPlacedUnlimitedOrder &&
                canRefillUnlimited &&
                refillCooldownSeconds > 0) ||
              (cart.length === 0 &&
                (!isUnlimitedMode ||
                  !hasPlacedUnlimitedOrder ||
                  !canRefillUnlimited ||
                  refillCooldownSeconds > 0)) ||
              (hasRefillInTray && refillCooldownSeconds > 0)
            }
            onClick={handlePlaceOrderClick}
          >
            {isUnlimitedMode &&
            hasPlacedUnlimitedOrder &&
            canRefillUnlimited &&
            refillCooldownSeconds > 0
              ? `Refill in ${formatCooldownTime(refillCooldownSeconds)}`
              : cart.length === 0 && isUnlimitedMode && hasPlacedUnlimitedOrder
                ? "Place Refill"
                : hasRefillInTray
                  ? `Place Refill (${cart.length})`
                  : `Place Order (${cart.length})`}
          </button>
        </div>
      </footer>

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
                <AlertCircle size={28} /> Allergy & Cooking Preferences
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
            <div
              className="allergy-input-group"
              style={{ marginBottom: "25px" }}
            >
              <label
                htmlFor="kiosk-cooking-instructions"
                style={{
                  display: "block",
                  color: "#ffcc00",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                }}
              >
                Cooking preferences or comments (optional)
              </label>
              <textarea
                id="kiosk-cooking-instructions"
                value={cookingInstructions}
                onChange={(event) =>
                  setCookingInstructions(event.target.value)
                }
                placeholder="e.g., Cook well-done, sauce on the side, less spicy..."
                rows="3"
                maxLength={500}
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
                Your note will be included with each item for the kitchen.
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
                    setIsFinalCheckout(false);
                    setShowBillInfo(true);
                  } else {
                    const fixedTable =
                      setupTable ||
                      window.localStorage.getItem(FIXED_KIOSK_KEY);

                    if (fixedTable) {
                      setPendingOrderDetails({
                        tableId: fixedTable,
                        mode: "Dine-In",
                      });
                      setIsFinalCheckout(false);
                      setShowBillInfo(true);
                    } else {
                      setShowTypeModal(true);
                    }
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
                  const fixed = window.localStorage.getItem(FIXED_KIOSK_KEY);
                  if (fixed) {
                    setPendingOrderDetails({ tableId: fixed, mode: "Dine-In" });
                    setShowTypeModal(false);
                    setIsFinalCheckout(false);
                    setShowBillInfo(true);
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
                  setIsFinalCheckout(false);
                  setShowBillInfo(true);
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
                    setIsFinalCheckout(false);
                    setShowBillInfo(true);
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
                <div className="me-2" /> PAY NOW (CASHIER)
              </button>
              <button
                className="res-modal-btn-primary"
                disabled={isLoading}
                style={{ background: "#ffcc00" }}
                onClick={() => confirmPaymentChoice("Pay Later")}
              >
                <div className="me-2" /> ORDER NOW, PAY LATER
              </button>
              <button
                className="res-btn-cancel"
                onClick={() => setShowPaymentModal(false)}
              >
                BACK
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
              {(isFinalCheckout
                ? billItems.length > 0
                  ? billItems
                  : localBillHistory
                : cart
              ).map((item, idx) => {
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
                const isPackageIncluded = (item.customizations || "")
                  .toString()
                  .includes("[PACKAGE INCLUDED]");
                if (isRefill || isPackageIncluded) {
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
                      <span
                        style={{
                          fontWeight: "bold",
                          display: "block",
                          color: "#ffffff",
                        }}
                      >
                        {item.name ||
                          item.item_name ||
                          item.menu_name ||
                          "Ordered Item"}
                      </span>
                      <small style={{ color: "#888" }}>
                        {isRefill
                          ? "REFILL"
                          : isPackageIncluded
                            ? "Package included"
                            : `₱${p.toFixed(2)} x ${q}`}
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
              {!isFinalCheckout ? (
                <>
                  <button
                    className="res-modal-btn-primary"
                    onClick={() => confirmPaymentChoice("Pay Now")}
                    disabled={isLoading}
                  >
                    PAY NOW (CASHIER)
                  </button>
                  <button
                    className="res-modal-btn-primary"
                    style={{ background: "#ffcc00" }}
                    onClick={() => confirmPaymentChoice("Pay Later")}
                    disabled={isLoading}
                  >
                    ORDER NOW, PAY LATER
                  </button>
                </>
              ) : parseFloat(calculateTotalDue(isFinalCheckout)) > 0 ? (
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

                      persistKioskValue(TOTAL_PAID_KEY, totalBill.toString());
                      setLocalTotalPaid(totalBill);

                      setIsLoading(false);

                      fetchCurrentBill();
                      setShowBillInfo(false);
                    } catch (err) {
                      showToast("Payment processing failed.");
                      setIsLoading(false);
                    }
                  }}
                >
                  <div className="me-2" /> PAY NOW
                </button>
              ) : (
                <button
                  className="res-modal-btn-primary"
                  style={{ background: "#28a745" }}
                  onClick={handleEndSession}
                >
                  FINISH
                </button>
              )}

              <button
                className="res-btn-cancel"
                onClick={() => setShowBillInfo(false)}
              >
                {!isFinalCheckout
                  ? "BACK"
                  : parseFloat(calculateTotalDue(isFinalCheckout)) > 0
                    ? "PAY LATER"
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
            {getUnlimitedPackage(flavorPackageMode) && (
              <p className="section-label">
                {activePackageLabel}: {activePackageSummary}
              </p>
            )}
            <div className="customization-scroll-area">
              <section className="modal-section">
                <h3 className="section-label">
                  {flavorPackageMode === "unlimited_wings_a"
                    ? "Select Chicken Flavors (Up to 6)"
                    : getUnlimitedPackage(flavorPackageMode)
                      ? "Select Wing Flavors"
                      : "Select Flavors"}
                </h3>
                <div className="flavor-grid">
                  {(selectedItem?.name.toLowerCase().includes("ramen")
                    ? dynamicRamenFlavors
                    : dynamicFlavors
                  )
                    .filter(
                      (flavor) =>
                        !getUnlimitedPackage(flavorPackageMode) ||
                        flavorPackageMode === "unlimited_wings_a" ||
                        /wing/i.test(flavor),
                    )
                    .map((f) => (
                    <button
                      key={f}
                      onClick={() =>
                        setSelectedFlavors((prev) => {
                          if (prev.includes(f)) {
                            return prev.filter((x) => x !== f);
                          }
                          const flavorLimit =
                            flavorPackageMode === "unlimited_wings_a"
                              ? Math.max(
                                  0,
                                  6 -
                                    getPackageChickenCount(
                                      [
                                        ...(billItems.length > 0
                                          ? billItems
                                          : localBillHistory),
                                        ...cart,
                                      ],
                                      flavorPackageMode,
                                    ),
                                )
                              : Infinity;
                          if (prev.length >= flavorLimit) {
                            setCooldownMessage(
                              `You can select a maximum of ${flavorLimit} flavors.`,
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
                  {dynamicDrinks
                    .filter(
                      (drink) =>
                        flavorPackageMode === "unlimited_wings_a" ||
                        !getUnlimitedPackage(flavorPackageMode) ||
                        isJuiceItem({ name: drink, category: "Drinks" }),
                    )
                    .map((drink) => (
                      <button
                        key={drink}
                        onClick={() => setSelectedDrink(drink)}
                        className={`flavor-btn ${selectedDrink === drink ? "active-drink" : ""}`}
                      >
                        {drink}
                      </button>
                    ))}
                </div>
              </section>
            </div>

            <div className="modal-footer-actions">
              <button
                className="res-btn-cancel-ui"
                onClick={resetMenuSelections}
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
        onAdd={(newItem) => {
          setCart((prevCart) => {
            const existingIdx = prevCart.findIndex(
              (i) =>
                i.id === newItem.id &&
                i.customizations === newItem.customizations,
            );

            let nextCart;
            if (existingIdx > -1) {
              const updated = [...prevCart];
              updated[existingIdx] = {
                ...updated[existingIdx],
                quantity: updated[existingIdx].quantity + (newItem.quantity || 1),
              };
              nextCart = updated;
            } else {
              nextCart = [
                ...prevCart,
                {
                  ...newItem,
                  category: newItem.category || selectedItem?.category,
                  quantity: newItem.quantity || 1,
                },
              ];
            }
            if (!isUnlimitedMode && !isSetMode) return nextCart;
            const packageError = validatePackageCart(
              [
                ...(billItems.length > 0 ? billItems : localBillHistory),
                ...nextCart,
              ],
              visiblePackageMode,
              visiblePackageInclusions,
            );
            if (packageError) {
              showToast(packageError, "error");
              return prevCart;
            }
            const validated = sanitizePackageCart(
              nextCart,
              visiblePackageMode,
              visiblePackageInclusions,
            );
            if (
              validated.length !== nextCart.length ||
              validated.some((item, index) => item.quantity !== nextCart[index]?.quantity)
            ) {
              showToast("That item exceeds the selected package limits.", "error");
            }
            return validated;
          });
        }}
        allProducts={
          isUnlimitedMode || isSetMode
            ? getPackageMenuData(
                menuData,
                visiblePackageMode,
                visiblePackageInclusions,
              )
            : menuData
        }
        flavorLimit={
          isUnlimitedMode
            ? kioskMenuMode === "unlimited_wings_a"
              ? Math.max(
                  0,
                  6 -
                    getPackageChickenCount(
                      [
                        ...(billItems.length > 0 ? billItems : localBillHistory),
                        ...cart,
                      ],
                      kioskMenuMode,
                    ),
                )
              : Infinity
            : 4
        }
        quantityLimit={
          isUnlimitedMode
            ? getPackageQuantityLimit(
                [
                  ...(billItems.length > 0 ? billItems : localBillHistory),
                  ...cart,
                ],
                selectedItem,
                kioskMenuMode,
                packageInclusions,
              )
            : isSetMode
              ? getPackageQuantityLimit(
                  [
                    ...(billItems.length > 0 ? billItems : localBillHistory),
                    ...cart,
                  ],
                  selectedItem,
                  "set",
                  setInclusions,
                )
            : 20
        }
      />
    </div>
  );
};

export default KioskMenu;

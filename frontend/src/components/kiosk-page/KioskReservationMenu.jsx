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
  Clock,
  Receipt,
  UtensilsCrossed,
  RefreshCw,
  CreditCard,
  User,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import "../../Style/KioskReservationMenu.css";
import ReservationOrderModal from "./ReservationOrderModal";
import OrderSummary from "./OrderSummary";
import PortalModal from "./PortalModal";
import OfflineMenuImage from "./OfflineMenuImage";
import axios from "axios";
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
import io from "socket.io-client";
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
  isPackageCardForMode,
  isJuiceItem,
  isChickenCategory,
  isUnlimitedPackageItem,
  isSetItem,
  hasUnlimitedFlavorSelection,
  sanitizePackageCart,
  validatePackageCart,
} from "./unlimitedPackageRules";

const enrichOrderItems = (items, products) =>
  (items || []).map((item) => {
    const itemId = item.item_id ?? item.id;
    const product =
      itemId == null
        ? null
        : (products || []).find(
            (candidate) =>
              Number(candidate.item_id ?? candidate.id) === Number(itemId),
          );
    return {
      ...item,
      category_id: item.category_id ?? product?.category_id,
      category_name: item.category_name ?? product?.category_name,
      category: item.category ?? item.category_name ?? product?.category_name,
    };
  });

const getReservationEndTimestamp = (reservation) => {
  if (reservation?.reservation_end_at) {
    const timestamp = Date.parse(reservation.reservation_end_at);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  if (!reservation?.reservation_date || !reservation?.end_time) return null;
  const dateValue = reservation.reservation_date;
  const date = dateValue instanceof Date
    ? dateValue.toISOString().slice(0, 10)
    : String(dateValue).slice(0, 10);
  const time = String(reservation.end_time).split("T").pop();
  const match = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !dateMatch) return null;
  const [, year, month, day] = dateMatch;
  const [, hour, minute, second = "0"] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ) - 8 * 60 * 60 * 1000;
};

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
    sessionStorage.getItem("resId") || localStorage.getItem("resId") || null,
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
  const TIMER_START_KEY = `kiosk_res_timer_start_${reservationId}`;
  const RESERVATION_SNAPSHOT_KEY = `kiosk_reservation_snapshot_${activeResId || "none"}`;
  const PAYMENT_CHOICE_KEY = `kiosk_pay_choice_${reservationId}`;
  const TOTAL_PAID_KEY = `kiosk_total_paid_${reservationId}`;
  const LAST_REFILL_KEY = `kiosk_last_refill_${reservationId}`;

  const [menuData, setMenuData] = useState(() => {
    // Cache-first seed: group the cached products synchronously on the very
    // first render so the menu paints instantly while network data loads.
    try {
      const cached = JSON.parse(localStorage.getItem("kiosk_menu_cache") || "[]");
      const grouped = {};
      cached.forEach((item) => {
        if (item.is_available === 0 || item.is_available === false) return;
        const cat = item.category_name || "General";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
          id: item.item_id,
          name: item.menu_name || item.name,
          image: item.local_path || item.image_url || "",
          price: item.price,
          description: item.description || "",
          category: cat,
          category_id: item.category_id,
          package_inclusions: item.package_inclusions || [],
        });
      });
      return grouped;
    } catch {
      return {};
    }
  });
  const [visibleCategoryIds, setVisibleCategoryIds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [tableKioskMenuMode, setTableKioskMenuMode] = useState("default");
  const isCategoryVisible = (categoryName) =>
    isKioskCategoryVisible(categoryName, menuData, visibleCategoryIds);
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [localBillHistory, setLocalBillHistory] = useState(() =>
    getQueuedOrderItemsForReservation(activeResId),
  );
  const [timeLeft, setTimeLeft] = useState(5400);
  const [reservationTimeLeft, setReservationTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPackageTimerExpired, setIsPackageTimerExpired] = useState(false);
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
  const [refillCooldownSeconds, setRefillCooldownSeconds] = useState(0);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [reservationDetails, setReservationDetails] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          `kiosk_reservation_snapshot_${sessionStorage.getItem("resId") || localStorage.getItem("resId") || "none"}`,
        ),
      );
    } catch {
      return null;
    }
  });
  const [reservedPackageMode, setReservedPackageMode] = useState(null);

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

  // An Unlimited order counts as "placed" only once it exists in the bill
  // (server-synced) or local bill history — not while it's still sitting in
  // the cart. The back-button lock engages only after that point.
  const placedOrderItems = [...billItems, ...localBillHistory];
  const hasPlacedUnlimitedOrder = placedOrderItems.some(
    isUnlimitedPackageItem,
  );
  const hasPlacedUnlimitedFlavorOrder =
    hasUnlimitedFlavorSelection(placedOrderItems);
  const hasOrderedUnlimited = [...billItems, ...cart].some(
    isUnlimitedPackageItem,
  );
  const packageOrderItems = [
    ...billItems,
    ...cart.filter((item) => !item.is_placed),
  ];
  const activePackageItem =
    cart.find((item) => inferUnlimitedPackageMode(item)) ||
    placedOrderItems.find((item) => inferUnlimitedPackageMode(item));
  const orderedPackageMode = [...billItems, ...cart]
    .map(inferUnlimitedPackageMode)
    .find(Boolean);
  const kioskMenuMode = getUnlimitedPackage(tableKioskMenuMode)
    ? tableKioskMenuMode
    : isPackageTimerExpired
      ? tableKioskMenuMode
      : reservedPackageMode || orderedPackageMode || tableKioskMenuMode;
  const isUnlimitedMode = Boolean(getUnlimitedPackage(kioskMenuMode));
  const unlimitedSessionLocked = isUnlimitedMode && hasPlacedUnlimitedOrder;
  const packageInclusions = useMemo(
    () => getPackageInclusions(menuData, kioskMenuMode, activePackageItem),
    [menuData, kioskMenuMode, activePackageItem],
  );
  const pendingSetItem = cart.find(
    (item) => !item.is_placed && isSetItem(item),
  );
  const setInclusions = useMemo(
    () =>
      pendingSetItem
        ? getPackageInclusions(menuData, "set", pendingSetItem).map(
            (inclusion) => ({
              ...inclusion,
              is_unlimited: false,
              quantity_limit: Math.max(1, Number(inclusion.quantity_limit) || 1),
            }),
          )
        : [],
    [menuData, pendingSetItem],
  );
  const isSetMode =
    !isUnlimitedMode &&
    Boolean(pendingSetItem) &&
    setInclusions.length > 0;
  useEffect(() => {
    const firstVisibleCategory = Object.keys(menuData).find((category) =>
      isCategoryVisible(category),
    );
    if (isSetMode || isUnlimitedMode) return;
    const nextCategory = firstVisibleCategory || "";
    if (!isCategoryVisible(activeCategory) && nextCategory !== activeCategory) {
      setActiveCategory(nextCategory);
    }
  }, [activeCategory, isSetMode, isUnlimitedMode, menuData, visibleCategoryIds]);
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
    );
    const visibleActiveSetCategory = categories.find(
      (category) => category === activeCategory,
    );
    if (!visibleActiveSetCategory && categories[0] && categories[0] !== activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [
    activeCategory,
    isSetMode,
    menuData,
    setInclusions,
    visibleCategoryIds,
  ]);
  const activeSetItem = pendingSetItem || billItems.find(isSetItem) || null;
  const refillTargets =
    packageInclusions.length > 0
      ? getUnlimitedPackageRefillItems(menuData, packageInclusions).filter(
          (item) => item.isStockAvailable !== false,
        )
      : (menuData["Chicken"] || []).filter(
          (item) => item.isStockAvailable !== false,
        );
  const canRefillUnlimited =
    isUnlimitedMode &&
    hasPlacedUnlimitedOrder &&
    (packageInclusions.length > 0
      ? refillTargets.length > 0
      : hasPlacedUnlimitedFlavorOrder);
  const getInclusionsForMode = (mode, packageItem) =>
    getPackageInclusions(menuData, mode, packageItem);
  const activePackageLabel =
    (isSetMode ? activeSetItem : activePackageItem)?.name ||
    (isSetMode ? activeSetItem : activePackageItem)?.menu_name ||
    (isSetMode ? activeSetItem : activePackageItem)?.item_name ||
    getUnlimitedPackage(kioskMenuMode)?.label;
  const activePackageSummary =
    getPackageInclusionSummary(menuData, visiblePackageInclusions) ||
    getUnlimitedPackage(kioskMenuMode)?.included;
  const flavorPackageMode =
    inferUnlimitedPackageMode(selectedItem) || kioskMenuMode;

  const hasPendingUnlimitedPackage = cart.some(
    (item) => !item.is_placed && Boolean(inferUnlimitedPackageMode(item)),
  );

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
      setReservedPackageMode(null);
      setActiveCategory(
        Object.keys(menuData).find(
          (category) => isCategoryVisible(category),
        ) || "",
      );
    }
  };

  const isEventReservation = useMemo(() => {
    if (!reservationDetails) return false;
    const type = (
      reservationDetails.reservation_type ||
      reservationDetails.reservationType ||
      reservationDetails.booking_type ||
      ""
    ).toLowerCase();
    return type.includes("event");
  }, [reservationDetails]);

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

  const formatRefillCooldown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    const syncRefillCooldown = () =>
      setRefillCooldownSeconds(getRefillCooldownSeconds());
    syncRefillCooldown();
    const interval = setInterval(syncRefillCooldown, 1000);
    return () => clearInterval(interval);
  }, [reservationId]);

  const getAuthHeader = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
      return { headers: {} };
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const handleExitKiosk = () => {
    // Only lock exit once an Unlimited order has actually been placed —
    // before that the customer can still back out to the selection screen.
    if (unlimitedSessionLocked) {
      showToast(
        "You cannot exit during an Unlimited session. Please call staff.",
        "info",
      );
      return;
    }

    sessionStorage.removeItem("resId");
    sessionStorage.removeItem("tableId");

    [
      "resId",
      "tableId",
      TIMER_KEY,
      TIMER_START_KEY,
      PAYMENT_CHOICE_KEY,
      TOTAL_PAID_KEY,
      LAST_REFILL_KEY,
      RESERVATION_SNAPSHOT_KEY,
      `kiosk_event_warning_${activeResId}`,
      `kiosk_bill_cache_${activeResId}`,
      "kiosk_last_refill_timestamp",
    ].forEach((k) => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });

    sessionStorage.setItem("kiosk_exit_to_selection", "true");
    const searchString = setupTable ? `?setupTable=${setupTable}` : "";
    navigate(`/kiosk-selection${searchString}`);
  };

  const handleBack = () => {
    if (unlimitedSessionLocked) {
      showToast(
        "You cannot exit during an Unlimited session. Please call staff.",
        "info",
      );
      return;
    }
    if (pendingSetItem) {
      setCart((current) =>
        current.filter(
          (item) => !isSetItem(item) && !item.is_set_included,
        ),
      );
      setActiveCategory(
        Object.keys(menuData).find((category) => isCategoryVisible(category)) ||
          "",
      );
      return;
    }
    if (hasPendingUnlimitedPackage) {
      clearTray();
      return;
    }
    clearTray();
    handleExitKiosk();
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
      sessionStorage.getItem("tableId") ||
      localStorage.getItem("tableId") ||
      setupTable;
    const parsed = parseInt(rawTableId, 10);
    return Number.isInteger(parsed) ? parsed : null;
  };
  const resolvedKioskTableId = getCurrentTableId();

  // ==================== POLLING & MODE DETECTOR ====================
  useEffect(() => {
    const checkActiveKiosk = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reservations/active-kiosk`, {
          params: { tableId: getCurrentTableId() },
        });

        if (res.data && res.data.success) {
          const { mode, reservation, kioskMode: tableMode } = res.data;
          const reservedMode =
            inferUnlimitedPackageMode(reservation?.package_name) ||
            reservedPackageMode;
          const activeTableMode = tableMode || reservation?.kiosk_mode || "default";
          setTableKioskMenuMode(
            activeTableMode !== "default"
              ? activeTableMode
              : reservedMode || activeTableMode,
          );

          if (mode === "event_waiting") {
            if (activeResId) {
              localStorage.removeItem("resId");
              localStorage.removeItem("tableId");
              sessionStorage.removeItem("resId");
              sessionStorage.removeItem("tableId");
              setActiveResId(null);
            }
            setKioskMode("event_waiting");
          } else if (mode === "event_active") {
            const { reservation_id, table_id } = reservation;
            if (activeResId !== reservation_id) {
              sessionStorage.setItem("resId", reservation_id);
              localStorage.setItem("resId", reservation_id);
              if (table_id)
                sessionStorage.setItem("tableId", table_id.toString());
              if (table_id)
                localStorage.setItem("tableId", table_id.toString());
              setActiveResId(reservation_id);
            }
            setReservationDetails((current) => {
              const next = {
                ...(current?.reservation_id === reservation_id ? current : {}),
                ...reservation,
              };
              localStorage.setItem(
                `kiosk_reservation_snapshot_${reservation_id}`,
                JSON.stringify(next),
              );
              return next;
            });
            if (localStorage.getItem(`kiosk_event_expired_offline_${reservation_id}`)) {
              localStorage.removeItem(`kiosk_event_expired_offline_${reservation_id}`);
              const packageStart = Number(storage.getItem(TIMER_START_KEY));
              const packageDeadline = getReservationEndTimestamp(reservation);
              const effectivePackageEnd = packageStart && packageDeadline
                ? Math.min(packageStart + 1.5 * 60 * 60 * 1000, packageDeadline)
                : 0;
              if (effectivePackageEnd > Date.now()) {
                storage.setItem(TIMER_KEY, effectivePackageEnd.toString());
                setTimeLeft(Math.ceil((effectivePackageEnd - Date.now()) / 1000));
                setIsTimerRunning(true);
              }
              fetchCurrentBill();
            }
            setKioskMode("active");
          } else if (mode === "table_default" && activeResId && isEventReservation) {
            [
              "resId",
              "tableId",
              TIMER_KEY,
              TIMER_START_KEY,
              PAYMENT_CHOICE_KEY,
              TOTAL_PAID_KEY,
              LAST_REFILL_KEY,
              RESERVATION_SNAPSHOT_KEY,
              `kiosk_event_warning_${activeResId}`,
              `kiosk_event_expired_offline_${activeResId}`,
              `kiosk_bill_cache_${activeResId}`,
            ].forEach((key) => {
              sessionStorage.removeItem(key);
              localStorage.removeItem(key);
            });
            setActiveResId(null);
            setReservationDetails(null);
            setReservationTimeLeft(0);
            setIsTimerRunning(false);
            setCart([]);
            setBillItems([]);
            setLocalBillHistory([]);
            setTableKioskMenuMode("default");
            setKioskMode("event_waiting");
            showToast("Your reservation has ended. The kiosk is ready for the next customer.", "info");
            navigate(`/kiosk-selection${setupTable ? `?setupTable=${setupTable}` : ""}`);
          } else {
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
  }, [activeResId, isEventReservation, reservedPackageMode, setupTable]);

  useEffect(() => {
    if (!isEventReservation || !activeResId) return;
    const endTimestamp = getReservationEndTimestamp(reservationDetails);
    if (!endTimestamp) return;

    const warningKey = `kiosk_event_warning_${activeResId}`;
    const offlineExpiredKey = `kiosk_event_expired_offline_${activeResId}`;
    let hasEnded = false;
    const updateReservationTimer = () => {
      const remaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
      setReservationTimeLeft(remaining);

      if (
        remaining > 0 &&
        remaining <= 30 * 60 &&
        !sessionStorage.getItem(warningKey) &&
        !localStorage.getItem(warningKey)
      ) {
        sessionStorage.setItem(warningKey, "shown");
        localStorage.setItem(warningKey, "shown");
        showToast(
          "Your reservation time is ending soon. You have 30 minutes remaining.",
          "info",
        );
      }

      if (remaining === 0 && !navigator.onLine) {
        hasEnded = true;
        localStorage.setItem(offlineExpiredKey, "true");
        setIsTimerRunning(false);
        setCart([]);
        setBillItems([]);
        setLocalBillHistory([]);
        setTableKioskMenuMode("default");
        setKioskMode("event_waiting");
        if (!localStorage.getItem(`${offlineExpiredKey}_notified`)) {
          localStorage.setItem(`${offlineExpiredKey}_notified`, "true");
          showToast("Reservation time reached. Waiting to verify the latest end time when connection returns.", "info");
        }
        return;
      }

      if (remaining === 0 && !hasEnded) {
        hasEnded = true;
        ["resId", "tableId", TIMER_KEY, TIMER_START_KEY, PAYMENT_CHOICE_KEY, TOTAL_PAID_KEY, LAST_REFILL_KEY, warningKey, offlineExpiredKey, `${offlineExpiredKey}_notified`, RESERVATION_SNAPSHOT_KEY, `kiosk_bill_cache_${activeResId}`].forEach((key) => {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        });
        setActiveResId(null);
        setReservationDetails(null);
        setReservationTimeLeft(0);
        setIsTimerRunning(false);
        setCart([]);
        setBillItems([]);
        setLocalBillHistory([]);
        setTableKioskMenuMode("default");
        setKioskMode("event_waiting");
        showToast("Your reservation has ended. The kiosk is ready for the next customer.", "info");
        navigate(`/kiosk-selection${setupTable ? `?setupTable=${setupTable}` : ""}`);
      }
    };

    updateReservationTimer();
    const interval = setInterval(updateReservationTimer, 1000);
    return () => clearInterval(interval);
  }, [
    activeResId,
    isEventReservation,
    navigate,
    reservationDetails,
    showToast,
    TIMER_KEY,
    TIMER_START_KEY,
    PAYMENT_CHOICE_KEY,
    TOTAL_PAID_KEY,
    LAST_REFILL_KEY,
    RESERVATION_SNAPSHOT_KEY,
    setupTable,
  ]);

  const reservationEndTimestamp = getReservationEndTimestamp(reservationDetails);

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
      const isPackageIncluded = (item.customizations || "")
        .toString()
        .includes("[PACKAGE INCLUDED]");

      if (isRefill || isPackageIncluded) p = 0;

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
        const isPackageIncluded = (item.customizations || "")
          .toString()
          .includes("[PACKAGE INCLUDED]");

        if (isRefill || isPackageIncluded) p = 0;

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
    const totalSession = calculateSessionTotal();
    const alreadyPaid = parseFloat(storage.getItem(TOTAL_PAID_KEY) || 0);
    const remaining = totalSession - alreadyPaid;
    return remaining > 0.01 ? remaining.toFixed(2) : "0.00";
  };

  const fetchCurrentBill = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/reservations/${reservationId}/items`,
        getAuthHeader(),
      );
      if (res.data) {
        const products = Object.values(menuData).flat();
        const enrichedItems = enrichOrderItems(res.data, products);
        setBillItems(enrichedItems);
        const pendingKeys = new Set(
          getQueuedOrderItemsForReservation(activeResId).map((item) => item.local_queue_key),
        );
        setLocalBillHistory((items) =>
          items.filter(
            (item) => !item.local_queue_key || pendingKeys.has(item.local_queue_key),
          ),
        );
        localStorage.setItem(
          `kiosk_bill_cache_${activeResId}`,
          JSON.stringify(res.data),
        );
        return enrichedItems;
      }
      return res.data;
    } catch (err) {
      console.warn("Error fetching items:", err);
      try {
        const cachedItems = JSON.parse(
          localStorage.getItem(`kiosk_bill_cache_${activeResId}`) || "[]",
        );
        setBillItems(enrichOrderItems(cachedItems, Object.values(menuData).flat()));
        return cachedItems;
      } catch {
        return [];
      }
    }
  };

  useEffect(() => {
    const handleOffline = () =>
      showToast("Internet connection lost. Your reservation timer will continue.", "info");
    const handleOnline = () => {
      showToast("Internet connection restored. Kiosk data is syncing.", "success");
      fetchCurrentBill();
    };
    const handleOrderSynced = (event) => {
      const { idempotencyKey, payload } = event.detail || {};
      if (payload?.reservation_id !== activeResId) return;
      setLocalBillHistory((items) =>
        items.filter((item) => item.local_queue_key !== idempotencyKey),
      );
      fetchCurrentBill();
      showToast("Your offline order has synced.", "success");
    };
    const handleOrderSyncFailed = (event) => {
      if (event.detail?.payload?.reservation_id !== activeResId) return;
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
    const savedOrders = getQueuedOrderItemsForReservation(activeResId);
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
  }, [activeResId, showToast]);

  const playAlert = async () => {
    try {
      audioObj.currentTime = 0;
      await audioObj.play();
    } catch (e) {}
  };

  const handleOrderClick = () => {
    if (!canRefillUnlimited) return;
    showToast("Add an item to your cart before placing a refill.", "error");
  };

  useEffect(() => {
    if (activeCategory === "Unlimited" && hasOrderedUnlimited) {
      const fallbackCategory = Object.keys(menuData).find(
        (cat) => isCategoryVisible(cat) && cat !== "Unlimited",
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
          description: item.description || "",
          category: cat,
          category_id: item.category_id,
          package_inclusions: item.package_inclusions || [],
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
        getDrinkOptions(grouped).map((item) => item.menu_name || item.name),
      );

      const cats = Object.keys(grouped).filter(
        (c) => isKioskCategoryVisible(c, grouped, visibleCategoryIds),
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
          fetch(`${API_BASE}/products`, { headers: getFetchHeaders() })
            .then((r) => r.json())
            .catch(() => JSON.parse(localStorage.getItem("kiosk_menu_cache") || "[]")),
          axios
            .get(
              `${API_BASE}/reservations/${reservationId}/items`,
              getAuthHeader(),
            )
            .then((r) => r.data)
            .catch(() => {
              try {
                return JSON.parse(
                  localStorage.getItem(`kiosk_bill_cache_${activeResId}`) || "null",
                );
              } catch {
                return null;
              }
            }),
          axios
            .get(`${API_BASE}/reservations/${reservationId}`, getAuthHeader())
            .then((r) => r.data)
            .catch(() => null),
        ]);
        if (Array.isArray(prodRes) && prodRes.length > 0) {
          localStorage.setItem("kiosk_menu_cache", JSON.stringify(prodRes));
        }
        if (Array.isArray(resItemsRes)) {
          localStorage.setItem(
            `kiosk_bill_cache_${activeResId}`,
            JSON.stringify(resItemsRes),
          );
        }
        const reservationData = reservationRes
          ? reservationRes.data || reservationRes.reservation || reservationRes
          : null;
        const packageModeFromItems = (resItemsRes || [])
          .map((item) =>
            inferUnlimitedPackageMode(item.item_name || item.menu_name),
          )
          .find(Boolean);
        const packageModeFromReservation =
          inferUnlimitedPackageMode(reservationData?.package_name) ||
          packageModeFromItems;
        if (packageModeFromReservation) {
          setReservedPackageMode(packageModeFromReservation);
        }

        if (reservationData) {
          const targetData = reservationData;
          setReservationDetails(targetData);
          localStorage.setItem(
            `kiosk_reservation_snapshot_${activeResId}`,
            JSON.stringify(targetData),
          );
          const paidAmount = parseFloat(
            targetData.amount || targetData.downpayment || 0,
          );
          storage.setItem(TOTAL_PAID_KEY, paidAmount.toString());
        }

        if (resItemsRes && resItemsRes.length > 0) {
          const enrichedBillItems = enrichOrderItems(resItemsRes, prodRes);
          setBillItems(enrichedBillItems);

          const filteredCartItems = enrichedBillItems.filter((i) => {
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
            filteredCartItems.map((i) => {
              return {
                id: i.item_id,
                name: i.item_name || i.menu_name,
                price: i.item_price || i.price,
                quantity: parseInt(i.qty || i.quantity || 1),
                customizations: i.customizations,
                is_package_included:
                  Boolean(i.is_package_included) ||
                  JSON.stringify(i.customizations || "")
                    .toLowerCase()
                    .includes("[package included]"),
                is_set_included:
                  Boolean(i.is_set_included) ||
                  JSON.stringify(i.customizations || "")
                    .toLowerCase()
                    .includes("[package included]"),
                category: i.category_name,
                category_id: i.category_id,
                is_placed: true,
              };
            }),
          );

          const hasUnlimitedPreBooked = resItemsRes.some((item) =>
            (item.item_name || item.menu_name || "")
              .toLowerCase()
              .includes("unlimited"),
          );
          const currentTimerKey = `kiosk_res_timer_${activeResId}`;
          if (hasUnlimitedPreBooked && !storage.getItem(currentTimerKey)) {
            const prebookedEvent = String(
              reservationData?.reservation_type || reservationData?.reservationType || "",
            ).toLowerCase() === "event";
            const deadline = getReservationEndTimestamp(reservationData);
            const startedAt = Date.now();
            const remainingMs = deadline ? deadline - startedAt : Infinity;
            if (!prebookedEvent || remainingMs > 30 * 60 * 1000) {
              const endTime = Math.min(
                startedAt + 1.5 * 60 * 60 * 1000,
                deadline || Infinity,
              );
              storage.setItem(`kiosk_res_timer_start_${activeResId}`, startedAt.toString());
              storage.setItem(currentTimerKey, endTime.toString());
              setTimeLeft(Math.max(0, Math.ceil((endTime - startedAt) / 1000)));
              setIsTimerRunning(endTime > startedAt);
            }
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
            description: item.description || "",
            category: cat,
            category_id: item.category_id,
            package_inclusions: item.package_inclusions || [],
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
          getDrinkOptions(grouped).map((item) => item.menu_name || item.name),
        );

        const cats = Object.keys(grouped).filter(
          (c) => isKioskCategoryVisible(c, grouped, visibleCategoryIds),
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
    const packageError = validatePackageCart(
      packageOrderItems,
      visiblePackageMode,
      visiblePackageInclusions,
    );
    if (packageError) {
      showToast(packageError, "error");
      return;
    }
    const isPayNow = choice === "Pay Now";

    const pendingItems = cart.filter((i) => !i.is_placed);

    const hasUnlimitedPackage = [...billItems, ...cart].some((item) =>
      Boolean(inferUnlimitedPackageMode(item)),
    ) || isUnlimitedMode;

    const hasPendingUnlimitedPackage = pendingItems.some((item) =>
      Boolean(inferUnlimitedPackageMode(item)),
    );
    const hasExistingUnlimitedPackage = billItems.some((item) =>
      Boolean(inferUnlimitedPackageMode(item)),
    );

    if (
      hasPendingUnlimitedPackage &&
      !hasExistingUnlimitedPackage &&
      isEventReservation &&
      reservationEndTimestamp != null &&
      reservationEndTimestamp - Date.now() <= 30 * 60 * 1000
    ) {
      showToast(
        "Unlimited menus can only be started when more than 30 minutes remain in the reservation.",
        "error",
      );
      return;
    }
    setIsLoading(true);

    try {
      const tableId = getCurrentTableId();
      let submission = { queued: false };
      if (pendingItems.length > 0) {
        submission = await submitKioskOrder(
          {
            reservation_id: reservationId,
            table_id: tableId,
            items: pendingItems.map((i) => ({
              item_id: i.id,
              quantity: i.quantity,
              customizations: i.customizations,
              is_package_included: i.is_package_included,
              is_set_included: i.is_set_included,
            })),
            allergy_note:
              reservationDetails?.allergy ??
              reservationDetails?.allergy_note ??
              null,
          },
          getAuthHeader(),
        );
      }

      if (submission.queued) {
        if (hasUnlimitedPackage && !storage.getItem(TIMER_KEY)) {
          const startedAt = Date.now();
          const normalEndTime = startedAt + 1.5 * 60 * 60 * 1000;
          const endTime = isEventReservation && reservationEndTimestamp != null
            ? Math.min(normalEndTime, reservationEndTimestamp)
            : normalEndTime;
          storage.setItem(TIMER_START_KEY, startedAt.toString());
          storage.setItem(TIMER_KEY, endTime.toString());
          setTimeLeft(Math.max(0, Math.ceil((endTime - startedAt) / 1000)));
          setIsTimerRunning(true);
        }
        setLocalBillHistory((previous) => [
          ...previous,
          ...pendingItems.map((item) => ({
            ...item,
            is_placed: true,
            local_queue_key: submission.idempotencyKey,
          })),
        ]);
        setCart([]);
        resetMenuSelections();
        setIsPaid(false);
        setBillItems((previous) => [
          ...previous,
          ...pendingItems.map((item) => ({ ...item, is_placed: true })),
        ]);
        setIsFinalCheckout(true);
        setShowBillInfo(true);
        showToast(
          "Order saved on this kiosk. It will sync when internet returns; payment was not processed.",
          "info",
        );
        return;
      }

      if (hasUnlimitedPackage && !storage.getItem(TIMER_KEY)) {
        const startedAt = Date.now();
        const normalEndTime = startedAt + 1.5 * 60 * 60 * 1000;
        const endTime = isEventReservation
          ? Math.min(normalEndTime, reservationEndTimestamp)
          : normalEndTime;
        storage.setItem(TIMER_START_KEY, startedAt.toString());
        storage.setItem(TIMER_KEY, endTime.toString());
        setTimeLeft(Math.max(0, Math.ceil((endTime - startedAt) / 1000)));
        setIsTimerRunning(true);
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
      }

      const updatedBillItems = await fetchCurrentBill();

      setCart([]);
      resetMenuSelections();
      if (updatedBillItems) {
        setBillItems(updatedBillItems);
      }
      setIsFinalCheckout(true);
      setShowBillInfo(true);

      if (isPayNow) {
        showToast("Your order has been placed. Thank you!", "success");
      } else {
        showToast("Your order has been placed.", "success");
      }
    } catch (e) {
      console.error("Order submission failed:", e);
      showToast("Order submission failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Called when the 1h30m Unlimited Wings timer reaches 0.
  const handleWingsTimerExpired = async () => {
    // Guard: bail if we're not in either Unlimited mode
    if (!isUnlimitedMode) return;
    await playAlert();

    storage.removeItem(TIMER_KEY);
    storage.removeItem(TIMER_START_KEY);
    setIsTimerRunning(false);
    setTimeLeft(5400);

    setTableKioskMenuMode("default");
    setIsPackageTimerExpired(true);
    setActiveCategory((prev) => (prev === "Unlimited" ? "" : prev));

    showToast(
      "Unlimited Wings time is up. You can keep ordering from the full menu.",
      "info",
    );

    try {
      const tableId = getCurrentTableId();
      if (tableId != null) {
        await axios.post(
          `${API_BASE}/admin/kiosk-mode-expired/${tableId}`,
          {},
          getAuthHeader(),
        );
      }
    } catch (err) {
      console.warn("Could not persist kiosk mode reset:", err?.message);
    }
  };

  const handleEndSession = async () => {
    await playAlert();

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
        TIMER_START_KEY,
        PAYMENT_CHOICE_KEY,
        TOTAL_PAID_KEY,
        LAST_REFILL_KEY,
        RESERVATION_SNAPSHOT_KEY,
        `kiosk_event_warning_${activeResId}`,
        `kiosk_bill_cache_${activeResId}`,
        "kiosk_last_ref_timestamp",
      ].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });

      clearTray();
      setBillItems([]);
      setLocalBillHistory([]);
      setActiveResId(null);

      const searchString = setupTable ? `?setupTable=${setupTable}` : "";
      navigate(`/kiosk-selection/kiosk-reservation${searchString}`);
    } catch (e) {
      localStorage.removeItem("resId");
      clearTray();
      setBillItems([]);
      setActiveResId(null);

      const searchString = setupTable ? `?setupTable=${setupTable}` : "";
      navigate(`/kiosk-selection/kiosk-reservation${searchString}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderPayClick = async () => {
    if (
      isUnlimitedMode
        ? !hasPlacedUnlimitedFlavorOrder
        : placedOrderItems.length === 0
    ) {
      return;
    }
    setIsLoading(true);
    try {
      const currentItems = await fetchCurrentBill();
      const packageError = validatePackageCart(
        [...(currentItems || []), ...cart.filter((item) => !item.is_placed)],
        visiblePackageMode,
        visiblePackageInclusions,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      const due = parseFloat(calculateTotalDue());

      setIsFinalCheckout(true);
      setIsPaid(due <= 0);
      setShowBillInfo(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeResId) return;
    const savedEndTime = Number(storage.getItem(TIMER_KEY));
    if (!Number.isFinite(savedEndTime) || savedEndTime <= 0) return;
    const remaining = Math.max(0, Math.ceil((savedEndTime - Date.now()) / 1000));
    setTimeLeft(remaining);
    setIsTimerRunning(remaining > 0);
  }, [activeResId, TIMER_KEY]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const updateUnlimitedTimer = () => {
      const savedStart = Number(storage.getItem(TIMER_START_KEY));
      const savedEnd = Number(storage.getItem(TIMER_KEY));
      if (!Number.isFinite(savedEnd) || savedEnd <= 0) {
        setIsTimerRunning(false);
        return;
      }

      const startTime = Number.isFinite(savedStart) && savedStart > 0
        ? savedStart
        : savedEnd - 1.5 * 60 * 60 * 1000;
      const packageEnd = startTime + 1.5 * 60 * 60 * 1000;
      const effectiveEnd = isEventReservation && reservationEndTimestamp
        ? Math.min(packageEnd, reservationEndTimestamp)
        : Math.min(packageEnd, savedEnd);
      storage.setItem(TIMER_START_KEY, startTime.toString());
      storage.setItem(TIMER_KEY, effectiveEnd.toString());

      const remaining = Math.max(0, Math.ceil((effectiveEnd - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        setIsTimerRunning(false);
        if (!(isEventReservation && reservationEndTimestamp <= Date.now())) {
          handleWingsTimerExpired();
        }
      }
    };

    updateUnlimitedTimer();
    const interval = setInterval(updateUnlimitedTimer, 1000);
    return () => clearInterval(interval);
  }, [
    isTimerRunning,
    isEventReservation,
    reservationEndTimestamp,
    TIMER_KEY,
    TIMER_START_KEY,
  ]);

  const confirmFlavors = async () => {
    const flavorLimit =
      flavorPackageMode === "unlimited_wings_a"
        ? Math.max(0, 6 - getPackageChickenCount(packageOrderItems, flavorPackageMode))
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
        const refillPayload = {
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
        };
        const submission = await submitKioskOrder(
          refillPayload,
          getAuthHeader(),
        );
        if (submission.queued) {
          storage.setItem(LAST_REFILL_KEY, Date.now().toString());
          setRefillCooldownSeconds(refillCooldown.milliseconds / 1000);
          setLocalBillHistory((previous) => [
            ...previous,
            { ...newItem, is_placed: true, local_queue_key: submission.idempotencyKey },
          ]);
          setShowFlavorModal(false);
          setIsRefillMode(false);
          setShowSessionModal(true);
          showToast("Refill saved offline and will sync when internet returns.", "info");
          return;
        }

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
      const packageError = getUnlimitedPackage(flavorPackageMode)
        ? validatePackageCart(
            [...packageOrderItems, newItem],
            flavorPackageMode,
                      getInclusionsForMode(flavorPackageMode),
          )
        : null;
      if (packageError) {
        setCooldownMessage(packageError);
        return;
      }
      setCart([...cart, newItem]);
      setShowFlavorModal(false);
    }
  };

  const handleItemClick = (item) => {
    if (item?.isStockAvailable === false) {
      showToast(`${item.name || item.menu_name} is currently not available.`, "error");
      return;
    }
    const itemPackageMode = inferUnlimitedPackageMode(item);
    if (isSetItem(item)) {
      if (packageOrderItems.some(isSetItem)) {
        showToast("A set is already in your order.", "error");
        return;
      }
      const inclusions = getPackageInclusions(menuData, "set", item);
      const packageError = validatePackageCart(
        [...packageOrderItems, { ...item, quantity: 1, customizations: null }],
        "set",
        inclusions,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      setCart((current) => [
        ...current,
        {
          ...item,
          price: item.price,
          quantity: 1,
          customizations: null,
          is_refill: false,
          is_package_included: false,
        },
      ]);
      if (inclusions.length > 0) {
        const categories = getPackageCategories(
          menuData,
          "set",
          inclusions,
        );
        setActiveCategory(categories[0] || "");
      }
      return;
    }
    if (
      itemPackageMode &&
      isPackageCardForMode(item, itemPackageMode)
    ) {
      setIsPackageTimerExpired(false);
      if (
        packageOrderItems.some((orderItem) =>
          isPackageCardForMode(orderItem, itemPackageMode),
        )
      ) {
        showToast("This Unlimited package is already in your order.", "error");
        return;
      }
      const packageInclusionsForMode = getInclusionsForMode(
        itemPackageMode,
        item,
      );
      const packageError = validatePackageCart(
        [...packageOrderItems, { ...item, quantity: 1, customizations: null }],
        itemPackageMode,
        packageInclusionsForMode,
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      resetMenuSelections();
      setCart((current) => [
        ...current.filter((orderItem) => !inferUnlimitedPackageMode(orderItem)),
        {
          ...item,
          price: item.price,
          quantity: 1,
          customizations: null,
          is_refill: false,
          is_package_included: false,
        },
      ]);
      const packageCategories = getPackageCategories(
        menuData,
        itemPackageMode,
        packageInclusionsForMode,
      );
      setActiveCategory(
        packageCategories.find((category) => category !== "Unlimited") ||
          packageCategories[0] ||
          "",
      );
      return;
    }
    if (itemPackageMode) setIsPackageTimerExpired(false);
    if (
      isUnlimitedMode &&
      getPackageQuantityLimit(
        packageOrderItems,
        item,
        kioskMenuMode,
        packageInclusions,
      ) < 1
    ) {
      showToast("You have reached this package's selection limit.", "error");
      return;
    }
    if (isUnlimitedMode || itemPackageMode) {
      const packageMode = itemPackageMode || kioskMenuMode;
      const itemPackageInclusions = itemPackageMode
        ? getInclusionsForMode(packageMode, item)
        : packageInclusions;
      if (
        getPackageQuantityLimit(
          packageOrderItems,
          item,
          packageMode,
          itemPackageInclusions,
        ) < 1
      ) {
        showToast("You have reached this package's selection limit.", "error");
        return;
      }

      const isPackageCard = isPackageCardForMode(item, packageMode);
      const packageItemIncluded =
        !isPackageCard &&
        (hasPendingUnlimitedPackage || hasPlacedUnlimitedOrder || isPaid);
      const packageItem = {
        ...item,
        price: packageItemIncluded ? 0 : item.price,
        quantity: 1,
        customizations: packageItemIncluded
          ? "[PACKAGE INCLUDED]"
          : isPackageCard
            ? null
            : item.customizations,
        is_refill: false,
        is_package_included: packageItemIncluded,
      };
      const packageError = validatePackageCart(
        [...packageOrderItems, packageItem],
        packageMode,
        itemPackageInclusions,
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
          packageOrderItems,
          item,
          "set",
          setInclusions,
        ) < 1
      ) {
        showToast(
          "This item is not included in the set or its limit was reached.",
          "error",
        );
        return;
      }
      const setIncludedItem = {
        ...item,
        price: 0,
        quantity: 1,
        customizations: "[PACKAGE INCLUDED]",
        is_refill: false,
        is_package_included: true,
        is_set_included: true,
      };
      const packageError = validatePackageCart(
        [...packageOrderItems, setIncludedItem],
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

    setCart((current) => {
      const existingIndex = current.findIndex(
        (existing) =>
          !existing.is_placed &&
          existing.id === item.id &&
          !existing.customizations,
      );
      if (existingIndex < 0) {
        return [
          ...current,
          { ...item, quantity: 1, customizations: null, is_placed: false },
        ];
      }
      return current.map((existing, index) =>
        index === existingIndex
          ? { ...existing, quantity: existing.quantity + 1 }
          : existing,
      );
    });
  };

  // React to the kiosk mode set by the admin from Table Status.
  // `unlimited_wings_a` / `unlimited_wings_b` → force the Unlimited category.
  useEffect(() => {
    if (!isUnlimitedMode) return;
    const packageCategories = getPackageCategories(
      menuData,
      kioskMenuMode,
      packageInclusions,
    );
    const nextCategory =
      packageCategories.find((category) => category !== "Unlimited") ||
      packageCategories[0] ||
      "";
    if (nextCategory) {
      setActiveCategory((current) =>
        current === nextCategory ? current : nextCategory,
      );
    }

  }, [
    isUnlimitedMode,
    kioskMenuMode,
    menuData,
    TIMER_KEY,
    packageInclusions,
  ]);

  useEffect(() => {
    if (!isUnlimitedMode) return;
    setCart((current) =>
      sanitizePackageCart(current, kioskMenuMode, packageInclusions),
    );
    const allowedCategories = getPackageCategories(
      menuData,
      kioskMenuMode,
      packageInclusions,
    );
    const nextCategory = allowedCategories[0] || "";
    if (activeCategory && !allowedCategories.includes(activeCategory) && nextCategory !== activeCategory) {
      setActiveCategory(nextCategory);
    }
  }, [
    activeCategory,
    isUnlimitedMode,
    kioskMenuMode,
    menuData,
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

  // While an Unlimited order is placed, also block refresh / close / URL-bar
  // navigation so the customer can't reload to escape the lock.
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

  // Instant mode switch via socket

  useEffect(() => {
    const socket = io(BASE_URL, { transports: ["websocket", "polling"] });
    socket.on("kiosk_mode_changed", (payload) => {
      if (
        payload?.tableId != null &&
        String(payload.tableId) === String(resolvedKioskTableId)
      ) {
        setTableKioskMenuMode(payload.kiosk_mode || "default");
      }
    });
    return () => socket.disconnect();
  }, [resolvedKioskTableId]);

  // ==================== LOADING RENDER ====================
  // Only block when we have nothing cached to show; a cached menu paints
  // instantly while the network data refreshes it.
  if ((loading && Object.keys(menuData).length === 0) || kioskMode === "loading") {
    return <div className="loading-container">Loading Menu...</div>;
  }

  // ==================== STANDARD KIOSK ACTIVE VIEW ====================
  return (
    <div className="res-kiosk-container">
      {/* HEADER */}
      <div className="kiosk-timer-wrapper">
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
              <span className="id-label">
                RESERVATION ID
              </span>
              <span className="id-value">
                {reservationId}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: SESSION AND REFILL TIMERS */}
        <div className="header-center-group">
          {(isEventReservation || isTimerRunning) && (
            <div className="d-flex align-items-center gap-2">
              {isEventReservation && (
                <div
                  className="unlimited-timer-pill"
                  style={{
                    border: "2px solid #ffcc00",
                    background: "#111",
                    padding: "5px 18px",
                    borderRadius: "50px",
                    textAlign: "center",
                  }}
                >
                  <span style={{ color: "#ffcc00", fontSize: "10px", fontWeight: "900", display: "block", textTransform: "uppercase" }}>
                    Reservation
                  </span>
                  <span style={{ color: "#fff", fontSize: "22px", fontWeight: "800", fontFamily: "monospace" }}>
                    {formatTime(reservationTimeLeft)}
                  </span>
                </div>
              )}
              {isTimerRunning && (
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
                Time:
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
              )}
            </div>
          )}
        </div>

        {/* RIGHT: VIEW RECEIPT / PAY */}
        <div className="header-right-group">
          {(isUnlimitedMode
            ? hasPlacedUnlimitedOrder
            : placedOrderItems.length > 0) && <button
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
          </button>}
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
                    ((isUnlimitedMode || isSetMode) || isCategoryVisible(cat)) &&
                    ((isUnlimitedMode || isSetMode)
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
                gap: "8px 16px",
                padding: "12px 16px",
                marginBottom: "12px",
                borderBottom: "1px solid rgba(255, 204, 0, 0.35)",
                color: "#fff",
              }}
            >
              <strong>{activePackageLabel}</strong>
              <span>{activePackageSummary}</span>
            </div>
          )}
          <div className="res-grid-container">
            {(isUnlimitedMode || isSetMode
              ? getPackageItems(
                  menuData[activeCategory],
                  activeCategory,
                  visiblePackageMode,
                  visiblePackageInclusions,
                )
              : menuData[activeCategory] || []
            ).map((item) => (
              <div
                key={item.id}
                className="res-food-card"
                onClick={() => handleItemClick(item)}
              >
                <div className="res-card-image-container">
                  <OfflineMenuImage
                    src={item.image}
                    alt={item.name || item.menu_name}
                    className="res-food-img"
                  />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">
                    {item.name || item.menu_name}
                  </h4>
                  <p className="res-food-price">
                    {isSetMode
                      ? "Included with set"
                      : `₱${Number(item.price || 0).toFixed(2)}`}
                  </p>
                  {item.description && (
                    <p className="res-food-description">
                      {item.description}
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
          onRemoveItem={(id) => {
            setCart((prev) => prev.filter((i) => i.id !== id));
          }}
        />
      </div>

      <footer className="res-bottom-bar">
        {!unlimitedSessionLocked &&
          (billItems.length === 0 ||
            hasPendingUnlimitedPackage ||
            (isUnlimitedMode && !hasPlacedUnlimitedOrder)) && (
          <button
            className="res-btn-cancel"
            style={{ marginRight: "auto", background: "#444" }}
            onClick={handleBack}
          >
            <ArrowLeft size={18} className="me-2" /> Back
          </button>
        )}
        <div className="res-action-btns" style={{ marginLeft: "auto" }}>
          <button className="res-btn-cancel" onClick={clearTray}>
            Clear Tray
          </button>
          <button
            className="res-btn-view"
            disabled={
              isLoading ||
              (canRefillUnlimited && refillCooldownSeconds > 0) ||
              (cart.length === 0 &&
                (!canRefillUnlimited || refillCooldownSeconds > 0))
            }
            onClick={() => {
              if (cart.length === 0) {
                handleOrderClick();
                return;
              }
              setIsFinalCheckout(false);
              setShowBillInfo(true);
            }}
          >
            {canRefillUnlimited && refillCooldownSeconds > 0
              ? `Refill in ${formatRefillCooldown(refillCooldownSeconds)}`
              : cart.length === 0 && canRefillUnlimited
                ? "Place Refill"
                : `Place Order (${cart.length})`}
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

                const nameStr = (
                  item.name ||
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
                  return null;
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
                        {item.name || item.item_name || item.menu_name}
                      </span>
                      <small style={{ color: "#888" }}>
                        {isRefill
                          ? "Refill Option"
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
                          setIsPaid(true);

                          await fetchCurrentBill();

                          showToast(
                            "Payment recorded! You can now finish your session.",
                            "success",
                          );
                        } catch (err) {
                          console.error(err);
                          showToast(
                            "Payment processing failed. Please call staff.",
                          );
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      <div style={{ marginRight: "8px" }} /> PAY NOW (₱
                      {calculateTotalDue()})
                    </button>

                    <button
                      className="res-btn-cancel"
                      onClick={() => setShowBillInfo(false)}
                    >
                      Close
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
              ) : isEventReservation ? (
                <>
                  <button
                    className="res-modal-btn-primary"
                    style={{ background: "#ffcc00" }}
                    onClick={() => confirmPaymentChoice("Pay Later")}
                  >
                    CONFIRM ORDER
                  </button>
                  <button
                    className="res-btn-cancel"
                    onClick={() => setShowBillInfo(false)}
                  >
                    CANCEL
                  </button>
                </>
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
                  {((selectedItem?.menu_name || selectedItem?.name || "")
                    .toLowerCase()
                    .includes("ramen")
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
                                      packageOrderItems,
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
                    .filter((drink) =>
                      flavorPackageMode === "unlimited_wings_a" ||
                      !getUnlimitedPackage(flavorPackageMode) ||
                      isJuiceItem({ name: drink, category: "Drinks" }),
                    )
                    .map((d) => (
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
                  is_placed: false,
                },
              ];
            }
            if (!isUnlimitedMode && !isSetMode) return nextCart;
            const packageError = validatePackageCart(
              nextCart,
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
                  6 - getPackageChickenCount(packageOrderItems, kioskMenuMode),
                )
              : Infinity
            : 4
        }
        quantityLimit={
          isUnlimitedMode
            ? getPackageQuantityLimit(
                packageOrderItems,
                selectedItem,
                kioskMenuMode,
                packageInclusions,
              )
            : isSetMode
              ? getPackageQuantityLimit(
                  packageOrderItems,
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

export default KioskReservationMenu;

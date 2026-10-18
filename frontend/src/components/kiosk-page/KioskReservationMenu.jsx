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
import refillCooldown from "../../../../shared/refillCooldown.json";
import { API_BASE, SERVER_URL as BASE_URL } from "../../api";
import io from "socket.io-client";
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
  sanitizePackageCart,
  validatePackageCart,
} from "./unlimitedPackageRules";

const HIDDEN_CATEGORIES = [
  "Chicken Wings",
  "Beverages",
  "Drinks",
  "Chicken",
  "Ramen",
];

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
  const [tableKioskMenuMode, setTableKioskMenuMode] = useState("default");
  const [cart, setCart] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [localBillHistory, setLocalBillHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState(5400);
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
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [reservationDetails, setReservationDetails] = useState(null);
  const [reservedPackageMode, setReservedPackageMode] = useState(null);

  // An Unlimited order counts as "placed" only once it exists in the bill
  // (server-synced) or local bill history — not while it's still sitting in
  // the cart. The back-button lock engages only after that point.
  const hasPlacedUnlimitedOrder = [...billItems, ...localBillHistory].some(
    (item) =>
      (item.name || item.menu_name || item.item_name || "")
        .toLowerCase()
        .includes("unlimited"),
  );
  const hasOrderedUnlimited = [...billItems, ...cart].some((item) =>
    (item.name || item.menu_name || item.item_name || "")
      .toLowerCase()
      .includes("unlimited"),
  );
  const packageOrderItems = [
    ...billItems,
    ...cart.filter((item) => !item.is_placed),
  ];
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
  const packageInclusions = getPackageInclusions(menuData, kioskMenuMode);
    const getInclusionsForMode = (mode) => getPackageInclusions(menuData, mode);
  const flavorPackageMode =
    inferUnlimitedPackageMode(selectedItem) || kioskMenuMode;

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
      PAYMENT_CHOICE_KEY,
      TOTAL_PAID_KEY,
      LAST_REFILL_KEY,
      "kiosk_last_refill_timestamp",
    ].forEach((k) => {
      sessionStorage.removeItem(k);
    });

    sessionStorage.setItem("kiosk_exit_to_selection", "true");
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
      sessionStorage.getItem("tableId") ||
      localStorage.getItem("tableId") ||
      setupTable;
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
              setActiveResId(null);
            }
            setKioskMode("event_waiting");
          } else if (mode === "event_active") {
            const { reservation_id, table_id } = reservation;
            if (activeResId !== reservation_id) {
              sessionStorage.setItem("resId", reservation_id);
              if (table_id)
                sessionStorage.setItem("tableId", table_id.toString());
              setActiveResId(reservation_id);
            }
            setKioskMode("active");
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
  }, [activeResId, reservedPackageMode, setupTable]);

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
        return enrichedItems;
      }
      return res.data;
    } catch (err) {
      console.warn("Error fetching items:", err);
      return [];
    }
  };

  const playAlert = async () => {
    try {
      audioObj.currentTime = 0;
      await audioObj.play();
    } catch (e) {}
  };

  const findUnlimitedItem = () => {
    for (const cat of Object.keys(menuData)) {
      const found = menuData[cat].find((item) => {
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

  const handleOrderClick = async () => {
    const lastRefill = storage.getItem(LAST_REFILL_KEY);
    if (lastRefill) {
      const timeElapsed = Date.now() - parseInt(lastRefill, 10);
      if (timeElapsed < refillCooldown.milliseconds) {
        const remainingSeconds = Math.ceil(
          (refillCooldown.milliseconds - timeElapsed) / 1000,
        );
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

    setIsLoading(true);
    try {
      await axios.post(
        `${API_BASE}/orders/place`,
        {
          reservation_id: reservationId,
          table_id: getCurrentTableId(),
          items: [
            {
              item_id: unlimitedItem.id,
              quantity: 1,
              customizations: "[REFILL]",
              is_refill: true,
            },
          ],
        },
        getAuthHeader(),
      );
      storage.setItem(LAST_REFILL_KEY, Date.now().toString());
      await fetchCurrentBill();
      showToast("Your order has been placed.", "success");
    } catch (e) {
      if (e.response?.data?.error === "Cooldown active") {
        setCooldownMessage(e.response.data.message);
      } else {
        showToast("Order failed.");
      }
    } finally {
      setIsLoading(false);
    }
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
            const endTime = Date.now() + 1.5 * 60 * 60 * 1000;
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
    const packageError = validatePackageCart(
      packageOrderItems,
      kioskMenuMode,
      packageInclusions,
    );
    if (packageError) {
      showToast(packageError, "error");
      return;
    }
    setIsLoading(true);
    const isPayNow = choice === "Pay Now";

    const pendingItems = cart.filter((i) => !i.is_placed);

    const hasUnlimitedPackage = [...billItems, ...cart].some((item) =>
      Boolean(inferUnlimitedPackageMode(item)),
    ) || isUnlimitedMode;

    try {
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
              is_package_included: i.is_package_included,
            })),
          },
          getAuthHeader(),
        );
      }

      if (hasUnlimitedPackage && !storage.getItem(TIMER_KEY)) {
        const endTime = Date.now() + 1.5 * 60 * 60 * 1000;
        storage.setItem(TIMER_KEY, endTime.toString());
        setTimeLeft(5400);
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

      await fetchCurrentBill();

      setCart([]);
      setShowBillInfo(false);

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
        PAYMENT_CHOICE_KEY,
        TOTAL_PAID_KEY,
        LAST_REFILL_KEY,
        "kiosk_last_ref_timestamp",
      ].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });

      setCart([]);
      setBillItems([]);
      setLocalBillHistory([]);
      setActiveResId(null);

      const searchString = setupTable ? `?setupTable=${setupTable}` : "";
      navigate(`/kiosk-selection/kiosk-reservation${searchString}`);
    } catch (e) {
      localStorage.removeItem("resId");
      setCart([]);
      setBillItems([]);
      setActiveResId(null);

      const searchString = setupTable ? `?setupTable=${setupTable}` : "";
      navigate(`/kiosk-selection/kiosk-reservation${searchString}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderPayClick = async () => {
    setIsLoading(true);
    try {
      const currentItems = await fetchCurrentBill();
      const packageError = validatePackageCart(
        [...(currentItems || []), ...cart.filter((item) => !item.is_placed)],
        kioskMenuMode,
        packageInclusions,
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
    if (getUnlimitedPackage(flavorPackageMode) && !isRefillMode && !selectedDrink) {
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
    const itemPackageMode = inferUnlimitedPackageMode(item);
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
    const itemName = (item.menu_name || item.name || "").toLowerCase();
    if (isUnlimitedMode || itemPackageMode) {
      const packageMode = itemPackageMode || kioskMenuMode;
      if (
        getPackageQuantityLimit(
          packageOrderItems,
          item,
          packageMode,
          getInclusionsForMode(packageMode),
        ) < 1
      ) {
        showToast("You have reached this package's selection limit.", "error");
        return;
      }

      const isPackageCard = isPackageCardForMode(item, packageMode);
      const packageItemIncluded =
        !isPackageCard && (hasPlacedUnlimitedOrder || isPaid);
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
        getInclusionsForMode(packageMode),
      );
      if (packageError) {
        showToast(packageError, "error");
        return;
      }
      setCart((current) => [...current, packageItem]);
      return;
    }

    if (itemName.includes("unlimited") || itemName.includes("ramen")) {
      setSelectedItem(item);
      setSelectedFlavors([]);
      setSelectedDrink("");
      setIsRefillMode(false);
      setShowFlavorModal(true);
    } else {
      setSelectedItem({ ...item, category: item.category || "Regular" });
      setIsModalOpen(true);
    }
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
    setActiveCategory(
      packageCategories.find((category) => category !== "Unlimited") ||
        packageCategories[0] ||
        "",
    );

  }, [isUnlimitedMode, kioskMenuMode, menuData, TIMER_KEY]);

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
    if (activeCategory && !allowedCategories.includes(activeCategory)) {
      setActiveCategory(allowedCategories[0] || "");
    }
  }, [activeCategory, isUnlimitedMode, kioskMenuMode, menuData]);

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
        String(payload.tableId) === String(setupTable)
      ) {
        setTableKioskMenuMode(payload.kiosk_mode || "default");
      }
    });
    return () => socket.disconnect();
  }, [setupTable]);

  // ==================== LOADING RENDER ====================
  if (loading || kioskMode === "loading") {
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
        <div className="header-center-group">
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
              <button
                onClick={handleOrderClick}
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
                <ShoppingBag size={18} /> ORDER
              </button>
            </>
          )}
        </div>

        {/* RIGHT: VIEW RECEIPT / PAY */}
        <div className="header-right-group">
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
                .filter((cat) =>
                  isUnlimitedMode
                    ? getPackageCategories(
                        menuData,
                        kioskMenuMode,
                        packageInclusions,
                      ).includes(cat)
                    : !HIDDEN_CATEGORIES.includes(cat) &&
                      !(cat === "Unlimited" && hasOrderedUnlimited),
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
          {isUnlimitedMode && (
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
              <strong>{getUnlimitedPackage(kioskMenuMode)?.label}</strong>
              <span>{getUnlimitedPackage(kioskMenuMode)?.included}</span>
            </div>
          )}
          <div className="res-grid-container">
            {(isUnlimitedMode
              ? getPackageItems(
                  menuData[activeCategory],
                  activeCategory,
                  kioskMenuMode,
                  packageInclusions,
                )
              : menuData[activeCategory] || []
            ).map((item) => (
              <div
                key={item.id}
                className="res-food-card"
                onClick={() => handleItemClick(item)}
              >
                <div className="res-card-image-container">
                  <img
                    src={item.image}
                    alt={item.name || item.menu_name}
                    className="res-food-img"
                  />
                </div>
                <div className="res-card-info">
                  <h4 className="res-food-label">
                    {item.name || item.menu_name}
                  </h4>
                  <p style={{ color: "#ffcc00", fontWeight: "bold" }}>
                    {isUnlimitedMode || inferUnlimitedPackageMode(item)
                      ? "₱0.00"
                      : `₱${parseFloat(item.price).toFixed(2)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <OrderSummary
          cart={cart}
          packageLabel={getUnlimitedPackage(kioskMenuMode)?.label}
          onRemoveItem={(id) => {
            setCart((prev) => prev.filter((i) => i.id !== id));
          }}
        />
      </div>

      <footer className="res-bottom-bar">
        {billItems.length === 0 && !isUnlimitedMode && (
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
                parseFloat(calculateTotalDue()) > 0 && !isEventReservation ? (
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
                {getUnlimitedPackage(flavorPackageMode).label}: {getUnlimitedPackage(flavorPackageMode).included}
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
            if (!isUnlimitedMode) return nextCart;
            const packageError = validatePackageCart(
              nextCart,
              kioskMenuMode,
              packageInclusions,
            );
            if (packageError) {
              showToast(packageError, "error");
              return prevCart;
            }
            const validated = sanitizePackageCart(
              nextCart,
              kioskMenuMode,
              packageInclusions,
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
          isUnlimitedMode
            ? getPackageMenuData(menuData, kioskMenuMode, packageInclusions)
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
            : 20
        }
      />
    </div>
  );
};

export default KioskReservationMenu;

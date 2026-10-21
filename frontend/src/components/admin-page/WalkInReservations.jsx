import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Armchair,
  Clock,
  ReceiptText,
  Plus,
  CalendarCheck,
  Search,
  ShoppingBag,
  CalendarDays,
  UserRound,
  CreditCard,
  Info,
  Trash2,
} from "lucide-react";
import api, { resolveAssetUrl } from "../../api";
import { useToast } from "../ToastContext";
import { useSectionRefresh } from "../shared/sectionRefresh";
import { getReservationStatusMeta } from "../shared/reservationStatus";
import { byNewestFirst } from "../shared/sortUtils";
import AdminPagination from "../shared/AdminPagination";
import PackageMeta, {
  PACKAGE_PRICES,
  EVENT_PACKAGE_LIMITS,
  readPackageName,
} from "../shared/PackageMeta";
import "../../Style/WalkInReservations.css";

// "HH:MM" to minutes since midnight
const toMinutes = (value) => {
  const [h, m] = String(value || "")
    .split(":")
    .map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// Human readable span between two "HH:MM" values, e.g. "3h 30m".
const formatDuration = (start, end) => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return "";
  let mins = e - s;
  // Treat an end time earlier than the start as crossing midnight.
  if (mins <= 0) mins += 24 * 60;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours === 0) return `${rem}m`;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
};

const WalkInReservations = () => {
  const { showToast } = useToast();
  const [inquiries, setInquiries] = useState([]);
  const [rawTables, setRawTables] = useState([]);
  const [tableSchedules, setTableSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const closeBtnRef = useRef(null);

  const getLocalISODate = () => {
    const tzOffset = new Date().getTimezoneOffset() * 60000; // offset in milliseconds
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
  };

  const getTableDisplay = (item) => {
    if (
      item.reservation_type === "event" ||
      item.package_name?.toLowerCase().includes("package")
    ) {
      return "Whole Table Reserved";
    }
    if (
      item.reservation_type === "takeout" ||
      item.package_name?.toLowerCase() === "take-out"
    ) {
      return "Take-Out";
    }
    return item.assigned_tables || "No table assigned";
  };

  // --- STATES FOR MANUALLY PLACING AN ORDER ---
  const [products, setProducts] = useState([]);
  const [orderCart, setOrderCart] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRes, setNewRes] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    date: getLocalISODate(),
    startTime: "",
    endTime: "",
    guests: 1,
    bookingType: "table", // 'table', 'takeout', or 'event'
    packageName: "Regular Table",
    amountPaid: 0,
    paymentMethod: "Cash",
    tableIds: [],
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchWalkIns();
    fetchTables();
    fetchProducts();
  }, []);

  // Reload on the shared admin refresh button in the top bar.
  useSectionRefresh(() => {
    fetchWalkIns();
    fetchTables();
    fetchProducts();
  });

  useEffect(() => {
    return () => {
      const backdrops = document.querySelectorAll(".offcanvas-backdrop");
      backdrops.forEach((el) => el.remove());
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [products]);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchWalkIns = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const filtered = res.data.filter(
        (item) =>
          (item.reservation_id || "").toString().startsWith("WALK-") ||
          (item.reservation_id || "").toString().includes("WALK"),
      );

      setInquiries(
        // Newest walk-in first, by creation/submit time (not the reserved date).
        filtered.slice().sort(
          byNewestFirst((item) => {
            const createdAt = new Date(item?.created_at || 0).getTime();
            return Number.isNaN(createdAt) ? null : createdAt;
          }),
        ),
      );
    } catch (err) {
      console.error("Fetch Walk-ins error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await api.get("/admin/table-status");

      // Fallback searches for direct array, nested data array, or a tables array
      let raw = [];
      if (Array.isArray(res.data)) {
        raw = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        raw = res.data.data;
      } else if (res.data && Array.isArray(res.data.tables)) {
        raw = res.data.tables;
      } else if (res.data && typeof res.data === "object") {
        const foundArray = Object.values(res.data).find((val) =>
          Array.isArray(val),
        );
        if (foundArray) raw = foundArray;
      }

      setRawTables(raw);
    } catch (err) {
      console.error("Error Fetching tables", err);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchSchedules = async () => {
      if (!newRes.date || rawTables.length === 0) {
        setTableSchedules({});
        return;
      }

      const entries = await Promise.all(
        rawTables.map(async (table) => {
          const tableId = table.table_id ?? table.id ?? table.tableId;
          try {
            const response = await api.get("/reservations/table-schedule", {
              params: { tableId, date: newRes.date },
            });
            return [tableId, Array.isArray(response.data) ? response.data : []];
          } catch {
            return [tableId, []];
          }
        }),
      );

      if (!cancelled) setTableSchedules(Object.fromEntries(entries));
    };

    fetchSchedules();
    return () => {
      cancelled = true;
    };
  }, [rawTables, newRes.date]);

  // DYNAMIC COMPUTED STATUS BASED ON LIVE ASSIGNMENT & SELECTED BOOKING DATE
  const availableTables = useMemo(() => {
    const selectedDate = newRes.date; // "YYYY-MM-DD"
    const todayDate = getLocalISODate(); // "YYYY-MM-DD"
    const isToday = selectedDate === todayDate;

    return rawTables.map((t) => {
      const tableId = t.table_id ?? t.id ?? t.tableId;
      const tableNumber =
        t.table_number ??
        t.tableNumber ??
        t.number ??
        t.table_num ??
        t.label ??
        "Unknown";
      const capacity = t.capacity ?? t.seats ?? 2;

      const status = (t.bridge_status || t.status || "available")
        .toString()
        .toLowerCase();
      const tableStatus = String(
        t.table_status || t.status || "available",
      ).toLowerCase();
      const requestedStart = toMinutes(newRes.startTime);
      const requestedEnd = toMinutes(newRes.endTime);
      const reservations = tableSchedules[tableId] || [];
      const isReservedForTime =
        requestedStart !== null &&
        requestedEnd !== null &&
        reservations.some((reservation) => {
          const reservedStart = toMinutes(reservation.startTime);
          const reservedEnd = toMinutes(reservation.endTime);
          return (
            reservedStart !== null &&
            reservedEnd !== null &&
            requestedStart < reservedEnd &&
            requestedEnd > reservedStart
          );
        });
      const isOccupiedNow =
        isToday &&
        (tableStatus === "occupied" ||
          tableStatus === "busy" ||
          status === "seated");
      const hasSelectedTime = requestedStart !== null && requestedEnd !== null;
      const isOccupied =
        isOccupiedNow &&
        (!hasSelectedTime || reservations.length === 0 || isReservedForTime);
      const isUnavailable = isOccupied || isReservedForTime;
      const availabilityLabel = isOccupied
        ? "Occupied"
        : isReservedForTime
          ? "Reserved"
          : "";

      return {
        table_id: tableId,
        table_number: availabilityLabel
          ? `${tableNumber} (${availabilityLabel})`
          : tableNumber,
        capacity: capacity,
        isOccupied: isOccupied,
        isUnavailable,
      };
    });
  }, [
    rawTables,
    newRes.date,
    newRes.startTime,
    newRes.endTime,
    tableSchedules,
  ]);

  const formatTime = (timeStr) => {
    if (!timeStr) return "--:--";

    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${hours}:${minutes} ${ampm}`;
  };

  // --- HANDLERS FOR MANUALLY ADDING DISHES ---
  const getProductImageUrl = (product, path) => {
    const imagePath =
      path || product.local_path || product.image_url || product.image;
    if (!imagePath) return "";
    if (
      !imagePath.startsWith("/") &&
      !/^https?:|^data:|^blob:/i.test(imagePath)
    ) {
      return resolveAssetUrl(`/uploads/${imagePath}`);
    }
    return resolveAssetUrl(imagePath);
  };

  const handleAddProductToCart = (product) => {
    setOrderCart((prev) => {
      const exists = prev.find((item) => item.product_id === product.item_id);
      if (exists) {
        return prev.map((item) =>
          item.product_id === product.item_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          product_id: product.item_id,
          name: product.menu_name || product.name,
          price: parseFloat(product.price),
          image: getProductImageUrl(product, product.local_path),
          fallbackImage: getProductImageUrl(product, product.image_url),
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateCartQty = (productId, delta) => {
    setOrderCart((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  // --- HANDLERS FOR NEW RESERVATION ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // 1. Guests Validation (Caps at 35, no letters)
    if (name === "guests") {
      let val = value.replace(/\D/g, ""); // Remove non-numbers
      if (val !== "") {
        const num = parseInt(val, 10);
        if (num > 35) val = "35";
      }
      setNewRes((prev) => ({ ...prev, guests: val }));
      return;
    }

    // 2. Phone Number Validation (11 digits, starts with 09)
    if (name === "phone") {
      let val = value.replace(/\D/g, "");
      if (!val.startsWith("09")) val = "09";
      if (val.length <= 11) {
        setNewRes((prev) => ({ ...prev, phone: val }));
      }
      return;
    }

    // 3. First Name & Last Name Validation (Letters and spaces only)
    if (name === "firstName" || name === "lastName") {
      // Replace anything that is NOT a letter (a-z, A-Z) or a space with nothing
      const sanitizedValue = value.replace(/[^a-zA-Z\s]/g, "");
      setNewRes((prev) => ({ ...prev, [name]: sanitizedValue }));
      return;
    }

    // 4. Email Validation (Alphanumeric + @ . _ -)
    if (name === "email") {
      // Allow only letters, numbers, and @ . _ -
      const sanitizedEmail = value.replace(/[^a-zA-Z0-9@._-]/g, "");
      setNewRes((prev) => ({ ...prev, email: sanitizedEmail }));
      return;
    }

    // ... The rest of your existing logic (bookingType, startTime, etc.) ...
    if (name === "bookingType") {
      let defaultPackage = "Regular Table";
      if (value === "event") {
        defaultPackage = "Standard Package";
      } else if (value === "takeout") {
        defaultPackage = "Take-Out";
      }
      if (value !== "takeout") setOrderCart([]);
      setNewRes((prev) => ({
        ...prev,
        bookingType: value,
        packageName: defaultPackage,
        tableIds: value === "takeout" ? ["takeout"] : [],
        ...(value === "takeout" ? { firstName: "", lastName: "" } : {}),
      }));
    } else if (name === "tableIds") {
      setNewRes((prev) => ({ ...prev, tableIds: value ? [value] : [] }));
    } else if (name === "startTime") {
      setNewRes((prev) => ({
        ...prev,
        startTime: value,
        endTime: prev.endTime && prev.endTime <= value ? "" : prev.endTime,
      }));
    } else {
      setNewRes((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddReservation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isTakeout = newRes.bookingType === "takeout";
      if (newRes.bookingType === "table") {
        const selectedTableId = Number(newRes.tableIds[0]);
        const selectedTable = availableTables.find(
          (table) => Number(table.table_id) === selectedTableId,
        );
        if (!selectedTable || selectedTable.isUnavailable) {
          showToast("Please select an available table.");
          setSubmitting(false);
          return;
        }
      }

      // The end time drives the event countdown and when tables free up, so
      // it has to be present and after the start.
      if (
        !newRes.date ||
        (!isTakeout && !newRes.startTime) ||
        (!isTakeout && !newRes.endTime)
      ) {
        showToast(
          isTakeout
            ? "Please set the pickup date."
            : "Please set both a start and end time.",
        );
        setSubmitting(false);
        return;
      }
      const startMins = toMinutes(newRes.startTime);
      const endMins = isTakeout
        ? startMins === null
          ? null
          : startMins + 60
        : toMinutes(newRes.endTime);
      if (
        (!isTakeout && startMins === null) ||
        (!isTakeout && endMins === null)
      ) {
        showToast("Please enter valid reservation times.");
        setSubmitting(false);
        return;
      }
      if (!isTakeout && endMins <= startMins) {
        showToast("The end time must be after the start time.");
        setSubmitting(false);
        return;
      }

      const packagePrice = PACKAGE_PRICES[newRes.packageName] || 0;
      const addOnTotal = orderCart.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 1),
        0,
      );
      const totalBill = packagePrice + addOnTotal;
      const amountPaid = Math.min(
        Math.max(Number(newRes.amountPaid || 0), 0),
        totalBill,
      );

      const payload = {
        ...newRes,
        // The database requires a time even though take-out only collects a date.
        startTime: isTakeout ? "00:00" : newRes.startTime,
        firstName:
          isTakeout && !newRes.firstName.trim()
            ? "Guest"
            : newRes.firstName.trim(),
        lastName: isTakeout ? "" : newRes.lastName,
        endTime: isTakeout ? "" : newRes.endTime,
        durationHours: isTakeout
          ? 1
          : (endMins - startMins) / 60 > 0
            ? (endMins - startMins) / 60
            : (endMins + 24 * 60 - startMins) / 60,
        totalAmount: totalBill,
        downpayment: amountPaid,
        amount: amountPaid,
        reservationType:
          newRes.bookingType === "table" ? "per_table" : newRes.bookingType,
        isWalkin: true,
        tableIds:
          newRes.bookingType === "table"
            ? JSON.stringify(newRes.tableIds || [])
            : [],
        selectedItems: JSON.stringify(orderCart),
      };

      await api.post("/reservations", payload);

      showToast("Manual Order Created Successfully!", "success");

      if (closeBtnRef.current) closeBtnRef.current.click();
      setShowAddModal(false);
      setOrderCart([]);
      fetchWalkIns();
    } catch (err) {
      console.error(err);
      showToast("Error creating order.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter controls.
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const resetPage = () => setCurrentPage(1);

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
    resetPage();
  };

  const todayString = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const hasActiveFilters = statusFilter !== "all" || dateFilter !== "all";

  const filteredInquiries = inquiries.filter((item) => {
    const fullName =
      `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase();
    const resId = (item.reservation_id || "").toLowerCase();
    const term = searchQuery.toLowerCase();
    if (term && !(fullName.includes(term) || resId.includes(term))) {
      return false;
    }

    if (statusFilter !== "all") {
      const s = (item.status || "").toLowerCase();
      if (s !== statusFilter) return false;
    }

    if (dateFilter !== "all") {
      const d = String(item.reservation_date || "").slice(0, 10);
      if (dateFilter === "today" && d !== todayString) return false;
      if (dateFilter === "upcoming" && (d === "" || d < todayString))
        return false;
      if (dateFilter === "past" && d >= todayString) return false;
    }

    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInquiries.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage);

  // The timeline must reflect the real customer/order status. A completed or
  // cancelled walk-in used to fall through to a hardcoded "Active".
  const walkInTimelineLabel = (() => {
    const status = String(
      selectedRes?.order_status || selectedRes?.status || "",
    ).toLowerCase();
    if (status === "completed") return "Completed";
    if (status === "cancelled" || status === "canceled") return "Cancelled";
    if (status === "no_show") return "No-Show";
    return "Active";
  })();

  // An event booking and a per-table booking are different products, so the
  // drawer derives them explicitly instead of inferring one from the other.
  const walkInIsEvent = (() => {
    const type = String(
      selectedRes?.reservation_type || selectedRes?.reservationType || "",
    ).toLowerCase();
    if (type === "event" || type === "event_a" || type === "event_b")
      return true;
    // Fall back to the package name so older rows that lost their type still
    // resolve to the correct branch.
    return readPackageName(selectedRes) in EVENT_PACKAGE_LIMITS;
  })();
  const walkInIsTakeout =
    String(
      selectedRes?.reservation_type || selectedRes?.reservationType || "",
    ).toLowerCase() === "takeout";

  // The quoted event limit (₱10,000 or ₱12,500), shown as package information.
  const walkInEventLimit = walkInIsEvent
    ? (EVENT_PACKAGE_LIMITS[readPackageName(selectedRes)] ?? 0)
    : 0;

  const walkInTableLabel =
    selectedRes?.assigned_tables ||
    selectedRes?.table_number ||
    selectedRes?.table_names ||
    "";
  const takeoutSubtotal = orderCart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );
  const takeoutAmountTendered = Math.max(Number(newRes.amountPaid || 0), 0);
  const takeoutChange = Math.max(takeoutAmountTendered - takeoutSubtotal, 0);

  if (loading)
    return (
      <div className="p-5 text-center">
        <div className="spinner-border text-primary"></div>
      </div>
    );

  return (
    <div
      className="container-fluid py-4 text-dark bg-light"
      style={{ minHeight: "100vh" }}
    >
      {/* HEADER */}
      <div className="admin-page-header row align-items-center mb-3 px-2">
        <div className="col-12">
          <h2 className="fw-bold mb-1">Walk-In Reservations & Kiosk</h2>
          <p className="text-muted small mb-0">
            Monitor direct walk-in transactions and on-site customers
          </p>
        </div>
      </div>

      {/* SEARCH + FILTERS + ACTION (same row, aligned like Inventory) */}
      <div className="admin-toolbar row g-2 align-items-center mb-3 px-2">
        <div className="col-12 col-xl-5">
          <div className="admin-search d-flex align-items-center bg-white rounded-3 border shadow-sm px-3">
            <Search size={20} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              style={{
                color: "#212529",
                fontSize: "16px",
                fontWeight: "500",
                height: "100%",
              }}
              placeholder="Search by guest name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="d-flex flex-wrap gap-2 align-items-center admin-filter-bar">
            <button
              className="btn btn-primary admin-toolbar-button fw-bold shadow-sm d-inline-flex align-items-center justify-content-center"
              data-bs-toggle="offcanvas"
              data-bs-target="#addReservationDrawer"
              onClick={() => {
                setNewRes((prev) => ({
                  ...prev,
                  bookingType: "table",
                  packageName: "Regular Table",
                  tableIds: [],
                }));
                setOrderCart([]);
              }}
            >
              <Plus size={18} className="me-1 flex-shrink-0" /> Make a
              Reservation
            </button>
            <select
              className="form-select form-select-sm admin-filter-select"
              aria-label="Filter by date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                resetPage();
              }}
            >
              <option value="all">Any date</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>

            <select
              className="form-select form-select-sm admin-filter-select"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                resetPage();
              }}
            >
              <option value="all">Any status</option>
              <option value="seated">Seated</option>
              <option value="completed">Completed</option>
            </select>

            {hasActiveFilters && (
              // Same "Clear Filter" pattern used by Online Bookings so the two
              // pages feel identical.
              <button
                className="btn btn-sm btn-link text-decoration-none px-0 admin-clear-filter"
                onClick={clearFilters}
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE (DESKTOP ONLY) */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2 d-none d-md-block">
        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ minWidth: "900px" }}
          >
            <thead className="bg-light border-bottom">
              <tr
                className="text-muted small text-uppercase"
                style={{ fontSize: "0.7rem", letterSpacing: "0.8px" }}
              >
                <th className="ps-4">Guest & ID</th>
                <th>Table</th>
                <th>Date</th>
                <th className="text-center">Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.reservation_id}>
                  <td className="ps-4 py-3">
                    <div className="fw-bold text-dark">
                      {item.first_name} {item.last_name || ""}
                    </div>
                    <code className="text-muted" style={{ fontSize: "0.6rem" }}>
                      {item.reservation_id}
                    </code>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Armchair size={14} className="text-muted" />
                      <span className="small fw-bold">
                        {getTableDisplay(item)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="fw-bold small">
                      {new Date(item.reservation_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="text-center">
                    <span
                      className={`badge rounded-pill px-3 py-1 small ${getReservationStatusMeta(item.status, { walkIn: true }).className}`}
                    >
                      {
                        getReservationStatusMeta(item.status, { walkIn: true })
                          .label
                      }
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-dark fw-bold px-3 py-1 shadow-sm"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#walkinDetailsDrawer"
                      onClick={() => {
                        setSelectedRes(item);
                      }}
                    >
                      View Reservation
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARD LIST */}
      <div className="d-md-none px-2">
        {currentItems.length === 0 ? (
          <div className="text-center text-muted small py-5">
            No walk-in reservations found.
          </div>
        ) : (
          currentItems.map((item) => (
            <div
              key={item.reservation_id}
              className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden"
            >
              <div className="card-body p-3">
                {/* Name sits above, status below it. The name is the primary
                    label so it gets the stronger type; the status reads as
                    supporting information underneath. */}
                <div className="mb-2">
                  <div
                    className="fw-bold text-dark walkin-name"
                    style={{ fontSize: "1.1rem" }}
                  >
                    {item.first_name} {item.last_name || ""}
                  </div>
                  <code className="text-muted" style={{ fontSize: "0.6rem" }}>
                    {item.reservation_id}
                  </code>
                  <div className="mt-2">
                    <span
                      className={`badge rounded-pill px-3 py-1 small ${getReservationStatusMeta(item.status, { walkIn: true }).className}`}
                    >
                      {
                        getReservationStatusMeta(item.status, { walkIn: true })
                          .label
                      }
                    </span>
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 small text-muted mb-3">
                  <span className="d-flex align-items-center gap-1">
                    <Armchair size={13} />
                    {getTableDisplay(item)}
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <Clock size={13} />
                    {new Date(item.reservation_date).toLocaleDateString()}
                  </span>
                </div>

                <button
                  className="btn btn-sm btn-dark fw-bold px-3 py-1 shadow-sm w-100"
                  data-bs-toggle="offcanvas"
                  data-bs-target="#walkinDetailsDrawer"
                  onClick={() => {
                    setSelectedRes(item);
                  }}
                >
                  View Reservation
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- ADD RESERVATION SIDEBAR --- */}
      <div
        className="offcanvas border-0 shadow-lg reservation-modal-panel walkin-reservation-panel"
        tabIndex="-1"
        id="addReservationDrawer"
        style={{
          width: "min(100%, 980px)",
          maxWidth: "calc(100vw - 32px)",
          height: "min(86vh, 820px)",
          maxHeight: "86vh",
          top: "50%",
          left: "50%",
          right: "auto",
          bottom: "auto",
          transform: "translate(-50%, -50%)",
          borderRadius: "18px",
          overflow: "hidden",
        }}
      >
        <div className="offcanvas-header border-bottom bg-dark text-white">
          <div>
            <h5 className="fw-bold m-0 d-flex align-items-center">
              {newRes.bookingType === "takeout" ? (
                <ShoppingBag size={20} className="me-2 text-warning" />
              ) : (
                <CalendarCheck size={20} className="me-2 text-warning" />
              )}
              {newRes.bookingType === "takeout"
                ? "Create Take-Out Order"
                : "Create Reservation"}
            </h5>
            <small className="text-white-50 ms-4">
              {newRes.bookingType === "takeout"
                ? "Set the order, payment, and pickup details."
                : "Set the table, order, and payment details."}
            </small>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white shadow-none"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
          ></button>
        </div>

        <div className="offcanvas-body p-0 bg-light">
          <form
            onSubmit={handleAddReservation}
            className="d-flex flex-column h-100 walkin-reservation-form"
          >
            <div className="p-4 flex-grow-1 overflow-auto walkin-reservation-body">
              <div className="mb-3">
                <label className="form-label small fw-bold">
                  Reservation Type
                </label>
                <select
                  name="bookingType"
                  className="form-select fw-bold border-primary"
                  value={newRes.bookingType}
                  onChange={handleInputChange}
                >
                  <option value="table">Per Table (Dining)</option>
                  <option value="takeout">Take-Out (To-Go)</option>
                  <option value="event">Special Event</option>
                </select>
              </div>
              {newRes.bookingType === "takeout" ? (
                <>
                  <p className="x-small fw-bold text-primary text-uppercase mb-3 walkin-section-heading">
                    Order Details
                  </p>
                  <div className="walkin-takeout-layout">
                    <section className="walkin-takeout-items">
                      <div className="walkin-takeout-card">
                        <label className="form-label small fw-bold">
                          Order Items
                        </label>
                        <select
                          className="form-select walkin-add-product-select"
                          value=""
                          onChange={(e) => {
                            const selectedId = Number(e.target.value);
                            const found = products.find(
                              (product) =>
                                Number(product.item_id) === selectedId,
                            );
                            if (found) handleAddProductToCart(found);
                            e.target.value = "";
                          }}
                        >
                          <option value="">＋　Add food or drink</option>
                          {products.map((product) => (
                            <option
                              key={product.item_id}
                              value={product.item_id}
                            >
                              {product.menu_name || product.name} (₱
                              {Number(product.price || 0).toFixed(2)})
                            </option>
                          ))}
                        </select>

                        <div className="walkin-selected-items-heading">
                          Selected Items ({orderCart.length})
                        </div>
                        {orderCart.length > 0 ? (
                          <div className="walkin-takeout-item-list">
                            {orderCart.map((item) => (
                              <div
                                className="walkin-takeout-item"
                                key={item.product_id}
                              >
                                {item.image ? (
                                  <div className="walkin-takeout-image-wrap">
                                    <img
                                      src={item.image}
                                      alt=""
                                      className="walkin-takeout-item-image"
                                      onError={(event) => {
                                        const image = event.currentTarget;
                                        const fallback = image.dataset.fallback;
                                        if (
                                          fallback &&
                                          image.src !== fallback
                                        ) {
                                          image.dataset.fallback = "";
                                          image.src = fallback;
                                          return;
                                        }
                                        image.style.display = "none";
                                        image.parentElement.querySelector(
                                          ".walkin-takeout-item-placeholder",
                                        ).style.display = "grid";
                                      }}
                                      data-fallback={item.fallbackImage}
                                    />
                                    <div className="walkin-takeout-item-image walkin-takeout-item-placeholder">
                                      <ShoppingBag size={18} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="walkin-takeout-item-image walkin-takeout-item-placeholder">
                                    <ShoppingBag size={18} />
                                  </div>
                                )}
                                <div className="walkin-takeout-item-name">
                                  <strong>{item.name}</strong>
                                  <small>Regular</small>
                                </div>
                                <strong className="walkin-takeout-item-price">
                                  ₱{Number(item.price || 0).toFixed(2)}
                                </strong>
                                <div className="walkin-quantity-control">
                                  <button
                                    type="button"
                                    aria-label={`Remove one ${item.name}`}
                                    onClick={() =>
                                      handleUpdateCartQty(item.product_id, -1)
                                    }
                                  >
                                    −
                                  </button>
                                  <span>{item.quantity}</span>
                                  <button
                                    type="button"
                                    aria-label={`Add one ${item.name}`}
                                    onClick={() =>
                                      handleUpdateCartQty(item.product_id, 1)
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className="walkin-remove-item"
                                  aria-label={`Remove ${item.name}`}
                                  onClick={() =>
                                    handleUpdateCartQty(
                                      item.product_id,
                                      -item.quantity,
                                    )
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="walkin-empty-items">
                            No items added yet. Choose food or drinks above.
                          </p>
                        )}
                      </div>

                      <div className="walkin-takeout-card walkin-takeout-total">
                        <div className="walkin-total-row">
                          <span>Subtotal</span>
                          <strong>₱{takeoutSubtotal.toFixed(2)}</strong>
                        </div>
                        <div className="walkin-total-row">
                          <span>Add-ons</span>
                          <strong>₱0.00</strong>
                        </div>
                        <div className="walkin-total-row walkin-grand-total">
                          <strong>Total Bill</strong>
                          <strong>₱{takeoutSubtotal.toFixed(2)}</strong>
                        </div>
                      </div>
                    </section>

                    <section className="walkin-takeout-details">
                      <div className="walkin-takeout-card">
                        <label className="form-label small fw-bold">Date</label>
                        <div className="walkin-input-with-icon">
                          <CalendarDays size={17} />
                          <input
                            type="date"
                            name="date"
                            className="form-control"
                            value={newRes.date}
                            onChange={handleInputChange}
                            onKeyDown={(e) => e.preventDefault()}
                            onPaste={(e) => e.preventDefault()}
                            required
                          />
                        </div>
                      </div>

                      <div className="walkin-takeout-card">
                        <label className="form-label small fw-bold">
                          Customer Name <span>(Optional)</span>
                        </label>
                        <div className="walkin-input-with-icon">
                          <UserRound size={17} />
                          <input
                            type="text"
                            name="firstName"
                            className="form-control"
                            placeholder="Enter customer name"
                            value={newRes.firstName}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div className="walkin-takeout-card">
                        <label className="form-label small fw-bold">
                          Payment Method
                        </label>
                        <div className="walkin-input-with-icon">
                          <CreditCard size={17} />
                          <select
                            name="paymentMethod"
                            className="form-select"
                            value={newRes.paymentMethod}
                            onChange={handleInputChange}
                          >
                            <option value="Cash">Cash (Paid at Counter)</option>
                            <option value="GCash">GCash</option>
                          </select>
                        </div>
                      </div>

                      <div className="walkin-takeout-card">
                        <label className="form-label small fw-bold">
                          Amount Paid
                        </label>
                        <div className="walkin-input-with-icon">
                          <input
                            type="number"
                            name="amountPaid"
                            min="0"
                            step="0.01"
                            className="form-control"
                            value={newRes.amountPaid}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="walkin-change-row">
                          <strong>Change</strong>
                          <strong>₱{takeoutChange.toFixed(2)}</strong>
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <>
                  {/* SECTION: CUSTOMER */}
                  <p className="x-small fw-bold text-primary text-uppercase mb-3 border-bottom pb-2">
                    Customer Information
                  </p>
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        className="form-control form-control-sm"
                        value={newRes.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        className="form-control form-control-sm"
                        value={newRes.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Email</label>
                      <input
                        type="text"
                        name="email"
                        className="form-control form-control-sm"
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="phone"
                        className="form-control form-control-sm"
                        placeholder="09XXXXXXXXX"
                        maxLength={11}
                        value={newRes.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <hr />

                  {/* SECTION: BOOKING DETAILS */}
                  <p className="x-small fw-bold text-primary text-uppercase mb-3 border-bottom pb-2">
                    Booking Details
                  </p>

                  <div className="walkin-booking-grid">
                    <div className="mb-3 walkin-booking-field">
                      <label className="form-label small fw-bold">Guests</label>
                      <input
                        type="number"
                        name="guests"
                        className="form-control"
                        min="1"
                        max="35"
                        step="1"
                        value={newRes.guests}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (["e", "E", "+", "-"].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        required
                      />
                    </div>

                    <div className="mb-3 walkin-booking-field">
                      <label className="form-label small fw-bold">
                        Payment Method
                      </label>
                      <select
                        name="paymentMethod"
                        className="form-select"
                        value={newRes.paymentMethod}
                        onChange={handleInputChange}
                      >
                        <option value="Cash">Cash (Paid at Counter)</option>
                        <option value="GCash">GCash</option>
                      </select>
                      <div className="x-small text-muted mt-1 italic">
                        * Manual entries are automatically verified.
                      </div>
                    </div>

                    <div className="mb-3 walkin-booking-field">
                      <label className="form-label small fw-bold">Date</label>
                      <input
                        type="date"
                        name="date"
                        className="form-control"
                        value={newRes.date}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        required
                      />
                    </div>

                    {/* Take-Out Info Banner */}
                    {newRes.bookingType === "takeout" && (
                      <div className="mb-3 p-3 bg-success-subtle rounded-3 border border-success-subtle animate-fade-in walkin-booking-wide">
                        <div className="x-small text-success-emphasis fw-bold">
                          ✓ Take-Out Order Selected
                        </div>
                        <div className="x-small text-muted mt-1">
                          No physical tables will be marked as occupied for this
                          session.
                        </div>
                      </div>
                    )}

                    {newRes.bookingType === "table" && (
                      <div className="mb-3 walkin-booking-field">
                        <label className="form-label small fw-bold">
                          Select Table
                        </label>
                        <select
                          name="tableIds"
                          className="form-select form-select-sm"
                          value={newRes.tableIds[0] || ""}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">
                            -- Select an available table --
                          </option>
                          {availableTables
                            .filter(
                              (table) =>
                                Number.isInteger(Number(table.table_id)) &&
                                Number(table.table_id) > 0,
                            )
                            .map((table) => (
                              <option
                                key={table.table_id}
                                value={table.table_id}
                                disabled={table.isUnavailable}
                              >
                                Table {table.table_number}
                                {table.capacity
                                  ? ` (${table.capacity} seats)`
                                  : ""}
                              </option>
                            ))}
                        </select>
                        {availableTables.length === 0 && (
                          <div className="form-text text-danger">
                            No tables are available to select.
                          </div>
                        )}
                      </div>
                    )}

                    {/* DYNAMIC FOOD & DRINK SELECTOR */}
                    {newRes.bookingType === "takeout" && (
                      <div className="mb-4 animate-fade-in walkin-booking-wide">
                        <label className="form-label small fw-bold text-uppercase text-muted">
                          Order Items{" "}
                          <span className="fw-normal">(optional)</span>
                        </label>
                        <select
                          className="form-select form-select-sm fw-semibold mb-2"
                          value=""
                          onChange={(e) => {
                            const selectedId = parseInt(e.target.value, 10);
                            const found = products.find(
                              (p) => p.item_id === selectedId,
                            );
                            if (found) handleAddProductToCart(found);
                            e.target.value = "";
                          }}
                        >
                          <option value="">-- Add food or drink --</option>
                          {products.map((p) => (
                            <option key={p.item_id} value={p.item_id}>
                              {p.menu_name || p.name} (₱
                              {parseFloat(p.price).toFixed(2)})
                            </option>
                          ))}
                        </select>

                        {/* Selected Items Tray List */}
                        {orderCart.length > 0 && (
                          <div
                            className="p-3 bg-white border rounded-3 mb-3"
                            style={{ maxHeight: "150px", overflowY: "auto" }}
                          >
                            {orderCart.map((item) => (
                              <div
                                key={item.product_id}
                                className="d-flex justify-content-between align-items-center mb-2 small fw-semibold"
                              >
                                <span className="text-dark-emphasis">
                                  {item.name}
                                </span>
                                <div className="d-flex align-items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCartQty(item.product_id, -1)
                                    }
                                    className="btn btn-light btn-sm border py-0 px-2 fw-bold"
                                  >
                                    -
                                  </button>
                                  <span className="font-monospace">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCartQty(item.product_id, 1)
                                    }
                                    className="btn btn-light btn-sm border py-0 px-2 fw-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {newRes.bookingType === "event" && (
                      <div className="mb-3 p-3 bg-warning-subtle rounded-3 border border-warning-subtle animate-fade-in walkin-booking-wide">
                        <label className="form-label small fw-bold text-warning-emphasis">
                          Reservation Package
                        </label>
                        <div className="row g-2 mb-2">
                          {[
                            {
                              name: "Standard Package",
                              price: 10000,
                              label: "Standard",
                            },
                            {
                              name: "Premium Package",
                              price: 12500,
                              label: "Premium",
                            },
                          ].map((option) => (
                            <div className="col-12 col-sm-6" key={option.name}>
                              <button
                                type="button"
                                className={`w-100 text-start p-2 rounded-3 ${newRes.packageName === option.name ? "border border-2 border-warning bg-warning-subtle" : "border bg-white"}`}
                                onClick={() =>
                                  setNewRes((prev) => ({
                                    ...prev,
                                    packageName: option.name,
                                  }))
                                }
                              >
                                <span className="d-block fw-bold small">
                                  {option.label}
                                </span>
                                <span className="d-block text-muted small">
                                  {option.price
                                    ? `₱${option.price.toLocaleString()}`
                                    : "Base menu only"}
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="x-small text-muted mb-2">
                          Standard: ₱10,000 · Premium: ₱12,500
                        </div>
                        {newRes.bookingType === "event" && (
                          <div className="x-small text-muted">
                            Event packages reserve the full venue automatically.
                          </div>
                        )}
                      </div>
                    )}

                    {newRes.bookingType !== "table" &&
                      (() => {
                        const packagePrice =
                          PACKAGE_PRICES[newRes.packageName] || 0;
                        const addOnTotal = orderCart.reduce(
                          (sum, item) =>
                            sum +
                            Number(item.price || 0) *
                              Number(item.quantity || 1),
                          0,
                        );
                        const totalBill = packagePrice + addOnTotal;
                        const paid = Math.min(
                          Math.max(Number(newRes.amountPaid || 0), 0),
                          totalBill,
                        );
                        return (
                          <div className="p-3 mb-4 bg-white border rounded-3 shadow-sm walkin-booking-wide">
                            {newRes.bookingType === "event" && (
                              <div className="d-flex justify-content-between small mb-1">
                                <span className="text-muted">Package</span>
                                <strong>
                                  ₱
                                  {packagePrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </strong>
                              </div>
                            )}
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Add-ons</span>
                              <strong>
                                ₱
                                {addOnTotal.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                            </div>
                            <div className="d-flex justify-content-between border-top pt-2 mb-2">
                              <strong>Total Bill</strong>
                              <strong>
                                ₱
                                {totalBill.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                            </div>
                            <label className="form-label small fw-bold mb-1">
                              Amount Paid
                            </label>
                            <input
                              type="number"
                              name="amountPaid"
                              min="0"
                              max={totalBill}
                              step="0.01"
                              className="form-control form-control-sm mb-2"
                              value={newRes.amountPaid}
                              onChange={handleInputChange}
                            />
                            <div className="d-flex justify-content-between small">
                              <span className="text-muted">
                                Remaining Balance
                              </span>
                              <strong
                                className={
                                  totalBill - paid > 0
                                    ? "text-danger"
                                    : "text-success"
                                }
                              >
                                ₱
                                {(totalBill - paid).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}

                    <div className="mb-3 walkin-booking-field">
                      <label className="form-label small fw-bold">
                        Start Time
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        className="form-control"
                        value={newRes.startTime || ""}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        required
                      />
                    </div>
                    <div className="mb-3 walkin-booking-field">
                      <label className="form-label small fw-bold">
                        End Time
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        className="form-control"
                        min={newRes.startTime || undefined}
                        value={newRes.endTime || ""}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.preventDefault()}
                        required
                      />
                      <div className="form-text" style={{ fontSize: "0.7rem" }}>
                        {newRes.startTime && newRes.endTime
                          ? `Duration: ${formatDuration(newRes.startTime, newRes.endTime)}`
                          : "Used for the event timer and table release."}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 bg-white border-top mt-auto walkin-reservation-footer">
              <button
                type="submit"
                className="btn btn-primary py-2 fw-bold shadow-sm walkin-confirm-button"
                disabled={submitting}
              >
                {submitting
                  ? "Creating..."
                  : newRes.bookingType === "takeout"
                    ? "Confirm Take-Out"
                    : "Confirm Reservation"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-2 fw-bold walkin-cancel-button"
                data-bs-dismiss="offcanvas"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PAGINATION */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredInquiries.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* COMPRESSED DRAWER (OFFCANVAS DETAILS VIEW) */}
      <div
        className="offcanvas offcanvas-end border-0 shadow-sm"
        tabIndex="-1"
        id="walkinDetailsDrawer"
        data-bs-backdrop="true"
        data-bs-scroll="false"
        style={{ width: "min(100%, 450px)" }}
      >
        <div className="offcanvas-header border-bottom bg-white">
          <h5 className="fw-bold m-0 text-dark">
            <ReceiptText size={20} className="me-2" />
            Walk-in Details
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
          ></button>
        </div>

        <div className="offcanvas-body bg-white p-0">
          {selectedRes && (
            <div className="d-flex flex-column h-100">
              <div className="p-3 border-bottom bg-light-subtle">
                <div className="d-flex align-items-center gap-3">
                  <div>
                    <div className="fw-bold text-dark lh-1 mb-1">
                      Name: {selectedRes.first_name}{" "}
                      {selectedRes.last_name || ""}
                    </div>
                    <div className="x-small text-muted font-monospace">
                      ID: {selectedRes.reservation_id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2 border-bottom bg-white">
                <span className="x-small fw-bold text-muted text-uppercase d-block mb-2">
                  Customer Information
                </span>
                <div className="small text-dark">
                  <div>{selectedRes.phone || "No contact number"}</div>
                  <div className="text-muted">
                    {selectedRes.email || "No email"}
                  </div>
                </div>
              </div>

              <div className="p-3 border-bottom bg-white">
                <span className="x-small fw-bold text-primary text-uppercase d-block mb-2">
                  Reservation Info
                </span>
                <div className="row g-3">
                  <div className="col-6">
                    <small className="text-muted d-block">Booking Type</small>
                    <span
                      className={`badge text-uppercase font-monospace ${
                        walkInIsEvent
                          ? "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                          : "bg-primary-subtle text-primary"
                      }`}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {walkInIsEvent
                        ? "Special Event"
                        : walkInIsTakeout
                          ? "Take-Out"
                          : "Per Table"}
                    </span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Guests</small>
                    <span className="small fw-semibold">
                      {selectedRes.num_guests || selectedRes.pax || 1} pax
                    </span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">
                      Reservation Status
                    </small>
                    <span className="small fw-semibold">
                      {selectedRes.status || "Pending"}
                    </span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Payment Status</small>
                    <span className="small fw-semibold text-uppercase">
                      {selectedRes.payment_status || "Unpaid"}
                    </span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">
                      {walkInIsEvent ? "Event Package" : "Selected Package"}
                    </small>
                    <PackageMeta reservation={selectedRes} />
                  </div>
                </div>

                {walkInIsEvent && walkInEventLimit > 0 && (
                  <div className="mt-3 p-2 bg-warning-subtle border border-warning-subtle rounded-3">
                    <div className="x-small fw-bold text-uppercase text-warning-emphasis">
                      Event Package Limit
                    </div>
                    <div className="fw-bold text-dark">
                      {"\u20B1"}
                      {walkInEventLimit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                )}

                {!walkInIsEvent && !walkInIsTakeout && walkInTableLabel && (
                  <div className="mt-3 p-2 bg-light border rounded-3">
                    <div className="x-small text-muted text-uppercase fw-bold">
                      Table Reservation
                    </div>
                    <div className="small fw-bold text-dark">
                      {walkInTableLabel}
                    </div>
                  </div>
                )}
              </div>

              {!walkInIsTakeout && (
                <div className="p-3 flex-grow-1 overflow-auto bg-light-subtle">
                  <span className="x-small fw-bold text-muted text-uppercase d-block mb-2">
                    Reservation Schedule
                  </span>
                  <div className="small text-dark">
                    {selectedRes.reservation_date
                      ? new Date(
                          selectedRes.reservation_date,
                        ).toLocaleDateString()
                      : "Date not set"}
                    {selectedRes.reservation_time
                      ? ` · ${formatTime(selectedRes.reservation_time)}`
                      : ""}
                  </div>
                </div>
              )}

              <div className="p-3 bg-dark text-white sticky-bottom mt-auto flex-shrink-0 drawer-footer">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <div className="x-small text-white-50 text-uppercase fw-bold">
                      Total Bill
                    </div>
                    <h5 className="fw-bold mb-0">
                      {"\u20B1"}
                      {Number(
                        selectedRes.total_bill ??
                          Number(selectedRes.amount || 0) +
                            Number(selectedRes.balance_due || 0),
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </h5>
                  </div>
                  <span
                    className={`badge py-2 px-3 ${Number(selectedRes.balance_due || 0) > 0 ? "bg-warning text-dark" : "bg-success"}`}
                  >
                    {Number(selectedRes.balance_due || 0) > 0
                      ? "BALANCE DUE"
                      : "PAID"}
                  </span>
                </div>
                <button
                  className="btn btn-outline-light btn-sm w-100 fw-bold border-opacity-25 drawer-footer-action"
                  data-bs-dismiss="offcanvas"
                >
                  Close Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalkInReservations;

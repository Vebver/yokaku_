import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Armchair,
  User,
  Package,
  ChevronLeft,
  ChevronRight,
  Clock,
  ReceiptText,
  Info,
  Plus, 
  CalendarCheck, 
  Search,
} from "lucide-react";
import api from "../../api";
import { useToast } from "../ToastContext";

const WalkInReservations = () => {
  const { showToast } = useToast();
  const [inquiries, setInquiries] = useState([]);
  const [rawTables, setRawTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const closeBtnRef = useRef(null);

  const getLocalISODate = () => {
    const tzOffset = new Date().getTimezoneOffset() * 60000; // offset in milliseconds
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
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
    guests: 1,
    bookingType: "table", // 'table', 'takeout', or 'event'
    packageName: "Regular Table",
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
        filtered.sort((a, b) => b.reservation_id - a.reservation_id),
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
        const foundArray = Object.values(res.data).find((val) => Array.isArray(val));
        if (foundArray) raw = foundArray;
      }

      setRawTables(raw);
    } catch (err) {
      console.error("Error Fetching tables", err);
    }
  };

  // DYNAMIC COMPUTED STATUS BASED ON LIVE ASSIGNMENT & SELECTED BOOKING DATE
  const availableTables = useMemo(() => {
    const selectedDate = newRes.date; // "YYYY-MM-DD"
    const todayDate = getLocalISODate(); // "YYYY-MM-DD"
    const isToday = selectedDate === todayDate;

    return rawTables.map((t) => {
      const tableId = t.table_id ?? t.id ?? t.tableId;
      const tableNumber = t.table_number ?? t.tableNumber ?? t.number ?? t.table_num ?? t.label ?? "Unknown";
      const capacity = t.capacity ?? t.seats ?? 2;
      
      const status = (t.bridge_status || t.status || "available").toString().toLowerCase();
      // Real-time occupant labels only apply if the booking is scheduled for today
      const isOccupiedLive = status === "occupied" || status === "reserved" || status === "busy" || status === "seated";
      const isOccupied = isToday && isOccupiedLive;

      return {
        table_id: tableId,
        table_number: isOccupied ? `${tableNumber} (Occupied)` : tableNumber,
        capacity: capacity,
        isOccupied: isOccupied,
      };
    });
  }, [rawTables, newRes.date]);

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
  const handleAddProductToCart = (product) => {
    setOrderCart((prev) => {
      const exists = prev.find((item) => item.product_id === product.item_id);
      if (exists) {
        return prev.map((item) =>
          item.product_id === product.item_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.item_id,
          name: product.menu_name || product.name,
          price: parseFloat(product.price),
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
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // --- HANDLERS FOR NEW RESERVATION ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "bookingType") {
      let defaultPackage = "Regular Table";
      if (value === "event") {
        defaultPackage = "Standard Package";
      } else if (value === "takeout") {
        defaultPackage = "Take-Out";
      }
      setNewRes((prev) => ({
        ...prev,
        bookingType: value,
        packageName: defaultPackage,
        tableIds: value === "takeout" ? ["takeout"] : [],
      }));
    } else if (name === "tableIds") {
      setNewRes((prev) => ({ ...prev, tableIds: value ? [value] : [] }));
    } else {
      setNewRes((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddReservation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (newRes.bookingType === "table") {
        const selectedTableId = newRes.tableIds?.[0];
        if (!selectedTableId) {
          showToast("Please select a table before creating the reservation.");
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        ...newRes,
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

  const fetchItems = async (resId) => {
    setOrderItems([]);
    setLoadingItems(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/reservations/${resId}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderItems(res.data);
    } catch (err) {
      console.error("Fetch Items error:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const filteredInquiries = inquiries.filter((item) => {
    const fullName =
      `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase();
    const resId = (item.reservation_id || "").toLowerCase();
    const term = searchQuery.toLowerCase();
    return fullName.includes(term) || resId.includes(term);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInquiries.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage);

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
      <div className="row align-items-center mb-4 px-2">
        <div className="col">
          <h2 className="fw-bold mb-1">Walk-ins & Kiosk</h2>
          <p className="text-muted small mb-0">
            Monitor instant orders and on-site customers
          </p>
        </div>
        <div className="col-auto d-flex gap-2">
          <button
            className="btn btn-primary fw-bold shadow-sm d-flex align-items-center gap-2"
            data-bs-toggle="offcanvas"
            data-bs-target="#addReservationDrawer"
          >
            <Plus size={18} /> Make a Reservation
          </button>
          <div className="bg-white border rounded-pill px-3 py-1 shadow-sm small fw-bold d-flex align-items-center">
            {inquiries.length} Orders
          </div>
        </div>
      </div>


      {/* SEARCH BAR */}
      <div className="col-12 col-md-8 col-lg-5 mb-3 px-2">
        <div className="d-flex align-items-center bg-white rounded-3 border shadow-sm px-3" style={{ height: '48px' }}>
          <Search size={20} className="text-muted flex-shrink-0" />
          <input
            type="text"
            className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
            style={{ color: "#212529", fontSize: "16px", fontWeight: "500", height: "100%" }}
            placeholder="Search by guest name or ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
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
                <th className="ps-4 py-3">Guest & ID</th>
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
                        {item.assigned_tables || "Take-Out"}
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
                      className={`badge rounded-pill px-3 py-1 small ${item.status === "completed" ? "bg-secondary" : "bg-success"}`}
                    >
                      {item.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-dark fw-bold px-3 py-1 shadow-sm"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#walkinDetailsDrawer"
                      onClick={() => {
                        setSelectedRes(item);
                        fetchItems(item.reservation_id);
                      }}
                    >
                      Review Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD RESERVATION SIDEBAR --- */}
      <div
        className="offcanvas offcanvas-end border-0 shadow-lg"
        tabIndex="-1"
        id="addReservationDrawer"
        style={{ width: "min(100%, 450px)" }}
      >
        <div className="offcanvas-header border-bottom bg-dark text-white">
          <h5 className="fw-bold m-0 d-flex align-items-center">
            <CalendarCheck size={20} className="me-2 text-warning" />
            New Reservation
          </h5>
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
            className="d-flex flex-column h-100"
          >
            <div className="p-4 flex-grow-1 overflow-auto">
              {/* SECTION: CUSTOMER */}
              <p className="x-small fw-bold text-muted text-uppercase mb-3">
                Customer Information
              </p>
              <div className="row g-3 mb-4">
                <div className="col-6">
                  <label className="form-label small fw-bold">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    className="form-control form-control-sm"
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    className="form-control form-control-sm"
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">Email</label>
                  <input
                    type="text"
                    name="email"
                    className="form-control form-control-sm"
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    className="form-control form-control-sm"
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <hr />

              {/* SECTION: BOOKING DETAILS */}
              <p className="x-small fw-bold text-primary text-uppercase mb-3">
                Booking Details
              </p>

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

              {/* Take-Out Info Banner */}
              {newRes.bookingType === "takeout" && (
                <div className="mb-3 p-3 bg-success-subtle rounded-3 border border-success-subtle animate-fade-in">
                  <div className="x-small text-success-emphasis fw-bold">
                    ✓ Take-Out Order Selected
                  </div>
                  <div className="x-small text-muted mt-1">
                    No physical tables will be marked as occupied for this session.
                  </div>
                </div>
              )}

              {/* DYNAMIC FOOD & DRINK SELECTOR */}
              {(newRes.bookingType === "takeout" || newRes.bookingType === "table") && (
                <div className="mb-4 animate-fade-in">
                  <label className="form-label small fw-bold text-uppercase text-muted">
                    Add Menu Items (Optional)
                  </label>
                  <select 
                    className="form-select form-select-sm fw-semibold mb-2"
                    value="" 
                    onChange={(e) => {
                      const selectedId = parseInt(e.target.value, 10);
                      const found = products.find(p => p.item_id === selectedId);
                      if (found) handleAddProductToCart(found);
                      e.target.value = "";
                    }}
                  >
                    <option value="">-- Add food or drink --</option>
                    {products.map(p => (
                      <option key={p.item_id} value={p.item_id}>
                        {p.menu_name || p.name} (₱{parseFloat(p.price).toFixed(2)})
                      </option>
                    ))}
                  </select>

                  {/* Selected Items Tray List */}
                  {orderCart.length > 0 && (
                    <div className="p-3 bg-white border rounded-3 mb-3" style={{ maxHeight: "150px", overflowY: "auto" }}>
                      {orderCart.map(item => (
                        <div key={item.product_id} className="d-flex justify-content-between align-items-center mb-2 small fw-semibold">
                          <span className="text-dark-emphasis">{item.name}</span>
                          <div className="d-flex align-items-center gap-2">
                            <button type="button" onClick={() => handleUpdateCartQty(item.product_id, -1)} className="btn btn-light btn-sm border py-0 px-2 fw-bold">-</button>
                            <span className="font-monospace">{item.quantity}</span>
                            <button type="button" onClick={() => handleUpdateCartQty(item.product_id, 1)} className="btn btn-light btn-sm border py-0 px-2 fw-bold">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Only show and require Table Assignment if NOT booking an event or takeout */}
              {newRes.bookingType === "table" && (
                <div className="mb-3 animate-fade-in">
                  <label className="form-label small fw-bold text-danger">
                    ASSIGN TABLE (Required)
                  </label>
                  <select
                    name="tableIds"
                    className="form-select border-danger fw-bold"
                    value={newRes.tableIds[0] || ""}
                    onChange={handleInputChange}
                    required={newRes.bookingType === "table"}
                  >
                    <option value="">-- Choose Available Table --</option>
                    {availableTables.map((t) => (
                      <option key={t.table_id} value={t.table_id}>
                        Table {t.table_number} ({t.capacity} Pax)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newRes.bookingType === "event" && (
                <div className="mb-3 p-3 bg-warning-subtle rounded-3 border border-warning-subtle animate-fade-in">
                  <label className="form-label small fw-bold text-warning-emphasis">
                    Select Event Package
                  </label>
                  <select
                    name="packageName"
                    className="form-select bg-white mb-2"
                    value={newRes.packageName}
                    onChange={handleInputChange}
                  >
                    <option value="Standard Package">Standard Package</option>
                    <option value="Premium Package">Premium Package</option>
                  </select>
                  <div className="x-small text-muted">
                    * Booking an event reserves all floor layout tables automatically.
                  </div>
                </div>
              )}

              {/* NEW SECTION: PAYMENT METHOD */}
              <div className="mb-4">
                <label className="form-label small fw-bold text-success text-uppercase">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  className="form-select border-success fw-bold"
                  value={newRes.paymentMethod}
                  onChange={handleInputChange}
                >
                  <option value="Cash">Cash (Paid at Counter)</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
                <div className="x-small text-muted mt-1 italic">
                  * Manual entries are automatically verified.
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Date</label>
                  <input
                    type="date"
                    name="date"
                    className="form-control"
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Time</label>
                  <input
                    type="time"
                    name="startTime"
                    className="form-control"
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    name="guests"
                    className="form-control"
                    min="1"
                    value={newRes.guests}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-top mt-auto">
              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-bold mb-2 shadow-sm"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Confirm Reservation"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary w-100 py-2 fw-bold border-0"
                data-bs-dismiss="offcanvas"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="text-muted small">
          Showing <strong>{indexOfFirstItem + 1}</strong> to{" "}
          <strong>{Math.min(indexOfLastItem, inquiries.length)}</strong> of{" "}
          <strong>{inquiries.length}</strong>
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link border-0 px-3 py-2"
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link border-0 text-dark fw-bold px-3 py-2">
                Page {currentPage} of {totalPages || 1}
              </span>
            </li>
            <li
              className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
            >
              <button
                className="page-link border-0 px-3 py-2"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </nav>
      </div>

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
                  <div className="p-2 bg-primary text-white rounded-circle shadow-sm">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="fw-bold text-dark lh-1 mb-1">
                      {selectedRes.first_name} {selectedRes.last_name || ""}
                    </div>
                    <div className="x-small text-muted font-monospace">
                      ID: {selectedRes.reservation_id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 border-bottom bg-white">
                <span className="x-small fw-bold text-muted text-uppercase d-block mb-2">
                  Guest Profile
                </span>
                <div className="row g-2">
                  <div className="col-6">
                    <small className="text-muted d-block">Email Address</small>
                    <span className="small fw-semibold text-dark text-break">
                      {selectedRes.email || "N/A"}
                    </span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Phone Number</small>
                    <span className="small fw-semibold text-dark">
                      {selectedRes.phone || "N/A"}
                    </span>
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
                      className="badge bg-primary-subtle text-primary text-uppercase font-monospace"
                      style={{ fontSize: "0.7rem" }}
                    >
                      {selectedRes.reservation_type === "event"
                        ? "Special Event"
                        : selectedRes.reservation_type === "takeout"
                          ? "Take-Out"
                          : "Table Dining"}
                    </span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">
                      Selected Package
                    </small>
                    <span className="small fw-bold text-dark">
                      {selectedRes.package_name || "Regular Table"}
                    </span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Number of Guests</small>
                    <span className="small fw-bold text-dark">
                      {selectedRes.num_guests || selectedRes.guests || "1"}
                    </span>
                  </div>
                </div>
              </div>

              {/* TIMELINE */}
              <div className="p-3 border-bottom bg-white">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <Clock size={14} className="text-muted" />
                    <span className="x-small fw-bold text-muted text-uppercase">
                      Timeline
                    </span>
                  </div>
                  <div className="small fw-bold d-flex align-items-center">
                    <span className="text-muted">
                      {selectedRes.reservation_time
                        ? formatTime(selectedRes.reservation_time)
                        : "--:--"}
                    </span>
                    <ChevronRight size={14} className="mx-1 text-muted" />
                    <span className="text-dark">
                      {selectedRes.end_time
                        ? formatTime(selectedRes.end_time)
                        : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 flex-grow-1 overflow-auto bg-light-subtle">
                <span className="x-small fw-bold text-muted text-uppercase d-block mb-2">
                  Order Summary
                </span>
                {loadingItems ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm text-primary"></div>
                  </div>
                ) : orderItems.length > 0 ? (
                  <div className="item-list">
                    {orderItems.map((order, idx) => {
                      const isRefill =
                        order.is_refill === 1 ||
                        order.is_refill === true ||
                        (order.customizations &&
                          order.customizations.toString().includes("[REFILL]"));

                      const displayedPrice = isRefill
                        ? 0
                        : Number(order.price) * order.quantity;

                      return (
                        <div
                          key={idx}
                          className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light"
                        >
                          <div className="small text-dark">
                            {order.name || order.item_name}{" "}
                            <span className="text-muted small fw-bold">
                              x{order.quantity}
                            </span>
                            {isRefill && (
                              <span
                                className="badge bg-secondary ms-2 small"
                                style={{ fontSize: "0.55rem" }}
                              >
                                REFILL
                              </span>
                            )}
                          </div>
                          <div className="small fw-bold text-dark">
                            ₱{displayedPrice.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted small">
                    No active food orders linked to this session.
                  </div>
                )}
              </div>

              <div className="p-3 bg-dark text-white sticky-bottom">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0">Total Bill</h5>
                  <span className="badge py-2 px-3 bg-success">PAID</span>
                </div>
                <button
                  className="btn btn-outline-light btn-sm w-100 fw-bold border-opacity-25"
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
import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Timer,
  Loader2,
  LogOut,
  Boxes,
} from "lucide-react";
import { io } from "socket.io-client";
import { useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import { useToast } from "../ToastContext";
import { useConfirmation } from "../ConfirmationContext";
import api, { API_BASE, SOCKET_URL } from "../../api";
import "../../Style/KitchenPage.css";
import "../../Style/KitchenNavbar.css";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
});

// --- ORDER CARD COMPONENT ---
const OrderCard = forwardRef(({ order, onUpdateStatus }, ref) => {
  const [elapsed, setElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const startTime = new Date(order.timestamp).getTime();
      const now = Date.now();
      const minutesElapsed = Math.floor((now - startTime) / 60000);
      setElapsed(Math.max(0, minutesElapsed));
    };
    calculateTime();
    const timer = setInterval(calculateTime, 10000);
    return () => clearInterval(timer);
  }, [order.timestamp]);

  const renderCustomizations = (customs) => {
    // The API stores customizations as a plain string ("null"/"undefined" when
    // unset), but older rows can hold a JSON blob, so parse defensively and
    // fall back to showing the raw text.
    if (customs === null || customs === undefined) return null;
    if (typeof customs !== "string") return null;

    const raw = customs.trim();
    if (!raw || raw === "null" || raw === "undefined") return null;

    let lines = [raw];

    if (raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        lines = Object.entries(parsed)
          .filter(([, v]) => v !== null && v !== "" && v !== "None")
          .map(([k, v]) => `${k}: ${v}`);
      } catch {
        // Malformed JSON — fall back to the original text.
        lines = [raw];
      }
    }

    if (lines.length === 0) return null;

    return (
      <div className="item-customs">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`custom-tag ${
              line.toLowerCase().includes("allergy")
                ? "has-allergy"
                : ""
            }`}
          >
            {line}
          </div>
        ))}
      </div>
    );
  };

  const handleStatusUpdate = async (newStatus) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onUpdateStatus(statusTargetId, newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAllergy = order.allergyNote && order.allergyNote !== "None";

  // The API returns either "Table 3" or "Walk-in", so strip the word "Table"
  // to avoid rendering "TABLE Table 3" in the header.
  const tableLabel = (order.table || "Walk-in").replace(/^Table\s*/i, "");

  // The backend updates a whole reservation's kitchen status, so it needs the
  // reservation id — NOT the grouped "reservationId:tableId" key we use as a
  // React key. Sending the group key silently updated nothing.
  const statusTargetId = order.reservation_id || order.id;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`order-card status-${order.status.toLowerCase()} ${hasAllergy ? "has-allergy-warning" : ""}`}
    >
      <div className="card-header">
        <div className="table-badge">
          <span className="table-label">TABLE</span>
          <span className="table-id">{tableLabel}</span>
        </div>
        <div
          className={`time-badge ${elapsed >= 15 ? "urgency-critical" : elapsed >= 8 ? "urgency-warning" : "urgency-normal"}`}
          title={`Waiting ${elapsed} minute${elapsed === 1 ? "" : "s"}`}
        >
          <Timer size={14} />
          <span>{elapsed}m</span>
        </div>
      </div>

      {hasAllergy && (
        <div className="allergy-alert-banner">
          ⚠️ ALLERGY: {order.allergyNote}
        </div>
      )}

      <div className="card-body">
        <div className="item-list">
          {order.items?.map((item, idx) => (
            <div key={idx} className="ticket-item">
              <div className="item-main-row">
                <span className="item-qty">{item.qty || item.quantity}x</span>
                <span className="item-name">{item.name}</span>
              </div>
              {renderCustomizations(item.customizations)}
            </div>
          ))}
        </div>
      </div>

      <div className="card-footer">
        {order.status === "pending" && (
          <button
            onClick={() => handleStatusUpdate("preparing")}
            className="btn-action start"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={18} className="spinner-animation" />
            ) : (
              "START COOKING"
            )}
          </button>
        )}
        {order.status === "preparing" && (
          <button
            onClick={() => handleStatusUpdate("ready")}
            className="btn-action ready"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={18} className="spinner-animation" />
            ) : (
              "MARK READY"
            )}
          </button>
        )}
        {order.status === "ready" && (
          <button
            onClick={() => handleStatusUpdate("served")}
            className="btn-action clear"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={18} className="spinner-animation" />
            ) : (
              "SERVED / CLEAR"
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
});

const EventTakeoutCard = ({ takeout, onAdvance }) => {
  const [isLoading, setIsLoading] = useState(false);
  const statusClass =
    takeout.status === "requested"
      ? "pending"
      : takeout.status === "preparing"
        ? "preparing"
        : "ready";
  const nextStatus =
    takeout.status === "requested"
      ? "preparing"
      : takeout.status === "preparing"
        ? "ready"
        : null;
  const statusLabel =
    takeout.status === "requested"
      ? "TAKEOUT REQUESTED"
      : takeout.status === "preparing"
        ? "TAKEOUT PREPARING"
        : "TAKEOUT READY · AWAITING PICKUP";

  const advance = async () => {
    if (!nextStatus || isLoading) return;
    setIsLoading(true);
    try {
      await onAdvance(takeout.takeout_id, nextStatus);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`order-card status-${statusClass} event-takeout-ticket`}
    >
      <div className="card-header">
        <div className="table-badge">
          <span className="table-label">EVENT TAKEOUT</span>
          <span className="table-id">{takeout.reservation_id}</span>
        </div>
        <span className={`event-takeout-ticket-status ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <div className="card-body">
        <div className="event-takeout-ticket-package">
          Customer: {takeout.customer_name || "Guest"}
        </div>
        <div className="event-takeout-ticket-package">
          {takeout.package_name || "Reserved event package"}
        </div>
        <div className="item-list">
          {takeout.items.map((item) => (
            <div className="ticket-item" key={`${takeout.takeout_id}-${item.item_id}`}>
              <div className="item-main-row">
                <span className="item-qty">{item.quantity}x</span>
                <span className="item-name">{item.name}</span>
              </div>
              <small className="text-muted">
                ₱{Number(item.unit_price || 0).toFixed(2)} × {item.quantity} = ₱{Number(item.line_value || 0).toFixed(2)}
              </small>
            </div>
          ))}
        </div>
        <div className="event-takeout-ticket-package">
          Takeout value: ₱{Number(takeout.takeout_value || 0).toFixed(2)}
        </div>
      </div>
      <div className="card-footer">
        {nextStatus ? (
          <button
            className={`btn-action ${nextStatus === "preparing" ? "start" : "ready"}`}
            onClick={advance}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={18} className="spinner-animation" /> :
              nextStatus === "preparing" ? "START TAKEOUT PREP" : "MARK TAKEOUT READY"}
          </button>
        ) : (
          <div className="event-takeout-awaiting-pickup">Awaiting Cashier / Admin pickup confirmation</div>
        )}
      </div>
    </motion.div>
  );
};

// --- MAIN KITCHEN PAGE ---
const KitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [takeouts, setTakeouts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirmation();

  // Get User Info from LocalStorage
  const userRole = localStorage.getItem("role");
  const firstName = localStorage.getItem("firstName") || "Cook";
  const lastName = localStorage.getItem("lastName") || "";

  // Logout Logic
  const handleLogout = async () => {
    const approved = await confirm({
      title: "Logout",
      message: "Are you sure you want to logout?",
      confirmLabel: "Logout",
      cancelLabel: "Cancel",
    });
    if (!approved) return;
    localStorage.clear();
    navigate("/");
    window.location.reload();
  };

  if (userRole !== "cook" && userRole !== "admin") {
    return <div className="p-5 text-center">Access Denied.</div>;
  }

  const loadActiveOrders = async () => {
    try {
      setIsLoading(true);
      // The shared `api` instance already carries the /api base URL and the
      // auth header, so pass only the path.
      const [response, takeoutResponse] = await Promise.all([
        api.get(`/orders/active`),
        api.get(`/orders/event-takeouts/active`).catch((error) => {
          console.error("Error loading event takeout tickets:", error);
          return { data: [] };
        }),
      ]);
      if (response.data) {
        const formatted = response.data.map((order) => ({
          id: order.id,
          // Keep the real reservation id: the status endpoint updates a whole
          // reservation, so the grouped "reservationId:tableId" key cannot be
          // used to address it.
          reservation_id: order.reservation_id,
          table: order.table,
          status: order.status,
          timestamp: order.timestamp,
          allergyNote: order.allergy_note,
          items: order.items,
        }));
        setOrders(formatted);
      }
      setTakeouts(takeoutResponse.data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveOrders();
    socket.on("send_order", loadActiveOrders);
    socket.on("order_status_updated", loadActiveOrders);
    socket.on("event_takeout_updated", loadActiveOrders);
    return () => {
      socket.off("send_order");
      socket.off("order_status_updated");
      socket.off("event_takeout_updated", loadActiveOrders);
    };
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/orders/${id}/status`, { status: newStatus });
      await loadActiveOrders();
      socket.emit("order_status_update", { orderId: id, newStatus });
    } catch (err) {
      showToast("Update failed");
    }
  };

  const updateTakeoutStatus = async (id, newStatus) => {
    try {
      await api.put(`/orders/event-takeouts/${id}/status`, {
        status: newStatus,
      });
      await loadActiveOrders();
    } catch (error) {
      showToast(error.response?.data?.error || "Takeout update failed.");
    }
  };

  const filteredOrders = orders.filter(
    (o) => filter === "all" || o.status === filter,
  );
  const filteredTakeouts = takeouts.filter((takeout) => {
    const status = takeout.status === "requested" ? "pending" : takeout.status;
    return filter === "all" || status === filter;
  });
  const getFilterCount = (status) => {
    if (status === "all") return orders.length + takeouts.length;
    const takeoutStatus = status === "pending" ? "requested" : status;
    return (
      orders.filter((order) => order.status === status).length +
      takeouts.filter((takeout) => takeout.status === takeoutStatus).length
    );
  };

  return (
    <div className="kitchen-wrapper">
      {/* NEW MODERN HEADER */}
      <nav className="kitchen-navbar">
        <div className="nav-left">
          <div
            className="logo-section"
            style={{ display: "flex", alignItems: "center", gap: "15px" }}
          >

            <div>
              <h1
                className="brand-name"
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "800",
                  margin: 0,
                  letterSpacing: "0.5px",
                }}
              >
                HANGOUT KITCHEN
              </h1>
            </div>
          </div>
        </div>

        <div className="nav-center">
          <div className="filter-tabs">
            {["all", "pending", "preparing", "ready"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`tab-btn ${filter === f ? "active" : ""}`}
                aria-pressed={filter === f}
              >
                {f === "all" ? "ALL" : f.toUpperCase()}
                <span className="count-pill">{getFilterCount(f)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="nav-right">
          <button
            onClick={() => navigate("/kitchen-inventory")}
            className="inventory-nav-btn"
            title="Open inventory"
          >
            <Boxes size={20} />
            <span>INVENTORY</span>
          </button>
          <div className="user-profile">
            <div className="user-info text-end">
              <span className="user-name">
                {firstName} {lastName}
              </span>
              <span className="user-role">Cook</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="logout-icon-btn"
            title="Logout"
          >
            <LogOut size={22} />
          </button>
        </div>
      </nav>

      <main className="container pt-4">
        {isLoading && orders.length === 0 ? (
          <div className="empty-state">
            <Loader2 size={48} color="#f38d31" className="spinner-animation" />
            <h3>LOADING TICKETS</h3>
            <p>Pulling the latest orders from the floor...</p>
          </div>
        ) : filteredOrders.length > 0 || filteredTakeouts.length > 0 ? (
          <>
            {filteredOrders.length > 0 && (
              <div className="order-grid">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            {filteredTakeouts.length > 0 && (
              <section className="event-takeout-kitchen-section">
                <h2>EVENT TAKEOUTS</h2>
                <div className="order-grid">
                  <AnimatePresence mode="popLayout">
                    {filteredTakeouts.map((takeout) => (
                      <EventTakeoutCard
                        key={`takeout-${takeout.takeout_id}`}
                        takeout={takeout}
                        onAdvance={updateTakeoutStatus}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="empty-state">
            <CheckCircle2 size={60} color="#ccc" />
            <h3>KITCHEN CLEAR</h3>
            <p>No active orders in this category.</p>
          </div>
        )}
      </main>

    </div>
  );
};

export default KitchenPage;
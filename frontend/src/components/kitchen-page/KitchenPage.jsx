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

// --- MAIN KITCHEN PAGE ---
const KitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Get User Info from LocalStorage
  const userRole = localStorage.getItem("role");
  const firstName = localStorage.getItem("firstName") || "Cook";
  const lastName = localStorage.getItem("lastName") || "";

  // Logout Logic
  const handleLogout = () => {
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
      const response = await api.get(`/orders/active`);
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
    return () => {
      socket.off("send_order");
      socket.off("order_status_updated");
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

  const filteredOrders = orders.filter(
    (o) => filter === "all" || o.status === filter,
  );

  return (
    <div className="kitchen-wrapper">
      {/* NEW MODERN HEADER */}
      <nav className="kitchen-navbar">
        <div className="nav-left">
          <div
            className="logo-section"
            style={{ display: "flex", alignItems: "center", gap: "15px" }}
          >
            {/* STYLIZED "H" LOGO BOX */}
            <div
              style={{
                width: "42px",
                height: "42px",
                backgroundColor: "#ffcc00", // Brand orange
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "10px",
                fontSize: "1.8rem",
                fontWeight: "900",
                fontFamily: "'Inter', sans-serif",
                boxShadow: "0 2px 10px rgba(243, 141, 49, 0.3)",
              }}
            >
              H
            </div>

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
              <div
                className="live-status"
                style={{
                  fontSize: "0.65rem",
                  color: "#4ade80",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span className="dot"></span> LIVE MONITORING
              </div>
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
                <span className="count-pill">
                  {f === "all"
                    ? orders.length
                    : orders.filter((o) => o.status === f).length}
                </span>
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
        ) : filteredOrders.length > 0 ? (
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
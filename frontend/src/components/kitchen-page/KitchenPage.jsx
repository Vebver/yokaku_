import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  Timer,
  Filter,
} from "lucide-react";
import "../../Style/KitchenPage.css";
import { io } from "socket.io-client";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
// Initialize socket connection to the new port 5000
const socket = io(SOCKET_URL);

// --- STATUS BADGE COMPONENT ---
const StatusBadge = ({ status }) => {
  const badgeClass = `badge badge-${status.toLowerCase()}`;
  return <span className={badgeClass}>{status}</span>;
};

// --- ORDER CARD COMPONENT ---
const OrderCard = forwardRef(({ order, onUpdateStatus }, ref) => {
  const [elapsed, setElapsed] = useState(0);

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

  // Restored: Customization rendering logic
  const renderCustomizations = (customs) => {
    if (!customs) return null;
    try {
      const c = typeof customs === "string" ? JSON.parse(customs) : customs;
      return (
        <div className="item-details-box">
          {c.flavor && <span className="detail-tag flavor">{c.flavor}</span>}
          {c.drink && <span className="detail-tag drink">{c.drink}</span>}
          {c.spiceLevel && <span className="detail-tag spice">{c.spiceLevel}</span>}
          {c.addOns?.length > 0 && (
            <span className="detail-tag addons">+{c.addOns.join(", ")}</span>
          )}
          {c.specialInstructions && (
            <div className="item-note">" {c.specialInstructions} "</div>
          )}
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  const getTimerClass = () => {
    if (elapsed > 15) return "time-elapsed critical";
    if (elapsed > 10) return "time-elapsed warning";
    return "time-elapsed";
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="order-card"
    >
      <div className="card-header">
        <div className="header-main">
          <span className="table-number">Table {order.table}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className={getTimerClass()}>
          <Timer size={14} />
          <span>{elapsed}m</span>
        </div>
      </div>

      <div className="card-body">
        <ul className="item-list">
          {order.items && order.items.map((item, idx) => (
            <li key={idx} className="item-container">
              <div className="item-row">
                <span className="item-name">{item.name}</span>
                <span className="qty">x{item.qty || item.quantity}</span>
              </div>
              {renderCustomizations(item.customizations)}
            </li>
          ))}
        </ul>

        {order.instructions && (
          <div className="instructions">
            <MessageSquare size={14} />
            <p>{order.instructions}</p>
          </div>
        )}
      </div>

      <div className="card-footer">
        {order.status === "pending" && (
          <button
            onClick={() => onUpdateStatus(order.id, "preparing")}
            className="action-btn btn-start"
          >
            <PlayCircle size={18} /> Start
          </button>
        )}
        {order.status === "preparing" && (
          <button
            onClick={() => onUpdateStatus(order.id, "ready")}
            className="action-btn btn-ready"
          >
            <CheckCircle2 size={18} /> Ready
          </button>
        )}
        {order.status === "ready" && (
          <button
            onClick={() => onUpdateStatus(order.id, "served")}
            className="action-btn btn-clear"
          >
            Clear
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

 useEffect(() => {
  // Listen for real-time orders once when the page opens
  socket.on("new_order", (incomingOrder) => {
    setOrders((prevOrders) => {
      if (prevOrders.find((o) => o.id === incomingOrder.id)) return prevOrders;
      return [incomingOrder, ...prevOrders];
    });
  });

  // Handle manual navigation state (if someone redirected to this page with an order)
  if (location.state?.newOrder) {
    const newOrder = location.state.newOrder;
    setOrders((prev) => prev.find(o => o.id === newOrder.id) ? prev : [newOrder, ...prev]);
    window.history.replaceState({}, document.title);
  }

  return () => {
    socket.off("new_order");
  };
}, []); // Empty dependency array means "run once on load"

  const updateStatus = async (id, newStatus) => {
  try {
    // 1. Tell the Backend/Database about the change
    await fetch(`${API_URL}/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    // 2. Update the UI screen
    if (newStatus === "served") {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
      );
    }
  } catch (err) {
    console.error("Failed to update database status:", err);
  }
};

  // Filter logic
  const filteredOrders = orders.filter(
    (o) => filter === "all" || o.status === filter
  );

  return (
    <div className="kitchen-wrapper">
      <header className="header">
        <div className="header-title">
          <div className="live-indicator" />
          <h1>Kitchen Queue</h1>
          <span className="order-count">{orders.length} Active</span>
        </div>

        <div className="filter-group">
          <Filter size={16} className="filter-icon" />
          {["all", "pending", "preparing", "ready"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-btn ${filter === f ? "active" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className="container">
        {filteredOrders.length > 0 ? (
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
            <CheckCircle2 size={48} color="#e0e0e0" />
            <p>Queue is empty</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenPage;
import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  Timer,
  Filter,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import "../../Style/KitchenPage.css";
import { io } from "socket.io-client";

// Initialize socket connection to the new port 5000
const socket = io("http://localhost:5000");

const INITIAL_ORDERS = [];

const StatusBadge = ({ status }) => {
  const badgeClass = `badge badge-${status}`;
  return <span className={badgeClass}>{status}</span>;
};

// Wrapped in forwardRef to fix the "Function components cannot be given refs" error
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

  const getTimerClass = () => {
    if (elapsed > 15) return "time-elapsed critical";
    if (elapsed > 10) return "time-elapsed warning";
    return "time-elapsed";
  };

  return (
    <motion.div
      ref={ref} // Attach the forwarded ref here
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="order-card"
    >
      <div className="card-header">
        <div className="header-main">
          <span className="table-number">T-{order.table}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className={getTimerClass()}>
          <Timer size={14} />
          <span>{elapsed}m</span>
        </div>
      </div>

      <div className="card-body">
        <ul className="item-list">
          {order.items.map((item, idx) => (
            <li key={idx} className="item-row">
              <span className="item-name">{item.name}</span>
              <span className="qty">x{item.qty}</span>
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
            <PlayCircle size={18} /> Start Preparing
          </button>
        )}
        {order.status === "preparing" && (
          <button
            onClick={() => onUpdateStatus(order.id, "ready")}
            className="action-btn btn-ready"
          >
            <CheckCircle2 size={18} /> Mark as Ready
          </button>
        )}
        {order.status === "ready" && (
          <button
            onClick={() => onUpdateStatus(order.id, "served")}
            className="action-btn btn-clear"
          >
            Clear Order
          </button>
        )}
      </div>
    </motion.div>
  );
});

const KitchenPage = () => {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [filter, setFilter] = useState("all");
  const location = useLocation();

  useEffect(() => {
    // Listen for real-time orders from the backend
    socket.on("new_order", (incomingOrder) => {
      setOrders(prevOrders => {
        const exists = prevOrders.find(o => o.id === incomingOrder.id);
        if (exists) return prevOrders;
        return [incomingOrder, ...prevOrders];
      });
    });

    // Handle manual navigation state if provided
    if (location.state?.newOrder) {
      const newOrder = location.state.newOrder;
      setOrders((prevOrders) => {
        const exists = prevOrders.find((o) => o.id === newOrder.id);
        if (exists) return prevOrders;
        return [newOrder, ...prevOrders];
      });
      window.history.replaceState({}, document.title);
    }

    return () => {
      socket.off("new_order");
    };
  }, [location.state]);

  const updateStatus = (id, newStatus) => {
    if (newStatus === "served") {
      setOrders(orders.filter((o) => o.id !== id));
    } else {
      setOrders(
        orders.map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
      );
    }
  };

  const filteredOrders = orders.filter(
    (o) => filter === "all" || o.status === filter,
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
          <motion.div layout className="order-grid">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={updateStatus}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="empty-state">
            <CheckCircle2 size={48} />
            <p>Queue is empty</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenPage;
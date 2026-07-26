import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  Timer,
  Loader2,
  LogOut,
} from "lucide-react";
import { io } from "socket.io-client";
import { useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import { useToast } from "../ToastContext";
import api from "../../api";
import "../../Style/KitchenPage.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
    if (!customs || customs === "null" || customs === "undefined")
      return <div className="item-note-empty">—</div>;

    if (typeof customs === "string" && !customs.trim().startsWith("{")) {
      const hasAllergy = customs.toLowerCase().includes("allergy");
      return (
        <div className="custom-details-container">
          <div
            className={`highlight-custom-box ${hasAllergy ? "has-allergy" : ""}`}
          >
            {customs}
          </div>
        </div>
      );
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAllergy = order.allergyNote && order.allergyNote !== "None";

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
          <span className="table-id">{order.table}</span>
        </div>
        <div
          className={`time-badge ${elapsed >= 15 ? "urgency-critical" : elapsed >= 8 ? "urgency-warning" : "urgency-normal"}`}
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
            </div>
          ))}
        </div>
      </div>

      <div className="card-footer">
        {order.status === "pending" && (
          <button
            onClick={() => handleStatusUpdate("preparing")}
            className="btn-action start"
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
      const response = await api.get(`${API_URL}/orders/active`);
      if (response.data) {
        const formatted = response.data.map((order) => ({
          id: order.id,
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
      await api.put(`${API_URL}/orders/${id}/status`, { status: newStatus });
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
              >
                {f.toUpperCase()}
                {f === "all" && (
                  <span className="count-pill">{orders.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="nav-right">
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
            <CheckCircle2 size={60} color="#ccc" />
            <h3>KITCHEN CLEAR</h3>
            <p>No active orders in this category.</p>
          </div>
        )}
      </main>

      {/* Internal CSS for the new Header components */}
      <style>{`
        .kitchen-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 2rem;
          background: #1a1a1a;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
        }
        .logo-section { display: flex; align-items: center; gap: 12px; }
        .brand-name { font-size: 1.2rem; font-weight: 800; margin: 0; letter-spacing: 1px; }
        .live-status { font-size: 0.65rem; color: #4ade80; display: flex; align-items: center; gap: 5px; }
        .dot { width: 6px; height: 6px; background: #4ade80; border-radius: 50%; animation: pulse 1.5s infinite; }
        
        .filter-tabs { display: flex; background: #2d2d2d; padding: 4px; border-radius: 12px; }
        .tab-btn { 
          padding: 8px 20px; border: none; background: transparent; color: #a3a3a3; 
          font-size: 0.75rem; font-weight: 600; border-radius: 8px; transition: 0.3s;
          display: flex; align-items: center; gap: 8px;
        }
        .tab-btn.active { background: #f38d31; color: white; }
        .count-pill { background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; }

        .nav-right { display: flex; align-items: center; gap: 20px; }
        .user-profile { display: flex; align-items: center; gap: 12px; border-right: 1px solid #333; padding-right: 20px; }
        .user-name { display: block; font-size: 0.9rem; font-weight: 600; }
        .user-role { display: block; font-size: 0.7rem; color: #f38d31; }
        .logout-icon-btn { 
          background: transparent; border: none; color: #ef4444; cursor: pointer; 
          transition: 0.2s; padding: 8px; border-radius: 50%;
        }
        .logout-icon-btn:hover { background: rgba(239, 68, 68, 0.1); transform: scale(1.1); }

        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default KitchenPage;

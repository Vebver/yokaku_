import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  Timer,
  Loader2,
} from "lucide-react";
import "../../Style/KitchenPage.css";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";
import axios from "axios";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Initialize socket connection
const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

// --- STATUS BADGE COMPONENT ---
const StatusBadge = ({ status }) => {
  const badgeClass = `badge badge-${status.toLowerCase()}`;
  return <span className={badgeClass}>{status}</span>;
};

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

  // Helper function to extract allergy from customizations or instructions
  const extractAllergy = (customs, instructions) => {
    // Check customizations first
    if (customs) {
      if (typeof customs === "string") {
        if (customs.toLowerCase().includes("allergy")) {
          return customs;
        }
      }
      if (typeof customs === "object" && customs.allergy) {
        return customs.allergy;
      }
    }
    // Check instructions
    if (instructions && instructions.toLowerCase().includes("allergy")) {
      return instructions;
    }
    return null;
  };

  const renderCustomizations = (customs) => {
    if (!customs) return <div className="item-note-empty">—</div>;

    // Check if it's the string format from the Kiosk (e.g. "Wings: Barbeque | Drink: Orange")
    if (typeof customs === "string" && !customs.trim().startsWith("{")) {
      // Check if this string contains allergy information
      const hasAllergy = customs.toLowerCase().includes("allergy");
      return (
        <div className="custom-details-container">
          <div
            className={`highlight-custom-box ${hasAllergy ? "has-allergy" : ""}`}
          >
            {hasAllergy ? (
              <span className="allergy-text">{customs}</span>
            ) : (
              customs
            )}
          </div>
        </div>
      );
    }

    // Fallback for JSON format
    try {
      const c = typeof customs === "string" ? JSON.parse(customs) : customs;
      const hasAllergy =
        c.allergy ||
        (c.specialInstructions &&
          c.specialInstructions.toLowerCase().includes("allergy"));

      return (
        <div className="custom-details-container">
          <div className="json-details">
            {c.flavor && <span className="tag">FLAVOR: {c.flavor}</span>}
            {c.drink && <span className="tag">DRINK: {c.drink}</span>}
            {c.allergy && (
              <div className="allergy-container">
                <span className="allergy-label">⚠️ ALLERGY:</span>
                <span className="allergy-value">{c.allergy}</span>
              </div>
            )}
            {c.specialInstructions && (
              <div
                className={`note ${c.specialInstructions.toLowerCase().includes("allergy") ? "has-allergy" : ""}`}
              >
                {c.specialInstructions.toLowerCase().includes("allergy") ? (
                  <span className="allergy-text">
                    "{c.specialInstructions}"
                  </span>
                ) : (
                  `"${c.specialInstructions}"`
                )}
              </div>
            )}
          </div>
        </div>
      );
    } catch (e) {
      const hasAllergy = String(customs).toLowerCase().includes("allergy");
      return (
        <div
          className={`highlight-custom-box ${hasAllergy ? "has-allergy" : ""}`}
        >
          {hasAllergy ? (
            <span className="allergy-text">{String(customs)}</span>
          ) : (
            String(customs)
          )}
        </div>
      );
    }
  };

  const getTimerUrgency = () => {
    if (elapsed >= 15) return "urgency-critical";
    if (elapsed >= 8) return "urgency-warning";
    return "urgency-normal";
  };

  // Check if order has any allergy in items
  const hasAllergyInOrder = () => {
    if (!order.items) return false;
    return order.items.some((item) => {
      if (item.customizations) {
        const customStr =
          typeof item.customizations === "string"
            ? item.customizations
            : JSON.stringify(item.customizations);
        return customStr.toLowerCase().includes("allergy");
      }
      return false;
    });
  };

  const handleStatusUpdate = async (newStatus) => {
    if (isLoading) return; // Prevent multiple clicks
    setIsLoading(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`order-card status-${order.status.toLowerCase()} ${hasAllergyInOrder() ? "has-allergy-warning" : ""}`}
    >
      <div className="card-header">
        <div className="table-badge">
          <span className="table-label">TABLE</span>
          <span className="table-id">{order.table}</span>
        </div>
        <div className={`time-badge ${getTimerUrgency()}`}>
          <Timer size={14} />
          <span>{elapsed}m</span>
        </div>
      </div>

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
              <>
                <Loader2 size={18} className="spinner-animation" />
                PROCESSING...
              </>
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
              <>
                <Loader2 size={18} className="spinner-animation" />
                PROCESSING...
              </>
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
              <>
                <Loader2 size={18} className="spinner-animation" />
                PROCESSING...
              </>
            ) : (
              "SERVED / CLEAR"
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
});

// --- HELPER FUNCTION: Convert reservation to order format ---
const convertReservationToOrder = (reservation) => {
  return {
    id: reservation.id || `RES-${Date.now()}`,
    table: reservation.tableLabel || "Reservation",
    status: "pending",
    timestamp: new Date().toISOString(),
    items: reservation.selectedItems || reservation.packages || [],
    instructions: `${reservation.allergy ? `Allergy: ${reservation.allergy} | ` : ""}${reservation.occasion ? `Occasion: ${reservation.occasion}` : ""}`,
  };
};

// --- MAIN KITCHEN PAGE ---
const KitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingOrderId, setLoadingOrderId] = useState(null);
  const location = useLocation();

  // ============ 1. LOAD ALL ACTIVE ORDERS FROM DATABASE ============
  const loadActiveOrders = async () => {
    try {
      setIsLoading(true);
      console.log("📡 Loading active orders from database...");

      // Use your existing API endpoint
      const response = await axios.get(`${API_URL}/orders/active`);

      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Loaded ${response.data.length} active orders`);

        // Transform the data to match KitchenPage expected format
        const formattedOrders = response.data.map((order) => ({
          id: order.id,
          table: order.table,
          status: order.status,
          timestamp: order.timestamp,
          items: order.items.map((item) => ({
            name: item.name,
            qty: item.quantity,
            customizations: item.customizations,
          })),
        }));

        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error("❌ Error loading active orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============ 2. SAVE TO LOCALSTORAGE FOR PERSISTENCE ============
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem("kitchen_orders", JSON.stringify(orders));
    }
  }, [orders]);

  // ============ 3. SETUP SOCKET LISTENERS ============
  useEffect(() => {
    console.log("🔌 Kitchen monitoring active...");

    // Load existing orders from database when page opens
    loadActiveOrders();

    socket.on("connect", () => console.log("✅ Socket Connected"));

    // Listen for new orders from kiosk
    socket.on("send_order", (data) => {
      console.log("📩 New kiosk order received:", data);
      // Immediately refresh orders from database
      loadActiveOrders();
    });

    // Listen for regular orders
    socket.on("new_order", (data) => {
      console.log("📩 New order received:", data);
      loadActiveOrders();
    });

    // Listen for reservation orders
    socket.on("new_reservation", (reservationData) => {
      console.log("📩 New reservation order received:", reservationData);
      loadActiveOrders();
    });

    // Listen for order status updates
    socket.on("order_status_updated", (data) => {
      console.log("🔄 Order status updated:", data);
      loadActiveOrders();
    });

    // Handle data passed from navigation
    if (location.state?.newOrder) {
      loadActiveOrders();
      window.history.replaceState({}, document.title);
    }

    return () => {
      socket.off("send_order");
      socket.off("new_order");
      socket.off("new_reservation");
      socket.off("order_status_updated");
    };
  }, [location.state]);

  // ============ 4. POLLING FALLBACK (every 15 seconds) ============
  useEffect(() => {
    const pollInterval = setInterval(() => {
      console.log("🔄 Polling for updates...");
      loadActiveOrders();
    }, 15000); // Poll every 15 seconds as fallback

    return () => clearInterval(pollInterval);
  }, []);

  // ============ UPDATE ORDER STATUS ============
  const updateStatus = async (id, newStatus) => {
    setLoadingOrderId(id);
    try {
      console.log(`📡 Updating order ${id} to ${newStatus}...`);

      const response = await axios.put(`${API_URL}/orders/${id}/status`, {
        status: newStatus,
      });

      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Order ${id} updated to ${newStatus}`);
        // Refresh orders from database
        await loadActiveOrders();

        // Emit to other connected clients
        socket.emit("order_status_update", { orderId: id, newStatus });
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      console.error("❌ Failed to update order status:", err.message);
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoadingOrderId(null);
    }
  };

  // Filter logic
  const filteredOrders = orders.filter(
    (o) => filter === "all" || o.status === filter,
  );

  if (isLoading && orders.length === 0) {
    return (
      <div className="kitchen-wrapper">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading kitchen queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kitchen-wrapper">
      <header className="header">
        <div className="header-title">
          <div className="live-indicator" />
          <h1>Kitchen Status</h1>
          <span className="order-count">{orders.length} Active</span>
        </div>

        <div className="filter-group">
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

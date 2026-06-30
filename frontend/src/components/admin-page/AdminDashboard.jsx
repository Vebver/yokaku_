import React, { useState, useEffect, useRef } from "react";
import api, { SOCKET_URL } from "../../api";
import io from "socket.io-client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Info,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Menu,
  LogOut,
  ChevronLeft,
  PhilippinePeso,
  Bell,
  RefreshCw,
  Trash2,
  Archive,
} from "lucide-react";

// Internal Components
import Billing from "./Billing";
import Inventory from "./Inventory";
import Product from "./Product";
import Reports from "./Reports";
import Profile from "./Profile";
import Categories from "./Categories";
import RecipeManager from "./RecipeManager";
import AccountManagement from "./AccountManagement";
import TableStatus from "./TableStatus";
import Maintenance from "./Maintenance";
import OnlineReservations from "./OnlineReservations";
import WalkInReservations from "./WalkInReservations";
import AuditLogs from "./AuditLogs";

import "../../Style/AdminDashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const Icons = {
  Dashboard: () => <i className="bi bi-speedometer2"></i>,
  Inventory: () => <i className="bi bi-boxes"></i>,
  Recipe: () => <i className="bi bi-journal-bookmark"></i>,
  Categories: () => <i className="bi bi-tags"></i>,
  Products: () => <i className="bi bi-box-seam"></i>,
  Sales: () => <i className="bi bi-graph-up-arrow"></i>,
  Billing: () => <i className="bi bi-receipt"></i>,
  Profile: () => <i className="bi bi-person-circle"></i>,
  Account: () => <i className="bi bi-people"></i>,
  Maintenance: () => <i className="bi bi-tools"></i>,
  Reservations: () => <i className="bi bi-calendar-check"></i>,
  Audit: () => <i className="bi bi-shield-lock"></i>, 
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
  { id: "table-status", label: "Table Status", icon: Icons.Dashboard },
  {
    id: "online-reservations",
    label: "Online Bookings",
    icon: Icons.Reservations,
  },
  { id: "walk-ins", label: "Walk-ins / Kiosk", icon: Icons.Billing },
  { id: "billing", label: "Payments", icon: Icons.Billing },
  { id: "report", label: "Reports", icon: Icons.Sales },
  { id: "products", label: "Menu Items", icon: Icons.Products },
  { id: "recipe", label: "Recipes", icon: Icons.Recipe },
  { id: "categories", label: "Categories", icon: Icons.Categories },
  { id: "inventory", label: "Inventory", icon: Icons.Inventory },
  { id: "account", label: "Account Manage", icon: Icons.Account },
  { id: "profile", label: "Admin Profile", icon: Icons.Profile },
  { id: "audit-logs", label: "Audit Logs", icon: Icons.Audit },
  { id: "maintenance", label: "Maintenance", icon: Icons.Maintenance },
];

const StatCard = ({ title, value, color, icon: Icon }) => (
  <div className="col-12 col-md-4 mb-3 mt-0">
    <div
      className="card border-0 shadow-sm rounded-4 p-3 bg-white"
      style={{ minHeight: "100px", display: "block" }}
    >
      <div className="d-flex align-items-center h-100 gap-3">
        <div
          className={`bg-${color}-subtle text-${color} d-flex align-items-center justify-content-center flex-shrink-0`}
          style={{ width: "48px", height: "48px", borderRadius: "12px" }}
        >
          <Icon size={22} />
        </div>

        <div className="overflow-hidden">
          <p
            className="text-muted fw-bold text-uppercase mb-1"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.8px",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </p>
          <h4 className="fw-bold mb-0 text-dark">{value}</h4>
        </div>
      </div>
    </div>
  </div>
);

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 992);
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState([]);

  // Integrated Notification & Modal States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const [stats, setStats] = useState({
    totalBookings: 0,
    activeTables: 0,
    kitchenQueue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    todayRevenue: 0,
    avgOrder: 0,
    totalOrders: 0,
    revenueTrend: [],
    trendLabels: [],
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId"); 

    if (token && role === "admin") {
      setIsAuthenticated(true);
      fetchDashboardData();
      fetchNotifications();

      const socket = io(SOCKET_URL, { 
        transports: ["websocket", "polling"],
        reconnection: true 
      });

      socket.on("connect", () => {
        if (userId) {
          socket.emit("join", userId);
        }
      });

      // Standard Notification listener
      socket.on("new_notification", (notification) => {
        setNotifications((prev) => {
          const isDuplicate = prev.some(n => 
            (n.notification_id && n.notification_id === notification.notification_id) || 
            (n.id && n.id === notification.id) ||
            (n.message === notification.message && n.created_at === notification.created_at)
          );

          if (isDuplicate) return prev;
          return [notification, ...prev];
        });

        setUnreadCount((prev) => prev + 1);
        const audio = new Audio("/notification-light.mp3");
        audio.play().catch(() => {});
      });

      socket.on("new_reservation", (reservationData) => {
        fetchDashboardData();
        fetchNotifications();
      });

      socket.on("table_updated", () => {
        fetchDashboardData();
      });

      return () => {
        socket.disconnect();
      };
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 992) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Notification Operations
  const fetchNotifications = async () => {
    try {
      const res = await api.get(`/notifications`);
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(
        notifications.map((n) =>
          n.notification_id === id ? { ...n, is_read: 1 } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put(`/notifications/read-all`);
      setNotifications(notifications.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;

    try {
      await api.delete(`/notifications/${notificationToDelete}`);
      setNotifications(
        notifications.filter((n) => n.notification_id !== notificationToDelete)
      );
      // Fetch updated count
      const res = await api.get(`/notifications`);
      setUnreadCount(res.data.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error("Error deleting notification:", err);
    } finally {
      setShowConfirmDelete(false);
      setNotificationToDelete(null);
    }
  };

  const openDeleteConfirm = (id, e) => {
    e.stopPropagation();
    setNotificationToDelete(id);
    setShowConfirmDelete(true);
  };

  const handleViewReservation = async (reservationId, e) => {
    if (e) e.stopPropagation();
    setModalLoading(true);
    setShowReservationModal(true);
    try {
      const response = await api.get(`/reservations/details/${reservationId}`);
      setSelectedReservation(response.data.reservation);
    } catch (err) {
      console.error("Error fetching reservation details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const getReservationId = (notification) => {
    if (notification.reservation_id && notification.reservation_id !== "null") {
      return notification.reservation_id;
    }

    let match = notification.message?.match(/Reservation ID: ([A-Z0-9-]+)/i);
    if (match) return match[1];

    match = notification.title?.match(/([A-Z0-9-]+)/i);
    if (match) return match[1];

    match = notification.message?.match(/([A-Z0-9]{8,})/i);
    if (match) return match[1];

    return null;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, scheduleRes] = await Promise.all([
        api.get(`/admin/stats`),
        api.get(`/admin/today-schedule`),
      ]);

      const data = statsRes.data;

      setStats({
        totalBookings: data.totalBookings || 0,
        activeTables: data.activeTables || 0,
        kitchenQueue: data.kitchenQueue || 0,
        weeklyRevenue: data.weeklyRevenue || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        todayRevenue: data.todayRevenue || 0,
        avgOrder: data.avgOrder || 0,
        totalOrders: data.totalOrders || 0,
        revenueTrend: data.revenueTrend || [],
        trendLabels: data.trendLabels || [],
      });

      setTodaySchedule(scheduleRes.data);
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = () => {
    fetchDashboardData();
    fetchNotifications();
  };

  const formatCurrency = (val) =>
    `₱${Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const chartData = {
    labels: stats.trendLabels,
    datasets: [
      {
        label: "Revenue",
        data: stats.revenueTrend,
        borderColor: "#0d6efd",
        backgroundColor: "rgba(13, 110, 253, 0.05)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        borderWidth: 3,
      },
    ],
  };

  const MiniFinanceCard = ({ title, value, icon: Icon, colorClass, isNum }) => (
    <div className="col-6">
      <div className="finance-mini-card p-3 rounded-4 shadow-sm bg-white border h-100">
        <div className={`icon-box ${colorClass} mb-2`}>
          <Icon size={18} />
        </div>
        <p
          className="text-muted fw-bold text-uppercase mb-1"
          style={{ fontSize: "0.6rem" }}
        >
          {title}
        </p>
        <h5 className="fw-bold mb-0 text-dark">
          {isNum ? value : formatCurrency(value)}
        </h5>
      </div>
    </div>
  );

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";

    let date;
    if (dateStr.toString().includes("Z")) {
      date = new Date(dateStr);
    } else {
      const utcStr = dateStr.toString().replace(" ", "T") + "Z";
      date = new Date(utcStr);
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 30) return "just now";
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  };

  const formatDateReadable = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return "";
    if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;

    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return "--:--";

    const timePart = timeStr.includes("T") ? timeStr.split("T")[1] : timeStr;
    const [hoursStr, minutesStr] = timePart.split(":");
    
    let hour = parseInt(hoursStr, 10);
    const minutes = minutesStr ? minutesStr.substring(0, 2) : "00";

    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const DashboardOverview = () => (
    <div className="dashboard-content">
      <h1 className="fw-bold mb-3">Welcome back, Admin</h1>

      {/* TODAY'S TIMELINE PANEL */}
      
      <div className="mb-4 bg-white p-3 rounded-4 shadow-sm border-start border-4 border-warning">
        <div className="d-flex align-items-center mb-2">
          <Info size={16} className="text-warning me-2" />
          <span className="fw-bold small">Today's Timeline</span>
        </div>
        <div className="d-flex gap-2 overflow-auto no-scrollbar pb-1">
          {todaySchedule.length > 0 ? (
            todaySchedule.map((res, i) => (
              <div
                key={i}
                className="timeline-badge bg-light px-3 py-1.5 rounded-pill border small fw-semibold d-flex align-items-center gap-1"
                style={{ whiteSpace: "nowrap" }}
              >
                <span className="text-primary">
                  { formatTime12Hour(res.reservation_time)}
                </span>
                <span className="text-muted opacity-50">|</span>
                <span>{res.first_name} {res.last_name || ""}</span>
                <span className="text-muted opacity-50">|</span>
                
                <span 
                  className="badge bg-secondary-subtle text-secondary border text-uppercase" 
                  style={{ fontSize: "0.62rem", padding: "3px 6px" }}
                >
                  {res.reservation_type === "event" ? "🎉 Event Space" : "🍽️ Table Dining"}
                </span>

                <span 
                  className={`badge text-uppercase border ${
                    res.status?.toLowerCase() === "seated" 
                      ? "bg-danger-subtle text-danger border-danger-subtle" 
                      : "bg-warning-subtle text-warning-emphasis border-warning-subtle"
                  }`}
                  style={{ fontSize: "0.62rem", padding: "3px 6px" }}
                >
                  {res.status || "CONFIRMED"}
                </span>

                <span className="badge bg-dark" style={{ fontSize: "0.62rem", padding: "3px 6px" }}>
                  {res.reservation_type === "event" ? "All Tables occupied" : (res.table_names ? `Table: ${res.table_names}` : "No Table")}
                </span>
              </div>
            ))
          ) : (
            <span className="text-muted small p-1">No arrivals for today.</span>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <h2 className="fw-bold mb-00">Report Overview</h2>
      <div className="row g-3 mb-4">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          color="primary"
          icon={TrendingUp}
        />
        <StatCard
          title="Tables Occupied"
          value={stats.activeTables}
          color="success"
          icon={ShoppingBag}
        />
        <StatCard
          title="Kitchen Queue"
          value={stats.kitchenQueue}
          color="info"
          icon={Info}
        />
      </div>

      {/* FINANCIAL SECTION & CHART */}
      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="row g-3">
            <MiniFinanceCard
              title="Weekly Revenue"
              value={stats.weeklyRevenue}
              icon={TrendingUp}
              colorClass="text-success bg-success-subtle"
            />
            <MiniFinanceCard
              title="Today's Revenue"
              value={stats.todayRevenue}
              icon={PhilippinePeso}
              colorClass="text-primary bg-primary-subtle"
            />
            <MiniFinanceCard
              title="Avg. Order"
              value={stats.avgOrder}
              icon={ShoppingBag}
              colorClass="text-info bg-info-subtle"
            />
            <MiniFinanceCard
              title="Total Orders"
              value={stats.totalOrders}
              icon={CreditCard}
              colorClass="text-warning bg-warning-subtle"
              isNum={true}
            />
          </div>
        </div>

        {/* REVENUE ANALYTICS CHART */}
        <div className="col-lg-7">
          <div className="bg-white p-4 rounded-4 shadow-sm border h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="fw-bold mb-0">Revenue Analytics</h6>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                Total: {formatCurrency(stats.weeklyRevenue)}
              </span>
            </div>
            <div style={{ height: "220px" }}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { callback: (v) => "₱" + v.toLocaleString() },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* FLOOR STATUS */}
      <div className="bg-white rounded-4 shadow-sm border p-4 overflow-hidden">
        <div
          className="floor-status-wrapper"
          style={{ maxHeight: "500px", overflowY: "auto", overflowX: "hidden" }}
        >
          <h2 className="fw-bold mb-3">Table Status</h2>
          <TableStatus compact={true} />
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    const sections = {
      dashboard: <DashboardOverview />,
      billing: <Billing />,
      inventory: <Inventory />,
      recipe: <RecipeManager />,
      products: <Product />,
      categories: <Categories />,
      report: (
        <Reports
          data={{
            summary: {
              daily_revenue: stats.todayRevenue,
              aov: stats.avgOrder,
              total_orders: stats.totalOrders,
            },
            monthlyTrend: stats.revenueTrend.map((val, i) => ({
              label: stats.trendLabels[i],
              value: val,
            })),
          }}
        />
      ),
      profile: <Profile />,
      "online-reservations": <OnlineReservations />,
      "walk-ins": <WalkInReservations />,
      account: <AccountManagement />,
      "table-status": <TableStatus />,
      maintenance: <Maintenance />,
       "audit-logs": <AuditLogs />,
    };
    return sections[activeSection] || <DashboardOverview />;
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div
      className={`admin-app-container ${sidebarOpen ? "sb-open" : "sb-closed"}`}
    >
      {/* Sidebar */}
      <aside className="app-sidebar shadow">
        <div className="sidebar-header-branding">
          <div className="brand-logo">H</div>
          <span className="brand-name fw-bold">HANGOUT</span>
        </div>

        <nav className="sidebar-nav-list custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                if (window.innerWidth <= 992) setSidebarOpen(false);
              }}
              className={`nav-link w-100 text-start border-0 rounded-3 py-4 px-3 d-flex align-items-center mb-2 transition-all ${
                activeSection === item.id
                  ? "bg-primary text-white active"
                  : "text-secondary bg-transparent"
              }`}
            >
              <span className="nav-icon-wrapper">
                <item.icon />
              </span>
              <span className="nav-text-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer-action">
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span className="nav-text-label ms-2">Logout</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {sidebarOpen && window.innerWidth <= 992 && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <div className="app-main-viewport">
        <header className="app-top-nav bg-white shadow-sm px-4">
          <button
            className="toggle-sidebar-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>

          <div className="ms-auto d-flex align-items-center gap-3">
            {/* MANUAL REFRESH BUTTON */}
            <button
              className="btn btn-light p-0 rounded-circle border-0 d-flex align-items-center justify-content-center"
              onClick={handleRefreshAll}
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: "#f8f9fa",
              }}
              title="Refresh Data"
            >
              <RefreshCw size={18} className="text-secondary" />
            </button>

            {/* REAL-TIME NOTIFICATION BELL dropdown widget */}
            <div className="position-relative me-2" ref={notificationRef}>
              <button
                className="btn btn-light position-relative p-0 rounded-circle border-0 d-flex align-items-center justify-content-center"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: "#f8f9fa",
                }}
              >
                <Bell size={20} className="text-secondary" />
                {unreadCount > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white"
                    style={{ fontSize: "0.65rem", padding: "0.25em 0.5em" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  className="card shadow-lg border-0 rounded-4 position-absolute end-0 mt-2 py-2 admin-notif-dropdown"
                  style={{
                    width: "380px",
                    zIndex: 1050,
                    fontSize: "0.85rem",
                    right: 0,
                  }}
                >
                  <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center bg-light rounded-top-4">
                    <span className="fw-bold text-dark">
                      Notifications Inbox
                    </span>
                    {unreadCount > 0 && (
                      <button
                        className="btn btn-link btn-xs text-decoration-none p-0 text-primary fw-bold"
                        onClick={markAllAsRead}
                        style={{ fontSize: "0.75rem" }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div
                    className="overflow-auto custom-scrollbar"
                    style={{ maxHeight: "320px" }}
                  >
                    {notifications.length > 0 ? (
                      notifications.map((notif, index) => {
                        const reservationId = getReservationId(notif);
                        return (
                          <div
                            key={notif.notification_id || index}
                            className={`notification-item ${!notif.is_read ? "unread" : "read"}`}
                          >
                            <div className="notification-card-content">
                              <div className="notification-icon">
                                <span className="notification-emoji">🔔</span>
                              </div>
                              <div className="notification-content">
                                <div className="notification-top">
                                  <span className="notification-title">
                                    {notif.title}
                                  </span>
                                  <span className="notification-time">
                                    {formatTimeAgo(notif.created_at)}
                                  </span>
                                </div>
                                <p className="notification-message">
                                  {notif.message}
                                </p>

                                <div className="notification-actions-bottom">
                                  <div className="notification-actions">
                                    <button
                                      className={`mark-read-btn ${notif.is_read ? "already-read" : ""}`}
                                      onClick={(e) =>
                                        !notif.is_read &&
                                        markAsRead(notif.notification_id, e)
                                      }
                                      disabled={notif.is_read}
                                    >
                                      {notif.is_read ? "Read" : "Mark as read"}
                                    </button>
                                    {reservationId && (
                                      <button
                                        className="view-btn"
                                        onClick={(e) =>
                                          handleViewReservation(reservationId, e)
                                        }
                                      >
                                        View
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    className="delete-notif-btn btn-xs"
                                    onClick={(e) =>
                                      openDeleteConfirm(notif.notification_id, e)
                                    }
                                    title="Move to trash"
                                  >
                                    <Trash2 size={13} className="me-1" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <p className="mb-0 small">Your inbox is empty.</p>
                      </div>
                    )}
                  </div>
                  <div className="px-3 pt-2 text-center border-top">
                    <button
                      className="btn btn-link btn-sm text-decoration-none text-primary fw-bold p-0"
                      onClick={() => {
                        setActiveSection("online-reservations");
                        setShowNotifications(false);
                      }}
                    >
                      Open Reservation Manager
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-end d-none d-sm-block">
              <p className="mb-0 fw-bold small text-dark">HANGOUT MANAGER</p>
            </div>
            <div className="avatar-circle">H</div>
          </div>
        </header>

        <main className="app-content-area px-4 py-3">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : (
            renderSection()
          )}
        </main>
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1100 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "420px" }}>
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pt-4 px-4 pb-1">
                <h5 className="modal-title fw-bold">Delete Notification</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmDelete(false)}
                ></button>
              </div>
              <div className="modal-body px-4 pb-4">
                <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                  Are you sure you want to delete this notification? It will be
                  moved to trash and automatically deleted after 30 days.
                </p>
              </div>
              <div className="modal-footer border-top-0 px-4 pb-4 gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-light rounded-3 px-3 py-1.5 fw-semibold"
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger rounded-3 px-3 py-1.5 fw-semibold"
                  style={{ fontSize: "0.8rem" }}
                  onClick={handleDeleteNotification}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Details Modal */}
      {showReservationModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1100 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "460px" }}>
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pt-4 px-4 pb-2">
                <h5 className="modal-title fw-bold text-dark">Reservation Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowReservationModal(false);
                    setSelectedReservation(null);
                  }}
                ></button>
              </div>
              <div className="modal-body px-4 pb-3">
                {modalLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary spinner-border-sm mb-2"></div>
                    <p className="text-muted small">Loading reservation details...</p>
                  </div>
                ) : selectedReservation ? (
                  <div className="d-flex flex-column gap-2" style={{ fontSize: "0.85rem" }}>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                      <span className="text-muted fw-semibold">Reservation ID:</span>
                      <span className="fw-bold text-dark">{selectedReservation.reservation_id}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                      <span className="text-muted fw-semibold">Date:</span>
                      <span className="fw-semibold text-dark">{formatDateReadable(selectedReservation.reservation_date)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                      <span className="text-muted fw-semibold">Time:</span>
                      <span className="fw-semibold text-dark">
                        {formatTimeDisplay(selectedReservation.reservation_time)} - {formatTimeDisplay(selectedReservation.end_time)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                      <span className="text-muted fw-semibold">Guests:</span>
                      <span className="fw-semibold text-dark">{selectedReservation.num_guests}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                      <span className="text-muted fw-semibold">Status:</span>
                      <span className={`badge text-uppercase ${
                        selectedReservation.status?.toLowerCase() === "completed"
                          ? "bg-success-subtle text-success"
                          : selectedReservation.status?.toLowerCase() === "pending"
                          ? "bg-warning-subtle text-warning"
                          : "bg-secondary-subtle text-secondary"
                      }`}>
                        {selectedReservation.status}
                      </span>
                    </div>
                    {selectedReservation.assigned_tables && (
                      <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                        <span className="text-muted fw-semibold">Tables:</span>
                        <span className="fw-semibold text-dark">{selectedReservation.assigned_tables}</span>
                      </div>
                    )}
                    {selectedReservation.package_name && (
                      <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                        <span className="text-muted fw-semibold">Package:</span>
                        <span className="fw-semibold text-dark">{selectedReservation.package_name}</span>
                      </div>
                    )}
                    {selectedReservation.payment_method && (
                      <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                        <span className="text-muted fw-semibold">Payment Method:</span>
                        <span className="fw-semibold text-dark">{selectedReservation.payment_method}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                      <span className="text-muted fw-semibold">Payment Status:</span>
                      <span className="fw-semibold text-dark">{selectedReservation.payment_status || "Pending"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">
                    No reservation details found.
                  </div>
                )}
              </div>
              <div className="modal-footer border-top-0 px-4 pb-4">
                <button
                  type="button"
                  className="btn btn-primary rounded-3 w-100 py-1.5 fw-semibold"
                  style={{ fontSize: "0.85rem" }}
                  onClick={() => {
                    setShowReservationModal(false);
                    setSelectedReservation(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-bg { transition: background-color 0.15s ease-in-out; }
        .hover-bg:hover { background-color: #f8f9fa; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #dee2e6; border-radius: 10px; }

        /* Copied Design Styles */
        .admin-notif-dropdown {
          width: 380px !important;
          max-height: 480px !important;
          padding: 0 !important;
          border-radius: 16px !important;
          overflow: hidden;
        }
        .notification-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f3f5;
          transition: background-color 0.15s ease;
        }
        .notification-item.unread {
          background-color: #f8f9fa;
          border-left: 3px solid #0d6efd;
        }
        .notification-item.read {
          background-color: #ffffff;
          border-left: 3px solid transparent;
        }
        .notification-card-content {
          display: flex;
          gap: 12px;
        }
        .notification-icon {
          font-size: 1.25rem;
          display: flex;
          align-items: flex-start;
          padding-top: 2px;
        }
        .notification-content {
          flex: 1;
        }
        .notification-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .notification-title {
          font-weight: 600;
          color: #212529;
          font-size: 0.85rem;
        }
        .notification-time {
          font-size: 0.7rem;
          color: #868e96;
        }
        .notification-message {
          font-size: 0.8rem;
          color: #495057;
          margin-bottom: 8px;
          line-height: 1.4;
          text-align: left;
        }
        .notif-res-id-badge {
          display: inline-block;
          font-size: 0.7rem;
          background-color: #e9ecef;
          color: #495057;
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .notification-actions-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .notification-actions {
          display: flex;
          gap: 6px;
        }
        .mark-read-btn, .view-btn, .delete-notif-btn {
          font-size: 0.7rem;
          padding: 3px 6px;
          border-radius: 4px;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.1s ease;
        }
        .mark-read-btn {
          background-color: #e7f5ff;
          color: #228be6;
        }
        .mark-read-btn:hover {
          background-color: #d0ebff;
        }
        .mark-read-btn.already-read {
          background-color: transparent;
          color: #adb5bd;
          cursor: default;
          padding-left: 0;
        }
        .view-btn {
          background-color: #f1f3f5;
          color: #495057;
        }
        .view-btn:hover {
          background-color: #e9ecef;
        }
        .delete-notif-btn {
          background-color: transparent;
          color: #fa5252;
          display: flex;
          align-items: center;
          padding: 3px 6px;
        }
        .delete-notif-btn:hover {
          background-color: #fff5f5;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
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
  Bell, // Imported Bell for notifications
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

import "../../Style/AdminDashboard.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
};

const navItems = [
  // MAIN VIEW
  { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
  //FLOOR OPERATION
  { id: "table-status", label: "Table Status", icon: Icons.Dashboard },
  {
    id: "online-reservations",
    label: "Online Bookings",
    icon: Icons.Reservations,
  },
  { id: "walk-ins", label: "Walk-ins / Kiosk", icon: Icons.Billing },
  // TRANSACTION & INSIGHTS
  { id: "billing", label: "Payments", icon: Icons.Billing },
  { id: "report", label: "Reports", icon: Icons.Sales },
  // MENU INVENTORY
  { id: "products", label: "Menu Items", icon: Icons.Products },
  { id: "recipe", label: "Recipes", icon: Icons.Recipe },
  { id: "categories", label: "Categories", icon: Icons.Categories },
  { id: "inventory", label: "Inventory", icon: Icons.Inventory },
  //ADMIN
  { id: "account", label: "Account Manage", icon: Icons.Account },
  { id: "profile", label: "Admin Profile", icon: Icons.Profile },
  { id: "maintenance", label: "Maintenance", icon: Icons.Maintenance },
];

const StatCard = ({ title, value, color, icon: Icon }) => (
  <div className="col-12 col-md-4 mb-3 mt-0">
    <div
      className="card border-0 shadow-sm rounded-4 p-3 bg-white"
      style={{ minHeight: "100px", display: "block" }}
    >
      <div className="d-flex align-items-center h-100 gap-3">
        {/* Icon Box */}
        <div
          className={`bg-${color}-subtle text-${color} d-flex align-items-center justify-content-center flex-shrink-0`}
          style={{ width: "48px", height: "48px", borderRadius: "12px" }}
        >
          <Icon size={22} />
        </div>

        {/* Text Content */}
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
  
  // Notification drawer state
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

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
    if (token && role === "admin") {
      setIsAuthenticated(true);
      fetchDashboardData();
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  // Handle click outside to close the notification popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [statsRes, scheduleRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`, config),
        axios.get(`${API_BASE}/admin/today-schedule`, config),
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

  const DashboardOverview = () => (
    <div className="dashboard-content">
      <h1 className="fw-bold mb-3">Welcome back, Admin</h1>
      
      {/* TIMELINE */}
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
                className="timeline-badge bg-light px-3 py-1 rounded-pill border small fw-semibold"
              >
                <span className="text-primary">
                  {res.reservation_time?.substring(0, 5)}
                </span>
                <span className="mx-2 opacity-50">|</span>
                <span>{res.first_name}</span>
                <span className="badge bg-dark ms-2">T-{res.table_names}</span>
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
            
            {/* NOTIFICATION BELL dropdown widget */}
            <div className="position-relative me-2" ref={notificationRef}>
              <button 
                className="btn btn-light position-relative p-0 rounded-circle border-0 d-flex align-items-center justify-content-center"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ width: "40px", height: "40px", backgroundColor: "#f8f9fa" }}
              >
                <Bell size={20} className="text-secondary" />
                {todaySchedule.length > 0 && (
                  <span 
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" 
                    style={{ fontSize: "0.65rem", padding: "0.25em 0.5em" }}
                  >
                    {todaySchedule.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div 
                  className="card shadow-lg border-0 rounded-4 position-absolute end-0 mt-2 py-2"
                  style={{ width: "320px", zIndex: 1050, fontSize: "0.85rem", right: 0 }}
                >
                  <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center bg-light rounded-top-4">
                    <span className="fw-bold text-dark">Today's Schedule</span>
                    <span className="badge bg-primary text-white">{todaySchedule.length} active</span>
                  </div>
                  <div className="overflow-auto custom-scrollbar" style={{ maxHeight: "280px" }}>
                    {todaySchedule.length > 0 ? (
                      todaySchedule.map((res, index) => (
                        <div 
                          key={index} 
                          className="px-3 py-2 border-bottom hover-bg transition-all"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setActiveSection("online-reservations");
                            setShowNotifications(false);
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold text-dark">{res.first_name} {res.last_name || ""}</span>
                            <span className="badge bg-primary-subtle text-primary fw-bold" style={{ fontSize: "0.7rem" }}>
                              {res.reservation_time?.substring(0, 5)}
                            </span>
                          </div>
                          <div className="text-muted d-flex align-items-center gap-2 smaller" style={{ fontSize: "0.78rem" }}>
                            <span>Table: <strong className="text-dark">T-{res.table_names}</strong></span>
                            <span>•</span>
                            <span>Guests: <strong className="text-dark">{res.num_guests || 1}</strong></span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <p className="mb-0 small">No reservations scheduled for today.</p>
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
              <p className="mb-0 fw-bold small text-dark">Admin User</p>
              <p className="mb-0 text-muted smaller">System Administrator</p>
            </div>
            <div className="avatar-circle">A</div>
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

      <style>{`
        .hover-bg { transition: background-color 0.15s ease-in-out; }
        .hover-bg:hover { background-color: #f8f9fa; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #dee2e6; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
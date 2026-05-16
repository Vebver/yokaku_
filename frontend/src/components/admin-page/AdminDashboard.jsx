// AdminDashboard.jsx
import React, { useState, useEffect } from "react";
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
import { Line } from "react-chartjs-2"; // Added Line for the graph
import { Info, TrendingUp, DollarSign, ShoppingBag, CreditCard } from "lucide-react";

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
  Legend
);

// Sidebar Icons
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
  { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
  { id: "categories", label: "Categories", icon: Icons.Categories },
  { id: "inventory", label: "Inventory", icon: Icons.Inventory },
  { id: "recipe", label: "Recipes", icon: Icons.Recipe },
  { id: "products", label: "Menu Items", icon: Icons.Products },
  { id: "report", label: "Reports", icon: Icons.Sales },
  { id: "online-reservations", label: "Online Bookings", icon: Icons.Reservations },
  { id: "walk-ins", label: "Walk-ins / Kiosk", icon: Icons.Billing },
  { id: "billing", label: "Payments", icon: Icons.Billing },
  { id: "profile", label: "Admin Profile", icon: Icons.Profile },
  { id: "account", label: "Account Manage", icon: Icons.Account },
  { id: "table-status", label: "Table Status", icon: Icons.Dashboard },
  { id: "maintenance", label: "Maintenance", icon: Icons.Maintenance },
];

// Top Stats Card Component
const StatCard = ({ title, value, color, icon }) => (
  <div className="col-12 col-md-4">
    <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
      <div className="card-body p-3 d-flex align-items-center gap-3">
        <div className={`d-flex align-items-center justify-content-center rounded-circle bg-${color}-subtle text-${color}`}
          style={{ width: "45px", height: "45px", flexShrink: 0 }}>
          <i className={`bi ${icon}`} style={{ fontSize: "1.2rem" }}></i>
        </div>
        <div>
          <p className="text-muted fw-bold text-uppercase mb-0" style={{ fontSize: "0.65rem" }}>{title}</p>
          <h4 className="fw-bold mb-0 text-dark lh-1">{value}</h4>
        </div>
      </div>
    </div>
  </div>
);

// New Mini Card for Financial Section
const MiniFinanceCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="col-6">
    <div className="finance-mini-card p-3 rounded-4 shadow-sm bg-white border h-100 d-flex flex-column justify-content-between">
      <div className={`icon-box ${colorClass} mb-2`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-muted small fw-semibold mb-1">{title}</p>
        <h5 className="fw-bold mb-0 text-dark">{value}</h5>
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
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeTables: 0,
    kitchenQueue: 0,
    // Mock financial data (replace with API data later)
    monthlyRevenue: "₱0.00",
    todayRevenue: "₱0.00",
    avgOrder: "₱0.00",
    totalOrders: "0"
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
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [statsRes, scheduleRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`, config),
        axios.get(`${API_BASE}/admin/today-schedule`, config),
      ]);
      // Merging existing stats with mock/fetched financial data
      setStats(prev => ({ ...prev, ...statsRes.data }));
      setTodaySchedule(scheduleRes.data);
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  // Chart Configuration
  const chartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Revenue",
        data: [1200, 1900, 3000, 5000, 2000, 3000, 4500],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: "#f0f0f0" } },
      x: { grid: { display: false } }
    }
  };

  const DashboardOverview = () => (
    <div className="p-0">
      {/* 1. TIMELINE */}
      <div className="mb-3 bg-white p-3 rounded-3 shadow-sm border-start border-4 border-warning">
        <div className="d-flex align-items-center mb-2">
          <Info size={16} className="text-warning me-2" />
          <span className="fw-bold small">Today's Timeline</span>
        </div>
        <div className="d-flex gap-2 overflow-auto no-scrollbar pb-1">
          {todaySchedule.length > 0 ? (
            todaySchedule.map((res, i) => (
              <div key={i} className="bg-light px-3 py-2 rounded-3 border small d-inline-block shadow-sm">
                <span className="fw-bold text-primary">{res.reservation_time?.substring(0, 5)}</span>
                <span className="mx-2 text-muted">|</span>
                <span className="fw-semibold">{res.first_name}</span>
                <span className="badge bg-dark ms-2">T-{res.table_names}</span>
              </div>
            ))
          ) : (
            <span className="text-muted small">No arrivals for today.</span>
          )}
        </div>
      </div>

      {/* 2. TOP STATS CARDS */}
      <div className="row g-3 mb-4">
        <StatCard title="Bookings" value={stats.totalBookings} color="primary" icon="bi-calendar-check" />
        <StatCard title="Occupied" value={stats.activeTables} color="success" icon="bi-door-open" />
        <StatCard title="Queue" value={stats.kitchenQueue} color="warning" icon="bi-egg-fried" />
      </div>

      {/* 3. MIDDLE SECTION: FINANCIAL REPORTS (NEW) */}
      <div className="row g-3 mb-4">
        {/* Left: 2x2 Mini Cards */}
        <div className="col-lg-5">
          <div className="row g-3 h-100">
            <MiniFinanceCard title="Monthly Revenue" value={stats.monthlyRevenue || "₱0.00"} icon={TrendingUp} colorClass="text-success bg-success-subtle" />
            <MiniFinanceCard title="Today's Revenue" value={stats.todayRevenue || "₱0.00"} icon={DollarSign} colorClass="text-primary bg-primary-subtle" />
            <MiniFinanceCard title="Avg. Order" value={stats.avgOrder || "₱0.00"} icon={ShoppingBag} colorClass="text-info bg-info-subtle" />
            <MiniFinanceCard title="Total Order" value={stats.totalOrders || "0"} icon={CreditCard} colorClass="text-warning bg-warning-subtle" />
          </div>
        </div>
        
        {/* Right: Graph */}
        <div className="col-lg-7">
          <div className="bg-white p-4 rounded-4 shadow-sm border h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Revenue Analytics</h6>
              <span className="badge bg-light text-dark border">Weekly</span>
            </div>
            <div style={{ height: "220px" }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. FLOOR STATUS SECTION */}
      <div className="mt-2 pb-5">
        <div className="d-flex justify-content-between align-items-center mb-3 px-1">
          <h6 className="fw-bold mb-0 text-dark">Floor Status</h6>
          <button className="btn btn-sm btn-link text-primary fw-bold text-decoration-none" onClick={() => setActiveSection("table-status")}>
            Full View →
          </button>
        </div>
        <div className="bg-white rounded-4 shadow-sm p-3 border d-block w-100 overflow-hidden">
          <TableStatus compact={true} />
        </div>
      </div>
    </div>
  );

  // Remaining render logic...
  const renderSection = () => {
    const sections = {
      dashboard: <DashboardOverview />,
      billing: <Billing />,
      inventory: <Inventory />,
      recipe: <RecipeManager />,
      products: <Product />,
      categories: <Categories />,
      report: <Reports />,
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
    <div className="admin-layout">
      <header className="mobile-header d-lg-none bg-dark text-white px-3 d-flex justify-content-between align-items-center sticky-top shadow">
        <h5 className="fw-bold mb-0">HANGOUT</h5>
        <button className="btn btn-outline-light btn-sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <i className={`bi ${sidebarOpen ? "bi-x-lg" : "bi-list"} fs-3`}></i>
        </button>
      </header>

      {sidebarOpen && window.innerWidth <= 992 && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      <aside className={`admin-sidebar bg-dark text-white ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <div className="sidebar-header d-flex align-items-center p-3">
          <h4 className={`brand-name fw-bold mb-0 transition-all ${sidebarOpen ? "opacity-100" : "opacity-0"}`}>HANGOUT</h4>
          <button className="btn btn-dark btn-sm ms-auto d-none d-lg-block" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-list"}`}></i>
          </button>
        </div>

        <nav className="custom-nav px-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveSection(item.id); if (window.innerWidth <= 992) setSidebarOpen(false); }}
              className={`nav-link w-100 text-start border-0 rounded-2 py-2 px-3 d-flex align-items-center mb-1 transition-all ${activeSection === item.id ? "bg-primary text-white active" : "text-secondary bg-transparent"}`}>
              <div className="nav-icon me-2"><item.icon /></div>
              <span className="nav-label small">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer p-3">
          <button className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center" onClick={handleLogout}>
            <i className="bi bi-box-arrow-left"></i>
            <span className="ms-2 nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <div className={`main-container bg-light ${sidebarOpen ? "margin-expanded" : "margin-collapsed"}`}>
        <main className="content-wrapper">
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : (
            renderSection()
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
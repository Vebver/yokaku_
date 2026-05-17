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
import { Line } from "react-chartjs-2";
import { Info, TrendingUp, DollarSign, ShoppingBag, CreditCard, Menu, LogOut, ChevronLeft } from "lucide-react";

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

const StatCard = ({ title, value, color, icon }) => (
  <div className="col-12 col-md-4">
    {/* Removed any status-line borders (Yellow/Blue/Green things) */}
    <div className="card stat-card shadow-sm border-0">
      <div className="card-body p-3 d-flex align-items-center gap-3">
        <div className={`icon-circle bg-${color}-subtle text-${color}`}>
          <i className={`bi ${icon}`}></i>
        </div>
        <div>
          <p className="text-muted fw-bold text-uppercase mb-0 small-text">{title}</p>
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
 const [stats, setStats] = useState({
    totalBookings: 0,
    activeTables: 0,
    kitchenQueue: 0,
    monthlyRevenue: 0,
    todayRevenue: 0,
    avgOrder: 0,
    totalOrders: 0,
    revenueTrend: [],
    trendLabels: []
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

      const data = statsRes.data;

      // 1. Calculate the Real Total from the Trend (The same way Financial Report does)
      const calculatedTotal = data.revenueTrend?.reduce((acc, val) => acc + Number(val), 0) || 0;

      setStats({
        ...data,
        // Override the monthlyRevenue with the sum of the trend data
        monthlyRevenue: calculatedTotal, 
        todayRevenue: data.todayRevenue || 0,
        avgOrder: data.avgOrder || 0,
        totalOrders: data.totalOrders || 0,
        revenueTrend: data.revenueTrend || [],
        trendLabels: data.trendLabels || []
      });


      setTodaySchedule(scheduleRes.data);
    } catch (error) { console.error("Fetch error", error); } 
    finally { setLoading(false); }
};

   const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { 
    minimumFractionDigits: 2, maximumFractionDigits: 2 
  })}`;

  // 3. SHARED CHART DATA
  const chartData = {
    labels: stats.trendLabels,
    datasets: [{
      label: "Revenue",
      data: stats.revenueTrend,
      borderColor: "#0d6efd",
      backgroundColor: "rgba(13, 110, 253, 0.05)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      borderWidth: 3
    }],
  };

   const MiniFinanceCard = ({ title, value, icon: Icon, colorClass, isNum }) => (
    <div className="col-6">
      <div className="finance-mini-card p-3 rounded-4 shadow-sm bg-white border h-100">
        <div className={`icon-box ${colorClass} mb-2`}>
          <Icon size={18} />
        </div>
        <p className="text-muted fw-bold text-uppercase mb-1" style={{fontSize: '0.6rem'}}>{title}</p>
        <h5 className="fw-bold mb-0 text-dark">
            {isNum ? value : formatCurrency(value)}
        </h5>
      </div>
    </div>
  );

  const DashboardOverview = () => (
    <div className="dashboard-content">
      {/* 1. TIMELINE */}
      <div className="mb-3 bg-white p-3 rounded-3 shadow-sm border-start border-4 border-warning">
        <div className="d-flex align-items-center mb-2">
          <Info size={16} className="text-warning me-2" />
          <span className="fw-bold small">Today's Timeline</span>
        </div>
        <div className="d-flex gap-2 overflow-auto no-scrollbar pb-1 custom-scrollbar">
          {todaySchedule.length > 0 ? (
            todaySchedule.map((res, i) => (
              <div key={i} className="timeline-badge">
                <span className="fw-bold text-primary">{res.reservation_time?.substring(0, 5)}</span>
                <span className="mx-2 text-muted">|</span>
                <span className="fw-semibold">{res.first_name}</span>
                <span className="badge bg-dark ms-2">T-{res.table_names}</span>
              </div>
            ))
          ) : (
            <span className="text-muted small p-1">No arrivals for today.</span>
          )}
        </div>
      </div>

      {/* 2. STATS CARDS - ACCENT REMOVED */}
      <div className="row g-3 mb-3">
        <StatCard title="Bookings" value={stats.totalBookings} color="primary" icon="bi-calendar-check" />
        <StatCard title="Occupied" value={stats.activeTables} color="success" icon="bi-door-open" />
        {/* Changed color from warning to info to remove the heavy yellow look */}
        <StatCard title="Queue" value={stats.kitchenQueue} color="info" icon="bi-egg-fried" />
      </div>

      {/* 3. FINANCIAL SECTION & CHART */}
     <div className="row g-3 mb-3">
        <div className="col-lg-5">
          <div className="row g-3 h-100">
            <MiniFinanceCard 
                title="Total Period Revenue" 
                value={stats.monthlyRevenue} 
                icon={TrendingUp} 
                colorClass="text-success bg-success-subtle" 
            />
            <MiniFinanceCard 
                title="Today's Revenue" 
                value={stats.todayRevenue} 
                icon={DollarSign} 
                colorClass="text-primary bg-primary-subtle" 
            />
            <MiniFinanceCard 
                title="Avg. Order" 
                value={stats.avgOrder} 
                icon={ShoppingBag} 
                colorClass="text-info bg-info-subtle" 
            />
            <MiniFinanceCard 
                title="Total Order" 
                value={stats.totalOrders} 
                icon={CreditCard} 
                colorClass="text-warning bg-warning-subtle" 
                isNum={true}
            />
          </div>
        </div>

        {/* REVENUE ANALYTICS CHART */}
        <div className="col-lg-7">
          <div className="bg-white p-3 p-md-4 rounded-4 shadow-sm border h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Revenue Analytics</h6>
                <span className="badge bg-primary-subtle text-primary rounded-pill px-3">
                    Total: {formatCurrency(stats.monthlyRevenue)}
                </span>
            </div>
            <div style={{ height: "200px" }}>
              <Line 
                data={chartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { callback: (v) => '₱' + v.toLocaleString() } } }
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. FLOOR STATUS - FIXED BOX OVERFLOW */}
      <div className="mt-0 pb-5">
        <div className="d-flex justify-content-between align-items-center mb-2 px-1">
          <h6 className="fw-bold mb-0 text-dark">Floor Status</h6>
          <button className="btn btn-sm text-primary fw-bold text-decoration-none p-0" onClick={() => setActiveSection("table-status")}>
            Full View →
          </button>
        </div>
        {/* Added overflow-hidden and removed row margins internally */}
        <div className="bg-white rounded-4 shadow-sm p-3 border overflow-hidden w-100 d-block">
          <TableStatus compact={true} />
        </div>
      </div>
    </div>
  )

  const renderSection = () => {
    const sections = {
      dashboard: <DashboardOverview />,
      billing: <Billing />,
      inventory: <Inventory />,
      recipe: <RecipeManager />,
      products: <Product />,
      categories: <Categories />,
      report: <Reports data={{ 
          summary: {
              daily_revenue: stats.todayRevenue,
              aov: stats.avgOrder,
              total_orders: stats.totalOrders
          },
          monthlyTrend: stats.revenueTrend.map((val, i) => ({
              label: stats.trendLabels[i],
              value: val
          }))
      }} />,
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
    <div className={`admin-app-container ${sidebarOpen ? "sb-open" : "sb-closed"}`}>
      {/* Sidebar - Fix position sa kaliwa */}
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
        activeSection === item.id ? "bg-primary text-white active" : "text-secondary bg-transparent"
      }`}
            >
              <span className="nav-icon-wrapper"><item.icon /></span>
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
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main Content Area - Sa kanan ng sidebar */}
      <div className="app-main-viewport">
        <header className="app-top-nav bg-white shadow-sm px-4">
          <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="ms-auto d-flex align-items-center gap-3">
             <div className="text-end d-none d-sm-block">
                <p className="mb-0 fw-bold small text-dark">Admin User</p>
                <p className="mb-0 text-muted smaller">System Administrator</p>
             </div>
             <div className="avatar-circle">A</div>
          </div>
        </header>

        <main className="app-content-area px-4 py-3">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            renderSection()
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
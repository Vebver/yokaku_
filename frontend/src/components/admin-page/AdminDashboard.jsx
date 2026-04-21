import React, { useState, useEffect, useMemo } from "react";
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
import { Bar } from "react-chartjs-2";

// Internal Components
import Billing from "./Billing";
import Inventory from "./Inventory";
import Product from "./Product";
import Reports from "./Reports";
import Profile from "./Profile";
import Reservation from "./Reservation";
import Categories from "./Categories";
import "../../Style/AdminDashboard.css";
import RecipeManager from "./RecipeManager";

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
  Dashboard: () => <i className="bi bi-speedometer2 me-2"></i>,
  Inventory: () => <i className="bi bi-boxes me-2"></i>,
  Recipe: () => <i className="bi bi-journal-bookmark me-2"></i>,
  Categories: () => <i className="bi bi-tags me-2"></i>,
  Products: () => <i className="bi bi-box-seam me-2"></i>,
  Sales: () => <i className="bi bi-graph-up-arrow me-2"></i>,
  Billing: () => <i className="bi bi-receipt me-2"></i>,
  Profile: () => <i className="bi bi-person-circle me-2"></i>,
  Reservations: () => <i className="bi bi-calendar-check me-2"></i>,
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
  { id: "categories", label: "Categories", icon: Icons.Categories },
  { id: "inventory", label: "Inventory", icon: Icons.Inventory },
  { id: "recipe", label: "Recipes", icon: Icons.Recipe },
  { id: "products", label: "Menu Items", icon: Icons.Products },
  { id: "report", label: "Report", icon: Icons.Sales },
  { id: "reservations", label: "Reservations", icon: Icons.Reservations },
  { id: "billing", label: "Billing", icon: Icons.Billing },
  { id: "profile", label: "Profile", icon: Icons.Profile },
];

const StatCard = ({ title, value, color, icon }) => (
  <div className="col-12 col-md-6 col-xl-3">
    <div className="card border-0 shadow-sm h-100 rounded-4 bg-white">
      <div className="card-body p-4 p-xxl-5 text-center">
        <div
          className={`mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-${color}-subtle text-${color}`}
          style={{ width: "80px", height: "80px" }}
        >
          <i className={`bi ${icon}`} style={{ fontSize: "2.5rem" }}></i>
        </div>

        <p
          className="text-muted fw-bold text-uppercase mb-2"
          style={{ letterSpacing: "1px", fontSize: "0.9rem" }}
        >
          {title}
        </p>

        <h1 className="display-5 fw-bold mb-0 text-dark">{value}</h1>
      </div>
    </div>
  </div>
);

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalBookings: 0,
    activeTables: 0,
    kitchenQueue: 0,
    revenue: 0,
  });

  const [revenueChartData, setRevenueChartData] = useState({
    labels: [],
    data: [],
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    if (token && role === "admin") {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setIsAuthenticated(true);
      fetchDashboardData();
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const statsRes = await axios.get("/api/admin/stats");
      const chartRes = await axios.get("/api/admin/revenue-chart");

      setStats(statsRes.data);
      setRevenueChartData({
        labels: chartRes.data.labels || [],
        data: chartRes.data.data || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("role");
    delete axios.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  const barChartConfig = useMemo(
    () => ({
      labels:
        revenueChartData.labels.length > 0
          ? revenueChartData.labels
          : ["No Data"],
      datasets: [
        {
          label: "Downpayment Revenue (₱)",
          data: revenueChartData.data.length > 0 ? revenueChartData.data : [0],
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderRadius: 5,
        },
      ],
    }),
    [revenueChartData],
  );

  const DashboardOverview = () => (
    <div className="container-fluid fade-in py-3">
      <div className="mb-5">
        <h1 className="fw-bold text-dark">Welcome Back, Admin</h1>
        <p className="text-muted fs-5">
          Here is what's happening at Hangout today.
        </p>
      </div>

      <div className="row g-4 mb-5">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          color="primary"
          icon="bi-calendar-check-fill"
        />
        <StatCard
          title="Active Tables"
          value={stats.activeTables}
          color="success"
          icon="bi-door-open-fill"
        />
        <StatCard
          title="Kitchen Queue"
          value={stats.kitchenQueue}
          color="warning"
          icon="bi-egg-fried"
        />
        <StatCard
          title="Total Revenue"
          value={`₱${stats.revenue.toLocaleString()}`}
          color="danger"
          icon="bi-wallet-fill"
        />
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
      report: <Reports />,
      profile: <Profile />,
      reservations: <Reservation />,
    };
    return sections[activeSection] || null;
  };

 if (!isAuthenticated && !loading) {
  return (
    <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card border-0 shadow p-5 text-center" style={{ maxWidth: "400px" }}>
        <i className="bi bi-shield-lock-fill text-danger" style={{ fontSize: "3rem" }}></i>
        <h2 className="fw-bold mb-3 text-dark">Access Denied</h2>
        <p className="text-muted mb-4">You do not have the required permissions to view the Admin Dashboard.</p>
        <button
          className="btn btn-dark btn-lg w-100"
          onClick={() => (window.location.href = "/")}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="admin-layout">
      {/* 1. SIDEBAR */}
      <aside
        className={`admin-sidebar bg-dark text-white ${sidebarOpen ? "expanded" : "collapsed"}`}
      >
        <div className="sidebar-header d-flex align-items-center justify-content-between px-3">
          {sidebarOpen && <h4 className="fw-bold mb-0">Hangout</h4>}
          <button
            className="btn btn-dark btn-sm d-none d-md-block ms-auto"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <i
              className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-list"} fs-5`}
            ></i>
          </button>
          <button
            className="btn btn-dark btn-sm d-md-none ms-auto"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg fs-5"></i>
          </button>
        </div>

        {/* Scrollable middle container for nav items */}
        <div className="sidebar-nav-container">
          <nav className="nav flex-column gap-2 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`nav-link text-start border-0 rounded py-3 px-3 d-flex align-items-center transition-all ${
                  activeSection === item.id
                    ? "bg-success text-white active"
                    : "text-secondary bg-transparent"
                }`}
              >
                <item.icon />
                {sidebarOpen && <span className="ms-2">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Pinned footer area for Logout */}
        <div className="sidebar-footer px-3 pb-4">
          <button
            className="btn btn-outline-danger btn-sm w-100 py-2 d-flex align-items-center justify-content-center"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-left"></i>
            {sidebarOpen && <span className="ms-2">Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="main-container">
        <header className="d-md-none bg-white border-bottom p-3 d-flex align-items-center sticky-top">
          <button
            className="btn btn-outline-dark me-3"
            onClick={() => setSidebarOpen(true)}
          >
            <i className="bi bi-list fs-4"></i>
          </button>
          <h5 className="mb-0 fw-bold">Hangout Admin</h5>
        </header>

        <main className="p-3 p-md-4">{renderSection()}</main>
      </div>

      {sidebarOpen && (
        <div
          className="mobile-overlay d-md-none"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default AdminDashboard;

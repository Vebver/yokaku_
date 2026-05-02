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

// Internal Components
import Billing from "./Billing";
import Inventory from "./Inventory";
import Product from "./Product";
import Reports from "./Reports";
import Profile from "./Profile";
import Reservation from "./Reservation";
import Categories from "./Categories";
import RecipeManager from "./RecipeManager";
import AccountManagement from "./AccountManagement";
import TableStatus from "./TableStatus";
import Maintenance from "./Maintenance";

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
  Dashboard: () => <i className="bi bi-speedometer2 me-2"></i>,
  Inventory: () => <i className="bi bi-boxes me-2"></i>,
  Recipe: () => <i className="bi bi-journal-bookmark me-2"></i>,
  Categories: () => <i className="bi bi-tags me-2"></i>,
  Products: () => <i className="bi bi-box-seam me-2"></i>,
  Sales: () => <i className="bi bi-graph-up-arrow me-2"></i>,
  Billing: () => <i className="bi bi-receipt me-2"></i>,
  Profile: () => <i className="bi bi-person-circle me-2"></i>,
  Reservations: () => <i className="bi bi-calendar-check me-2"></i>,
  Account: () => <i className="bi bi-people me-2"></i>,
  Maintenance: () => <i className="bi bi-tools me-2"></i>,
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
  { id: "account", label: "Account", icon: Icons.Account },
  { id: "table-status", label: "Table Status", icon: Icons.Dashboard },
  { id: "maintenance", label: "Maintenance", icon: Icons.Maintenance },
];

const StatCard = ({ title, value, color, icon }) => (
  <div className="col-12 col-md-4">
    <div className="card border-0 shadow-sm h-100 rounded-4 bg-white text-dark">
      <div className="card-body p-4 text-center">
        <div
          className={`mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-${color}-subtle text-${color}`}
          style={{ width: "60px", height: "60px" }}
        >
          <i className={`bi ${icon}`} style={{ fontSize: "1.8rem" }}></i>
        </div>
        <p
          className="text-muted fw-bold text-uppercase mb-1"
          style={{ letterSpacing: "1px", fontSize: "0.8rem" }}
        >
          {title}
        </p>
        <h2 className="fw-bold mb-0">{value}</h2>
      </div>
    </div>
  </div>
);

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768); // Auto-close on small screens
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalBookings: 0,
    activeTables: 0,
    kitchenQueue: 0,
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

    // Auto-collapse sidebar on window resize
    const handleResize = () => {
      if (window.innerWidth <= 768) setSidebarOpen(false);
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
      const statsRes = await axios.get(`${API_BASE}/admin/stats`, config);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    delete axios.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  const DashboardOverview = () => (
    <div className="container-fluid fade-in py-3">
      <div className="mb-4">
        <h1 className="fw-bold text-dark">Welcome Back, Admin</h1>
        <p className="text-muted">Here is what's happening at Hangout today.</p>
      </div>

      <div className="row g-3 mb-5">
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
      account: <AccountManagement />,
      "table-status": <TableStatus />,
      maintenance: <Maintenance />,
    };
    return sections[activeSection] || null;
  };

  if (!isAuthenticated && !loading) {
    return (
      <div className="vh-100 d-flex align-items-center justify-content-center bg-light text-dark p-3">
        <div
          className="card border-0 shadow p-4 text-center w-100"
          style={{ maxWidth: "400px" }}
        >
          <i
            className="bi bi-shield-lock-fill text-danger"
            style={{ fontSize: "3rem" }}
          ></i>
          <h2 className="fw-bold mb-3">Access Denied</h2>
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
    <div
      className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      {/* MOBILE OVERLAY */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* SIDEBAR */}
      <aside
        className={`admin-sidebar bg-dark text-white ${sidebarOpen ? "expanded" : "collapsed"}`}
      >
        <div className="sidebar-header d-flex align-items-center justify-content-between px-3">
          {sidebarOpen && <h4 className="fw-bold mb-0 text-white">Hangout</h4>}
          <button
            className="btn btn-dark btn-sm d-none d-md-block ms-auto"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <i
              className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-list"} fs-5 text-white`}
            ></i>
          </button>
          {/* Mobile close button */}
          <button
            className="btn btn-dark d-md-none"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg text-white"></i>
          </button>
        </div>

        <div className="sidebar-nav-container">
          <nav className="nav flex-column gap-1 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  if (window.innerWidth <= 768) setSidebarOpen(false); // Auto-close on click for mobile
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

        <div className="sidebar-footer px-3 pb-4">
          <button
            className="btn btn-outline-danger btn-sm w-100 py-2"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-left"></i>
            {sidebarOpen && <span className="ms-2">Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="main-container bg-light">
        {/* MOBILE TOP NAV (Hamburger) */}
        <header className="mobile-top-nav d-md-none bg-dark text-white p-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Hangout Admin</h5>
          <button
            className="btn btn-dark border"
            onClick={() => setSidebarOpen(true)}
          >
            <i className="bi bi-list fs-4"></i>
          </button>
        </header>

        <main className="p-2 p-md-4">
          {loading ? (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ minHeight: "60vh" }}
            >
              <div className="spinner-border text-success"></div>
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

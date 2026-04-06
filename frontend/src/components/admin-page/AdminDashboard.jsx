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
import Sales from "./Sales";
import Profile from "./Profile";
import Reservation from "./Reservation";
import Categories from "./Categories";
import "../../Style/AdminDashboard.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const Icons = {
  Dashboard: () => <i className="bi bi-speedometer2 me-2"></i>,
  Inventory: () => <i className="bi bi-boxes me-2"></i>,
  Categories: () => <i className="bi bi-tags me-2"></i>,
  Products: () => <i className="bi bi-box-seam me-2"></i>,
  Sales: () => <i className="bi bi-graph-up-arrow me-2"></i>,
  Billing: () => <i className="bi bi-receipt me-2"></i>,
  Profile: () => <i className="bi bi-person-circle me-2"></i>,
  Reservations: () => <i className="bi bi-calendar-check me-2"></i>,
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
  { id: "categories", label: "Categories", icon: Icons.Products },
  { id: "inventory", label: "Inventory", icon: Icons.Products },
  { id: "products", label: "Menu Items", icon: Icons.Products }, // Renamed to Menu Items
  { id: "sales", label: "Sales", icon: Icons.Sales },
  { id: "reservations", label: "Reservations", icon: Icons.Reservations },
  { id: "billing", label: "Billing", icon: Icons.Billing },
  { id: "profile", label: "Profile", icon: Icons.Profile },
];

const StatCard = ({ title, value, color }) => (
  <div className="col-12 col-sm-6 col-xl-3">
    <div className={`card border-0 shadow-sm p-3 border-start border-${color} border-4`}>
      <small className="text-muted text-uppercase fw-bold">{title}</small>
      <h3 className={`fw-bold mb-0 text-${color}`}>{value}</h3>
    </div>
  </div>
);

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Updated state keys to match your Restaurant Database logic
  const [stats, setStats] = useState({ 
    totalBookings: 0, 
    activeTables: 0, 
    kitchenQueue: 0, 
    revenue: 0 
  });
  
  const [revenueChartData, setRevenueChartData] = useState({ labels: [], data: [] });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setIsAuthenticated(true);
      fetchDashboardData();
    } else {
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
    delete axios.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  const barChartConfig = useMemo(() => ({
    labels: revenueChartData.labels.length > 0 ? revenueChartData.labels : ["No Data"],
    datasets: [{
      label: "Downpayment Revenue ($)",
      data: revenueChartData.data.length > 0 ? revenueChartData.data : [0],
      backgroundColor: "rgba(16, 185, 129, 0.7)", // Changed to Green (POS style)
      borderRadius: 5,
    }],
  }), [revenueChartData]);

  const DashboardOverview = () => (
    <div className="container-fluid fade-in">
      <h2 className="mb-4 fw-bold">Dashboard Overview</h2>
      
      {/* Updated Cards for "Unli" Restaurant Logic */}
      <div className="row g-3 mb-4">
        <StatCard title="Total Bookings" value={stats.totalBookings} color="primary" />
        <StatCard title="Active Tables" value={stats.activeTables} color="success" />
        <StatCard title="Kitchen Queue" value={stats.kitchenQueue} color="warning" />
        <StatCard title="Total Revenue" value={`₱${stats.revenue.toLocaleString()}`} color="danger" />
      </div>

      <div className="row g-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0">Monthly Booking Revenue (Downpayments)</h5>
              <button className="btn btn-sm btn-outline-primary" onClick={fetchDashboardData}>
                <i className="bi bi-arrow-clockwise"></i> Refresh
              </button>
            </div>
            <div style={{ height: "400px" }}>
              {loading ? (
                <div className="h-100 d-flex align-items-center justify-content-center">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : (
                <Bar data={barChartConfig} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    const sections = {
      dashboard: <DashboardOverview />,
      billing: <Billing />,
      inventory: <Inventory />,
      products: <Product />,
      categories: <Categories />,
      sales: <Sales />,
      profile: <Profile />,
      reservations: <Reservation />,
    };
    return sections[activeSection] || null;
  };

  if (!isAuthenticated && !loading) {
    return (
      <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card border-0 shadow p-5 text-center" style={{ maxWidth: "400px" }}>
          <h2 className="fw-bold mb-3 text-dark">Admin Access Required</h2>
          <button className="btn btn-success btn-lg w-100" onClick={() => (window.location.href = "/")}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* 1. SIDEBAR */}
      <aside className={`admin-sidebar bg-dark text-white ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <div className="d-flex align-items-center justify-content-between mb-4 mt-2 px-3">
          {sidebarOpen && <h4 className="fw-bold mb-0">Hangout</h4>}
          <button className="btn btn-dark btn-sm d-none d-md-block ms-auto" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-list"} fs-5`}></i>
          </button>
          <button className="btn btn-dark btn-sm d-md-none ms-auto" onClick={() => setSidebarOpen(false)}>
            <i className="bi bi-x-lg fs-5"></i>
          </button>
        </div>

        <nav className="nav flex-column gap-2 flex-grow-1 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={`nav-link text-start border-0 rounded py-3 px-3 d-flex align-items-center transition-all ${
                activeSection === item.id ? "bg-success text-white" : "text-secondary bg-transparent"
              }`}
            >
              <item.icon />
              {sidebarOpen && <span className="ms-2">{item.label}</span>}
            </button>
          ))}
        </nav>

        <button className="btn btn-outline-danger btn-sm mt-auto mb-3 mx-3" onClick={handleLogout}>
          <i className="bi bi-box-arrow-left"></i>
          {sidebarOpen && <span className="ms-2">Logout</span>}
        </button>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="main-container">
        <header className="d-md-none bg-white border-bottom p-3 d-flex align-items-center sticky-top">
          <button className="btn btn-outline-dark me-3" onClick={() => setSidebarOpen(true)}>
            <i className="bi bi-list fs-4"></i>
          </button>
          <h5 className="mb-0 fw-bold">Hangout Admin</h5>
        </header>

        <main className="p-3 p-md-4">
          {renderSection()}
        </main>
      </div>

      {sidebarOpen && (
        <div className="mobile-overlay d-md-none" onClick={() => setSidebarOpen(false)}></div>
      )}

      <style>{`
        .admin-layout { display: flex; min-height: 100vh; background-color: #f4f7f6; }
        .admin-sidebar { height: 100vh; position: sticky; top: 0; display: flex; flex-direction: column; transition: width 0.3s ease; z-index: 1050; flex-shrink: 0; }
        .admin-sidebar.expanded { width: 260px; }
        .admin-sidebar.collapsed { width: 80px; }
        .main-container { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; }
        .fade-in { animation: fadeIn 0.4s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 767px) {
          .admin-sidebar { position: fixed; left: 0; transform: translateX(-100%); }
          .admin-sidebar.expanded { transform: translateX(0); width: 260px; }
          .mobile-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1040; }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
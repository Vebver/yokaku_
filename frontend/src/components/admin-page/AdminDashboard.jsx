import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from "chart.js";
import { Info } from "lucide-react";

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

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

// 1. Sidebar Icons
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

// 2. Navigation Items
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
  <div className="col-4 px-1"> {/* px-1 for tighter horizontal spacing */}
    <div className="card border-0 shadow-sm rounded-3 bg-white mt-3">
      {/* Tight py-1 px-2 padding */}
      <div className="card-body py-1 px-2 d-flex align-items-center gap-2">
        <div className={`d-flex align-items-center justify-content-center rounded-circle bg-${color}-subtle text-${color}`}
          style={{ width: "26px", height: "26px", flexShrink: 0 }}>
          <i className={`bi ${icon}`} style={{ fontSize: "0.8rem" }}></i>
        </div>
        <div className="text-truncate" style={{ lineHeight: '1.1' }}>
          <p className="text-muted fw-bold text-uppercase mb-0" style={{ fontSize: "0.5rem" }}>{title}</p>
          <h6 className="fw-bold mb-0" style={{ fontSize: "0.85rem" }}>{value}</h6>
        </div>
      </div>
    </div>
  </div>
);

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [stats, setStats] = useState({ totalBookings: 0, activeTables: 0, kitchenQueue: 0 });

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

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [statsRes, scheduleRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`, config),
        axios.get(`${API_BASE}/admin/today-schedule`, config),
      ]);
      setStats(statsRes.data);
      setTodaySchedule(scheduleRes.data);
    } catch (error) { console.error("Fetch error", error); }
    finally { setLoading(false); }
  };

  const DashboardOverview = () => (
  <div className="fade-in">
    {/* 1. TIMELINE - mb-2 instead of mb-3 to close the gap */}
     <div className="mb-1 bg-white p-2 rounded-3 shadow-sm border-start border-4 border-warning mt-0">
      <div className="d-flex align-items-center mb-0">
        <Info size={12} className="text-warning me-2" />
        <span className="fw-bold" style={{ fontSize: "0.65rem" }}>Today's Timeline</span>
      </div>
      <div className="d-flex gap-2 overflow-auto no-scrollbar" style={{ whiteSpace: "nowrap" }}>
         {todaySchedule.length > 0 ? todaySchedule.map((res, i) => (
            <div key={i} className="bg-light px-2 py-1 rounded-2 border small d-inline-block shadow-sm" style={{ fontSize: "0.65rem" }}>
              <span className="fw-bold text-primary">{res.reservation_time?.substring(0, 5)}</span>
              <span className="mx-1">|</span>
              <span className="fw-semibold">{res.first_name}</span>
              <span className="badge bg-dark ms-1">T-{res.table_names}</span>
            </div>
         )) : <span className="text-muted" style={{fontSize: '0.65rem'}}>No arrivals for today.</span>}
      </div>
    </div>

    {/* 2. STATS CARDS - mb-2 to stay close to the floor status */}
    <div className="row g-2 mb-1 mt-0 px-1"> 
      <StatCard title="Bookings" value={stats.totalBookings} color="primary" icon="bi-calendar-check" />
      <StatCard title="Occupied" value={stats.activeTables} color="success" icon="bi-door-open" />
      <StatCard title="Queue" value={stats.kitchenQueue} color="warning" icon="bi-egg-fried" />
    </div>

    {/* 3. FLOOR STATUS - Removed the extra card wrapper to reduce double padding */}
    <div className="mt-4"> 
      <div className="d-flex justify-content-between align-items-center mb-0 mt-1 px-1">
        <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "0.8rem" }}>Floor Status</h6>
        <button className="btn btn-sm p-0 text-primary fw-bold" style={{ fontSize: "0.7rem" }} onClick={() => setActiveSection("table-status")}>
           Full View →
        </button>
      </div>
      
      {/* The actual component with zero extra margin */}
      <div className="bg-white rounded-3 shadow-sm p-0 border">
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
      report: <Reports />,
      profile: <Profile />,
      reservations: <Reservation />,
      account: <AccountManagement />,
      "table-status": <TableStatus />,
      maintenance: <Maintenance />,
    };
    return sections[activeSection] || <DashboardOverview />;
  };

  const handleLogout = () => { localStorage.clear(); window.location.href = "/"; };

  return (
    <div className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <aside className={`admin-sidebar bg-dark text-white ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <div className="sidebar-header d-flex align-items-center p-3 flex-shrink-0">
          {sidebarOpen && <h4 className="fw-bold mb-0 text-white">HANGOUT</h4>}
          <button className="btn btn-dark btn-sm ms-auto" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-list"}`}></i>
          </button>
        </div>

        <nav className="nav flex-column flex-nowrap gap-1 px-2 mt-2 custom-nav" style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); if (window.innerWidth < 992) setSidebarOpen(false); }}
              className={`nav-link text-start border-0 rounded-2 py-2 px-3 d-flex align-items-center mb-1 transition-all ${activeSection === item.id ? "bg-primary text-white" : "text-secondary bg-transparent"}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              <item.icon />
              {sidebarOpen && <span className="ms-2 small">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer p-3 flex-shrink-0">
          <button className="btn btn-outline-danger btn-sm w-100" onClick={handleLogout}>
            <i className="bi bi-box-arrow-left"></i> {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      <div className="main-container bg-light" style={{ marginLeft: sidebarOpen ? "250px" : "80px", transition: "all 0.3s ease" }}>
        <main className="px-2 px-md-3 pt-1 pb-3"> 
  {loading ? (
    <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"></div></div>
  ) : (
    renderSection()
  )}
</main>
      </div>

      <style>{`
        .custom-nav::-webkit-scrollbar { width: 4px; }
        .custom-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .admin-sidebar { position: fixed; height: 100vh; display: flex; flex-direction: column; z-index: 1000; width: 250px; transition: width 0.3s ease; }
        .admin-sidebar.collapsed { width: 80px; }
        .main-container { min-height: 100vh; }
        .collapsed .nav-link { justify-content: center; padding: 12px !important; }
        .collapsed .nav-link i { margin: 0 !important; font-size: 1.25rem; }
        @media (max-width: 768px) {
          .main-container { margin-left: 0 !important; }
          .admin-sidebar { left: -250px; }
          .sidebar-open .admin-sidebar { left: 0; width: 250px; }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
import React, { useState, useEffect } from "react";
import axios from "axios";
// 1. Import Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

// Internal Components
import Billing from "./Billing";
import Inventory from "./Inventory";
import Product from "./Product";
import Sales from "./Sales";
import Profile from "./Profile";
import Reservation from "./Reservation";
import Categories from "./Categories";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

// Icons Object
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

// Nav Items Definition
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
  { id: "categories", label: "Categories", icon: Icons.Products },
  { id: "inventory", label: "Inventory", icon: Icons.Products },
  { id: "products", label: "Products", icon: Icons.Products },
  { id: "sales", label: "Sales", icon: Icons.Sales },
  { id: "reservations", label: "Reservations", icon: Icons.Reservations },
  { id: "billing", label: "Billing", icon: Icons.Billing },
  { id: "profile", label: "Profile", icon: Icons.Profile },
];

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  // --- CHART DATA ---
  const barChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Revenue",
        data: [12000, 19000, 15000, 22000, 18000, 24000],
        backgroundColor: "rgba(13, 110, 253, 0.8)",
        borderRadius: 5,
      },
    ],
  };

  const doughnutData = {
    labels: ["Organic", "Social", "Direct"],
    datasets: [
      {
        data: [45, 25, 30],
        backgroundColor: ["#0d6efd", "#0dcaf0", "#198754"],
        borderWidth: 0,
      },
    ],
  };

  const DashboardOverview = () => (
    <div className="container-fluid fade-in">
      <h2 className="mb-4 fw-bold">Dashboard Overview</h2>

      {/* Top Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 border-start border-primary border-4">
            <small className="text-muted text-uppercase fw-bold">
              Total Sales
            </small>
            <h3 className="fw-bold mb-0 text-primary">$12,450</h3>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 border-start border-success border-4">
            <small className="text-muted text-uppercase fw-bold">
              Products
            </small>
            <h3 className="fw-bold mb-0 text-success">156</h3>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 border-start border-warning border-4">
            <small className="text-muted text-uppercase fw-bold">
              Orders Today
            </small>
            <h3 className="fw-bold mb-0 text-warning">42</h3>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 border-start border-danger border-4">
            <small className="text-muted text-uppercase fw-bold">Revenue</small>
            <h3 className="fw-bold mb-0 text-danger">$8,210</h3>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="mb-4 fw-bold">Monthly Performance Report</h5>
            <div style={{ height: "300px" }}>
              <Bar
                data={barChartData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="mb-4 fw-bold">Traffic Source</h5>
            <div style={{ height: "220px" }}>
              <Doughnut
                data={doughnutData}
                options={{ maintainAspectRatio: false }}
              />
            </div>
            <ul className="list-group list-group-flush mt-3">
              <li className="list-group-item d-flex justify-content-between px-0 bg-transparent">
                Organic <span className="badge bg-primary">45%</span>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0 bg-transparent">
                Social <span className="badge bg-info">25%</span>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0 bg-transparent">
                Direct <span className="badge bg-success">30%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardOverview />;
      case "billing":
        return <Billing />;
      case "inventory":
        return <Inventory />;
      case "products":
        return <Product />;
      case "categories":
        return <Categories />;
      case "sales":
        return <Sales />;
      case "profile":
        return <Profile />;
      case "reservations":
        return <Reservation />;
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
        <div
          className="card border-0 shadow p-5 text-center"
          style={{ maxWidth: "400px" }}
        >
          <h2 className="fw-bold mb-3 text-dark">Admin Access</h2>
          <button
            className="btn btn-success btn-lg w-100"
            onClick={() => (window.location.href = "/")}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", backgroundColor: "#f4f7f6" }}
    >
      {/* Sidebar */}
      <div
        className="bg-dark text-white p-3 d-flex flex-column transition-all"
        style={{ width: sidebarOpen ? "260px" : "80px", transition: "0.3s" }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4 mt-2">
          {sidebarOpen && <h4 className="fw-bold mb-0 px-2">Hangout</h4>}
          <button
            className="btn btn-dark btn-sm ms-auto"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <i className="bi bi-list fs-5"></i>
          </button>
        </div>

        <nav className="nav flex-column gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`nav-link text-start border-0 rounded py-3 px-3 transition-all ${
                activeSection === item.id
                  ? "bg-primary text-white"
                  : "text-secondary bg-transparent"
              }`}
            >
              <item.icon />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          className="btn btn-outline-danger btn-sm mt-auto mb-3 mx-2"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-left"></i>{" "}
          {sidebarOpen && <span className="ms-2">Logout</span>}
        </button>
      </div>

      <div className="flex-grow-1">
        <main className="p-4">{renderSection()}</main>
      </div>
    </div>
  );
}

export default AdminDashboard;

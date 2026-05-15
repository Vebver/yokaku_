import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Receipt,
  BarChart3,
  LogOut,
  UserCircle,
  Store,
} from "lucide-react";

// Updated Imports
import TableStatus from "../admin-page/TableStatus";
import OnlineReservations from "../admin-page/OnlineReservations";
import WalkInReservations from "../admin-page/WalkInReservations";
import Billing from "../admin-page/Billing";
import Reports from "../admin-page/Reports";

const CashierDashboard = () => {
  const [activeTab, setActiveTab] = useState("tables");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 992);
  const [user, setUser] = useState({ name: "User", role: "Cashier" });

  useEffect(() => {
    // Fetching user info from localStorage
    const firstName = localStorage.getItem("firstName") || "";
    const lastName = localStorage.getItem("lastName") || "";
    const storedRole = localStorage.getItem("role") || "Cashier";
    
    setUser({ 
      name: (firstName + " " + lastName).trim() || "Staff Member", 
      role: storedRole 
    });

    const handleResize = () => {
      if (window.innerWidth <= 992) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Nav Items Configuration
  const navItems = [
    { id: "tables", label: "Table Status", icon: LayoutDashboard },
    { id: "online", label: "Online Bookings", icon: CalendarCheck },
    { id: "walkins", label: "Walk-ins / Kiosk", icon: Store },
    { id: "billing", label: "Payments", icon: Receipt },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  const renderContent = () => {
    const components = {
      tables: <TableStatus />,
      online: <OnlineReservations />,
      walkins: <WalkInReservations />,
      billing: <Billing />,
      reports: <Reports />,
    };
    return components[activeTab] || <TableStatus />;
  };

  return (
    <div className="admin-layout bg-light">
      {/* 1. MOBILE HEADER */}
      <header className="mobile-header d-lg-none bg-dark text-white px-3 d-flex justify-content-between align-items-center sticky-top shadow">
        <h5 className="fw-bold mb-0">
          HANGOUT{" "}
          <small className="text-warning small" style={{ fontSize: "0.6rem" }}>
            {user.role.toUpperCase()}
          </small>
        </h5>
        <button
          className="btn btn-outline-light btn-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <i className={`bi ${sidebarOpen ? "bi-x-lg" : "bi-list"} fs-3`}></i>
        </button>
      </header>

      {/* 2. OVERLAY */}
      {sidebarOpen && window.innerWidth <= 992 && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* 3. SIDEBAR */}
      <aside className={`admin-sidebar bg-dark text-white ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <div className="sidebar-header p-3 mb-4">
          <h2 className="fw-bold mb-0" style={{ color: "#ffcc00" }}>HANGOUT</h2>
        </div>

        <nav className="custom-nav px-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth <= 992) setSidebarOpen(false);
              }}
              className={`nav-link w-100 text-start border-0 px-3 d-flex align-items-center transition-all rounded-3
                ${activeTab === item.id ? "bg-primary text-white shadow" : "text-secondary bg-transparent"}
                py-5 mb-2`} /* py-3: Height of button | mb-2: Gap between buttons */
            >
              <item.icon size={20} className="me-3" />
              <span className="nav-label fw-semibold" style={{ fontSize: '0.85rem' }}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer p-3">
          <button
            onClick={handleLogout}
            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center py-2"
          >
            <LogOut size={16} className="me-2" /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 4. MAIN CONTAINER */}
      <div className={`main-container ${sidebarOpen ? "margin-expanded" : "margin-collapsed"}`}>
        {/* DESKTOP HEADER */}
        <header className="bg-white border-bottom py-3 px-4 d-none d-lg-flex justify-content-between align-items-center sticky-top shadow-sm">
          <h4 className="fw-bold mb-0 text-dark">
            {activeTab === 'tables' && "Dining Floor Status"}
            {activeTab === 'online' && "Web Reservation Logs"}
            {activeTab === 'walkins' && "Walk-in & Kiosk Records"}
            {activeTab === 'billing' && "Payment Verification"}
            {activeTab === 'reports' && "Sales Analytics"}
          </h4>

          {/* USER PROFILE SECTION */}
          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div className="fw-bold text-dark lh-1 mb-1" style={{ fontSize: '0.9rem' }}>
                {user.name}
              </div>
              <div className="text-uppercase fw-bold text-primary" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                {user.role} Terminal
              </div>
            </div>
            <div className="p-2 bg-light rounded-circle border shadow-sm text-secondary">
              <UserCircle size={28} />
            </div>
          </div>
        </header>

        <main className="p-2 p-md-4">{renderContent()}</main>
      </div>
    </div>
  );
};

export default CashierDashboard;
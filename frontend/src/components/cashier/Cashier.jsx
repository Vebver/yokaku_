import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Receipt,
  BarChart3,
  LogOut,
  UserCircle,
  Store,
  Menu,
  X
} from "lucide-react";

import TableStatus from "../admin-page/TableStatus";
import OnlineReservations from "../admin-page/OnlineReservations";
import WalkInReservations from "../admin-page/WalkInReservations";
import Billing from "../admin-page/Billing";
import Reports from "../admin-page/Reports";
import "../../Style/Cashier.css"

const CashierDashboard = () => {
  const [activeTab, setActiveTab] = useState("tables");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 992);
  const [user, setUser] = useState({ name: "User", role: "Cashier" });

  useEffect(() => {
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
    <div className="admin-wrapper">
      {/* 1. MOBILE OVERLAY */}
      {sidebarOpen && window.innerWidth <= 992 && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* 2. SIDEBAR */}
      <aside className={`sidebar-container bg-dark ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header border-bottom border-secondary p-4 d-flex justify-content-between align-items-center">
          <h3 className="fw-bold mb-0 text-warning">HANGOUT</h3>
          <button className="btn text-white d-lg-none" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav p-2 mt-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth <= 992) setSidebarOpen(false);
              }}
              className={`nav-btn ${activeTab === item.id ? "active" : ""}`}
            >
              <item.icon size={20} className="nav-icon" />
              <span className="nav-text">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer p-3 border-top border-secondary">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 3. MAIN CONTENT */}
      <main className={`main-layout ${sidebarOpen ? "shrunk" : "full"}`}>
        {/* TOP NAVBAR */}
        <header className="main-header bg-white shadow-sm px-4 py-3 sticky-top">
          <div className="d-flex align-items-center gap-3">
             <button className="btn btn-light d-lg-none" onClick={() => setSidebarOpen(true)}>
               <Menu size={24} />
             </button>
             <h4 className="fw-bold mb-0 text-dark header-title">
                {navItems.find(i => i.id === activeTab)?.label}
             </h4>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-end d-none d-sm-block">
              <div className="fw-bold text-dark lh-1 mb-1">{user.name}</div>
              <div className="text-uppercase text-primary small fw-bold">{user.role} Terminal</div>
            </div>
            <UserCircle size={35} className="text-secondary" />
          </div>
        </header>

        {/* COMPONENT RENDERER */}
        <div className="content-inner p-3 p-md-4">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default CashierDashboard;
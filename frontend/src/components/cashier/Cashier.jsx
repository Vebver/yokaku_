import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Receipt, 
  BarChart3, 
  LogOut, 
  UserCircle,
  Menu,
  X,
  Store // Icon for Walk-ins
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

  // Handle auto-close on mobile
  useEffect(() => {
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

  const renderContent = () => {
    switch (activeTab) {
      case "tables": return <TableStatus />;
      case "online": return <OnlineReservations />;
      case "walkins": return <WalkInReservations />;
      case "billing": return <Billing />;
      case "reports": return <Reports />;
      default: return <TableStatus />;
    }
  };

  return (
    <div className="admin-layout bg-light">
      {/* 1. MOBILE HEADER */}
      <header className="mobile-header d-lg-none bg-dark text-white px-3 d-flex justify-content-between align-items-center sticky-top shadow">
        <h5 className="fw-bold mb-0">HANGOUT <small className="text-warning small" style={{fontSize: '0.6rem'}}>CASHIER</small></h5>
        <button className="btn btn-outline-light btn-sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
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
          <p className="x-small text-white-50 mb-0">CASHIER PANEL</p>
        </div>

        <nav className="custom-nav px-2">
          <button 
            onClick={() => { setActiveTab("tables"); if (window.innerWidth <= 992) setSidebarOpen(false); }}
            className={`nav-link w-100 text-start border-0 py-2 px-3 d-flex align-items-center mb-1 transition-all ${activeTab === "tables" ? "bg-primary text-white" : "text-secondary"}`}
          >
            <LayoutDashboard size={18} className="me-2" /> <span className="nav-label small">Table Status</span>
          </button>

          <button 
            onClick={() => { setActiveTab("online"); if (window.innerWidth <= 992) setSidebarOpen(false); }}
            className={`nav-link w-100 text-start border-0 py-2 px-3 d-flex align-items-center mb-1 transition-all ${activeTab === "online" ? "bg-primary text-white" : "text-secondary"}`}
          >
            <CalendarCheck size={18} className="me-2" /> <span className="nav-label small">Online Bookings</span>
          </button>

          <button 
            onClick={() => { setActiveTab("walkins"); if (window.innerWidth <= 992) setSidebarOpen(false); }}
            className={`nav-link w-100 text-start border-0 py-2 px-3 d-flex align-items-center mb-1 transition-all ${activeTab === "walkins" ? "bg-primary text-white" : "text-secondary"}`}
          >
            <Store size={18} className="me-2" /> <span className="nav-label small">Walk-ins / Kiosk</span>
          </button>

          <button 
            onClick={() => { setActiveTab("billing"); if (window.innerWidth <= 992) setSidebarOpen(false); }}
            className={`nav-link w-100 text-start border-0 py-2 px-3 d-flex align-items-center mb-1 transition-all ${activeTab === "billing" ? "bg-primary text-white" : "text-secondary"}`}
          >
            <Receipt size={18} className="me-2" /> <span className="nav-label small">Payments</span>
          </button>

          <button 
            onClick={() => { setActiveTab("reports"); if (window.innerWidth <= 992) setSidebarOpen(false); }}
            className={`nav-link w-100 text-start border-0 py-2 px-3 d-flex align-items-center mb-1 transition-all ${activeTab === "reports" ? "bg-primary text-white" : "text-secondary"}`}
          >
            <BarChart3 size={18} className="me-2" /> <span className="nav-label small">Reports</span>
          </button>
        </nav>

        <div className="sidebar-footer p-3">
          <button onClick={handleLogout} className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center">
            <LogOut size={16} className="me-2" /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 4. MAIN CONTAINER */}
      <div className={`main-container ${sidebarOpen ? "margin-expanded" : "margin-collapsed"}`}>
        {/* DESKTOP HEADER */}
        <header className="bg-white border-bottom py-3 px-4 d-none d-lg-flex justify-content-between align-items-center sticky-top">
          <h4 className="fw-bold mb-0 text-dark">
            {activeTab === 'tables' && "Dining Floor Status"}
            {activeTab === 'online' && "Web Reservation Logs"}
            {activeTab === 'walkins' && "Walk-in & Kiosk Records"}
            {activeTab === 'billing' && "Payment Verification"}
            {activeTab === 'reports' && "Sales Analytics"}
          </h4>
          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div className="fw-bold small text-dark">Cashier Terminal</div>
              <div className="text-muted x-small">ID: {localStorage.getItem("userId") || "001"}</div>
            </div>
            <UserCircle size={32} className="text-secondary" />
          </div>
        </header>

        <main className="p-2 p-md-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default CashierDashboard;
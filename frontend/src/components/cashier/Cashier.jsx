import React, { useState, useEffect, Suspense, lazy } from "react";
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

// Every panel is split into its own chunk. These were previously all eager
// imports, so opening the cashier app downloaded and evaluated all six at once
// — including Reports, which drags in the whole chart.js library.
const TableStatus = lazy(() => import("../admin-page/TableStatus"));
const OnlineReservations = lazy(() =>
  import("../admin-page/OnlineReservations"),
);
const WalkInReservations = lazy(() => import("../admin-page/WalkInReservations"));
const Billing = lazy(() => import("../admin-page/Billing"));
const Reports = lazy(() => import("../admin-page/Reports"));
const KioskControl = lazy(() => import("../shared/KioskControl"));
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
    { id: "kiosk-control", label: "Kiosk Control", icon: Store },
    { id: "billing", label: "Payments", icon: Receipt },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  // Render only the active panel, so the other chunks stay unmounted and
  // their data fetching does not run behind the visible screen.
  const renderContent = () => {
    const panels = {
      tables: <TableStatus />,
      online: <OnlineReservations />,
      walkins: <WalkInReservations />,
      "kiosk-control": <KioskControl />,
      billing: <Billing />,
      reports: <Reports />,
    };
    return (
      <Suspense
        fallback={
          <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        }
      >
        {panels[activeTab] || <TableStatus />}
      </Suspense>
    );
  };

  return (
    <div className="kiosk-wrapper"> {/* Changed class name for context */}
      {/* MOBILE OVERLAY */}
      {sidebarOpen && window.innerWidth <= 992 && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* KIOSK SIDEBAR */}
      <aside className={`kiosk-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="kiosk-logo">
          <h2 className="fw-bold mb-0 text-warning">H</h2>
          <span className="small text-white-50">v1.0</span>
        </div>

        <nav className="kiosk-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth <= 992) setSidebarOpen(false);
              }}
              className={`kiosk-nav-btn ${activeTab === item.id ? "active" : ""}`}
            >
              <item.icon size={32} className="kiosk-icon" />
              <span className="kiosk-text">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="kiosk-footer">
          <button onClick={handleLogout} className="kiosk-logout-btn">
            <LogOut size={24} />
            <span>Exit</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={`kiosk-main ${sidebarOpen ? "shrunk" : "full"}`}>
        <header className="kiosk-header">
          <div className="d-flex align-items-center gap-3">
             <button className="btn btn-warning d-lg-none" onClick={() => setSidebarOpen(true)}>
               <Menu size={24} />
             </button>
             <div>
                <h3 className="fw-bold mb-0 text-dark">
                    {navItems.find(i => i.id === activeTab)?.label}
                </h3>
                <p className="text-muted small mb-0">{new Date().toLocaleDateString()}</p>
             </div>
          </div>

          <div className="kiosk-user-profile">
            <div className="text-end d-none d-sm-block">
              <div className="fw-bold text-dark">{user.name}</div>
              <div className="badge bg-primary">{user.role}</div>
            </div>
            <UserCircle size={40} className="text-dark opacity-75" />
          </div>
        </header>

        <div className="kiosk-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default CashierDashboard;
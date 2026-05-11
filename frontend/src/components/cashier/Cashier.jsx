import React, { useState } from "react";
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Receipt, 
  BarChart3, 
  LogOut, 
  UserCircle 
} from "lucide-react";
import TableStatus from "../admin-page/TableStatus";
import Reservations from "../admin-page/Reservation";
import Billing from "../admin-page/Billing";
import Reports from "../admin-page/Reports";

const CashierDashboard = () => {
  const [activeTab, setActiveTab] = useState("tables");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const renderContent = () => {
    switch (activeTab) {
      case "tables": return <TableStatus />;
      case "reservations": return <Reservations />;
      case "billing": return <Billing />;
      case "reports": return <Reports />;
      default: return <TableStatus />;
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      
      {/* SIDEBAR */}
      <div className="bg-dark text-white p-3 d-flex flex-column" style={{ width: "260px", position: "fixed", height: "100vh" }}>
        <div className="mb-5 mt-2 px-3">
          <h1 className="fw-bold fs-3 mb-0" style={{ color: "#ffcc00" }}>HANGOUT</h1>
          <p className="small text-white-50">CASHIER PANEL</p>
        </div>

        <nav className="nav flex-column gap-2 flex-grow-1">
          <button 
            onClick={() => setActiveTab("tables")}
            className={`nav-link text-start border-0 py-3 px-3 d-flex align-items-center gap-3 transition-all ${activeTab === "tables" ? "bg-primary text-white rounded-3 shadow" : "text-white-50 bg-transparent"}`}
          >
            <LayoutDashboard size={20} /> <span className="fw-semibold">Table Status</span>
          </button>

          <button 
            onClick={() => setActiveTab("reservations")}
            className={`nav-link text-start border-0 py-3 px-3 d-flex align-items-center gap-3 transition-all ${activeTab === "reservations" ? "bg-primary text-white rounded-3 shadow" : "text-white-50 bg-transparent"}`}
          >
            <CalendarCheck size={20} /> <span className="fw-semibold">Reservations</span>
          </button>

          <button 
            onClick={() => setActiveTab("billing")}
            className={`nav-link text-start border-0 py-3 px-3 d-flex align-items-center gap-3 transition-all ${activeTab === "billing" ? "bg-primary text-white rounded-3 shadow" : "text-white-50 bg-transparent"}`}
          >
            <Receipt size={20} /> <span className="fw-semibold">Billing</span>
          </button>

          <button 
            onClick={() => setActiveTab("reports")}
            className={`nav-link text-start border-0 py-3 px-3 d-flex align-items-center gap-3 transition-all ${activeTab === "reports" ? "bg-primary text-white rounded-3 shadow" : "text-white-50 bg-transparent"}`}
          >
            <BarChart3 size={20} /> <span className="fw-semibold">Reports</span>
          </button>
        </nav>

        <div className="mt-auto border-top border-secondary pt-3">
          <button onClick={handleLogout} className="nav-link text-danger border-0 bg-transparent py-3 px-3 d-flex align-items-center gap-3 w-100">
            <LogOut size={20} /> <span className="fw-semibold">Sign Out</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-grow-1" style={{ marginLeft: "260px" }}>
        {/* TOP HEADER */}
        <header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center sticky-top">
          <div>
            <h4 className="fw-bold mb-0 text-dark">
              {activeTab === 'tables' && "Dining Floor Status"}
              {activeTab === 'reservations' && "Booking Records"}
              {activeTab === 'billing' && "Payment Verification"}
              {activeTab === 'reports' && "Sales Analytics"}
            </h4>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="text-end d-none d-md-block">
              <div className="fw-bold small text-dark">Cashier Terminal</div>
              <div className="text-muted smaller" style={{ fontSize: '11px' }}>ID: {localStorage.getItem("userId")}</div>
            </div>
            <UserCircle size={32} className="text-secondary" />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-4">
          <div className="fade-in">
            {renderContent()}
          </div>
        </main>
      </div>

      <style>{`
        .transition-all { transition: all 0.2s ease-in-out; }
        .nav-link:hover { color: white !important; background-color: rgba(255,255,255,0.05) !important; border-radius: 8px; }
        .smaller { font-size: 0.75rem; }
        .fade-in { animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default CashierDashboard;
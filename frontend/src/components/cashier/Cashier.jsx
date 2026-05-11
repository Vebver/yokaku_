  import React, { useState } from "react";
import TableStatus from "../admin-page/TableStatus";
import Reservations from "../admin-page/Reservation";
import Billing from "../admin-page/Billing";
import Reports from "../admin-page/Reports";

const CashierDashboard = () => {
  const [activeTab, setActiveTab] = useState("tables");

  // Helper to render the correct component based on tab
  const renderContent = () => {
    switch (activeTab) {
      case "tables":
        return <div>{ <TableStatus />} <Placeholder title="Table Status Map" /> </div>;
      case "reservations":
        return <div>{ <Reservations />} <Placeholder title="Today's Reservations" /> </div>;
      case "billing":
        return <div>{ <Billing />} <Placeholder title="Billing & Checkout" /> </div>;
      case "reports":
        return <div>{<Reports />} <Placeholder title="Daily Sales Report" /> </div>;
      default:
        return <Placeholder title="Select an option" />;
    }
  };

  return (
    <div className="container-fluid px-5 py-4" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0 text-dark">Cashier Terminal</h2>
          <p className="text-muted small">Manage dining floor and transactions</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-dark btn-sm fw-bold">Clock In</button>
          <button className="btn btn-dark btn-sm fw-bold">End Shift</button>
        </div>
      </div>

      {/* NAVIGATION TABS - Styled like the Admin UI */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
        <div className="card-body p-2">
          <ul className="nav nav-pills nav-fill">
            <li className="nav-item">
              <button 
                className={`nav-link fw-bold ${activeTab === 'tables' ? 'active btn-dark' : 'text-dark'}`}
                onClick={() => setActiveTab('tables')}
              >
                Table Status
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link fw-bold ${activeTab === 'reservations' ? 'active btn-dark' : 'text-dark'}`}
                onClick={() => setActiveTab('reservations')}
              >
                Reservations
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link fw-bold ${activeTab === 'billing' ? 'active btn-dark' : 'text-dark'}`}
                onClick={() => setActiveTab('billing')}
              >
                Billing
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link fw-bold ${activeTab === 'reports' ? 'active btn-dark' : 'text-dark'}`}
                onClick={() => setActiveTab('reports')}
              >
                Reports
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div className="card shadow-sm border-0" style={{ borderRadius: "12px", minHeight: "60vh" }}>
        <div className="card-body p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;
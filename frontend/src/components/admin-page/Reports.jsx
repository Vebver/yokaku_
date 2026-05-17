import React, { useState, useEffect } from "react";
import axios from "axios";
import FinancialOverview from "./FinancialOverview";
import ProductPerformance from "./ProductPerformance";
import InventoryReport from "./InventoryReport";
import { RefreshCw } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Reports() {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token"); 
      const res = await axios.get(`${API_BASE}/admin/reports/financial`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setFinancialData(res.data.data);
      }
    } catch (err) {
      console.error("Fetch error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  return (
    // Changed p-4 to p-3 p-md-4 for better mobile spacing
    <div className="container-fluid p-3 p-md-4 bg-light" style={{ minHeight: '100vh' }}>
      
      {/* Header: Responsive flex layout for iPhone SE */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-0 fs-3">Financial Analytics</h2>
          <p className="text-muted small mb-0">Real-time business performance</p>
        </div>
        <button
          className="btn btn-dark d-flex align-items-center gap-2 shadow-sm w-100 w-sm-auto justify-content-center"
          onClick={fetchReportData}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          {loading ? "Analyzing..." : "Refresh Report"}
        </button>
      </div>

      {loading && !financialData ? (
        <div className="text-center p-5 mt-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-muted fw-bold">Analyzing financial records...</p>
        </div>
      ) : (
        /* FIXED: Wrapped multiple components in a div with a gap */
        <div className="d-flex flex-column gap-4">
          <FinancialOverview data={financialData} />
          <ProductPerformance data={financialData} />
          <InventoryReport data={financialData} />
        </div>
      )}

      {/* Global CSS for the spin animation */}
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Reports;
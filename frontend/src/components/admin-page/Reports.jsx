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
        headers: { Authorization: `Bearer ${token}` },
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
    <div
      className="container-fluid p-3 p-md-4 bg-light"
      style={{ minHeight: "100vh" }}
    >
      {/* 1. PAGE HEADER */}
      <div className="mb-5 px-2">
        <h2 className="fw-bold mb-0 fs-3">Financial Analytics</h2>
        <p className="text-muted small mb-0">Real-time business performance</p>
      </div>

      {loading && !financialData ? (
        <div className="text-center p-5 mt-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-muted fw-bold">Analyzing records...</p>
        </div>
      ) : (
        /* 2. COMPONENT STACK - Using Row/Col to prevent overlap */
        <div className="row g-5">
          <div className="col-12">
            <FinancialOverview data={financialData} />
          </div>

          <div className="col-12">
            <ProductPerformance data={financialData} />
          </div>

          <div className="col-12">
            <InventoryReport data={financialData} />
          </div>
        </div>
      )}

      <style>{`
      .animate-spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `}</style>
    </div>
  );  
}

export default Reports;

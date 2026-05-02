import React, { useState, useEffect } from "react";
import axios from "axios";
import FinancialOverview from "./FinancialOverview";
import { RefreshCw } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Reports() {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/reports/financial`);
      if (res.data.success) {
        setFinancialData(res.data.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  return (
    <div className="container-fluid p-4 bg-light">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Financial Analytics</h2>
        <button
          className="btn btn-dark"
          onClick={fetchReportData}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      {loading && !financialData ? (
        <div className="text-center p-5">Analyzing records...</div>
      ) : (
        <FinancialOverview data={financialData} />
      )}
    </div>
  );
}

export default Reports;

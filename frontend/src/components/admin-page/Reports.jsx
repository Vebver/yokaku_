import React, { useState, useEffect } from "react";
import axios from "axios";
import FinancialOverview from "./FinancialOverview"; // Path to your child component
import { RefreshCw, Download } from "lucide-react";

function Reports() {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch the data
  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the token from local storage (if your admin route is protected)
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const response = await axios.get("http://localhost:5000/api/admin/reports/financial", config);

      if (response.data.success) {
        setFinancialData(response.data.data);
      } else {
        throw new Error("Data fetch unsuccessful");
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load financial reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchReportData();
  }, []);

  return (
    <div className="container-fluid p-4 bg-light">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-0">Financial Analytics</h2>
          <p className="text-muted small">Comprehensive business performance reports.</p>
        </div>
        
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-dark d-flex align-items-center gap-2" 
            onClick={fetchReportData}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button className="btn btn-dark d-flex align-items-center gap-2">
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading && !financialData ? (
        <div className="text-center p-5 mt-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Analyzing financial records...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger shadow-sm border-0 m-4">
          {error}
        </div>
      ) : (
        <div className="fade-in">
          {/* We pass the data we got from axios into the child component */}
          <FinancialOverview data={financialData} />
        </div>
      )}
    </div>
  );
}

export default Reports;
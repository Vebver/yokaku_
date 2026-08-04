import React, { useState, useEffect } from "react";
import api from "../../api";
import FinancialOverview from "./FinancialOverview";
import ProductPerformance from "./ProductPerformance";
import InventoryReport from "./InventoryReport";
import { RefreshCw, DollarSign, Package, BarChart2 } from "lucide-react";

function Reports() {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("financial"); // Current view state

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get(
        `/admin/reports/financial-analytics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

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

  // Helper to render the selected component
  const renderActiveReport = () => {
    if (!financialData) return null;

    switch (activeTab) {
      case "financial":
        return <FinancialOverview data={financialData} />;
      case "products":
        return <ProductPerformance data={financialData} />;
      case "inventory":
        return <InventoryReport data={financialData} />;
      default:
        return <FinancialOverview data={financialData} />;
    }
  };

  return (
    <div className="reports-container p-3 pt-2">
      {/* HEADER WITH REFRESH */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div>
          <h2 className="fw-bold mb-0 text-dark">Business Reports</h2>
          <p className="text-muted small mb-0">
            Select a category to view detailed analytics
          </p>
        </div>
        <button
          onClick={fetchReportData}
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* SEGMENTED TAB NAVIGATION */}
      <div className="report-tabs-wrapper mb-2">
        <div className="report-tabs-container">
          <button
            className={`report-tab-btn ${activeTab === "financial" ? "active" : ""}`}
            onClick={() => setActiveTab("financial")}
          >
            <DollarSign size={18} />
            <span>Financials</span>
          </button>

          <button
            className={`report-tab-btn ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <BarChart2 size={18} />
            <span>Products</span>
          </button>

          <button
            className={`report-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            <Package size={18} />
            <span>Inventory</span>
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="report-content-card shadow-sm border p-0">
        {loading && !financialData ? (
          <div className="text-center py-5">
            <div
              className="spinner-border text-warning mb-3"
              role="status"
            ></div>
            <p className="text-muted fw-bold">Generating Report...</p>
          </div>
        ) : (
          <div className="fade-in-animation">{renderActiveReport()}</div>
        )}
      </div>

      <style>{`
            .report-tabs-wrapper {
              background: #e9ecef;
              padding: 5px;
              border-radius: 12px;
              display: inline-block;
            }

            .report-tabs-container {
              display: flex;
              gap: 5px;
            }

            .report-tab-btn {
              border: none;
              background: transparent;
              padding: 10px 25px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              gap: 10px;
              font-weight: 600;
              color: #6c757d;
              transition: all 0.2s ease;
            }

            .report-tab-btn:hover {
              background: rgba(255,255,255,0.5);
              color: #333;
            }

            .report-tab-btn.active {
              background: #fff;
              color: #ffc107; /* Matches your theme */
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .report-content-card {
              background: #fff;
              border-radius: 15px;
              overflow: hidden;
            }

            .fade-in-animation {
              animation: fadeIn 0.3s ease-in;
            }

            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .animate-spin { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 768px) {
              .report-tabs-wrapper { display: block; }
              .report-tabs-container { width: 100%; }
              .report-tab-btn { flex: 1; justify-content: center; padding: 10px 5px; font-size: 12px; }
            }

            .min-w-0 { min-width: 0; }
          `}</style>
    </div>
  );
}

export default Reports;

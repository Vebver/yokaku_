import React, { useState, useEffect, Suspense, lazy } from "react";
import api from "../../api";
import FinancialOverview from "./FinancialOverview";
import InventoryReport from "./InventoryReport";
import { useSectionRefresh } from "../shared/sectionRefresh";
import "../../Style/Reports.css";

const ProductPerformance = lazy(() => import("./ProductPerformance"));

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

  // Reload on the shared admin refresh button in the top bar.
  useSectionRefresh(() => {
    fetchReportData();
  });

  if (!financialData) return null;

  // Only the active tab is mounted. Each panel also pulls its own CSS and
  // chart library, so rendering the inactive one cost real time on open.
  const renderActiveReport = () => {
    switch (activeTab) {
      case "financial":
        return <FinancialOverview data={financialData} />;
      case "products":
        return (
          <Suspense
            fallback={
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status"></div>
              </div>
            }
          >
            <ProductPerformance data={financialData} />
          </Suspense>
        );
      case "inventory":
        return <InventoryReport data={financialData} />;
      default:
        return <FinancialOverview data={financialData} />;
    }
  };

  return (
    <div className="reports-container p-3 pt-2">
      {/* HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div className="min-w-0">
          <h2 className="fw-bold mb-0 text-dark fs-5 fs-md-3">
            Business Reports
          </h2>
          <p className="text-muted small mb-0">
            Select a category to view detailed analytics
          </p>
        </div>
      </div>

      {/* SEGMENTED TAB NAVIGATION */}
      <div className="report-tabs-wrapper mb-2">
        <div className="report-tabs-container">
          <button
            className={`report-tab-btn ${activeTab === "financial" ? "active" : ""}`}
            onClick={() => setActiveTab("financial")}
          >
            <span>Financials</span>
          </button>

          <button
            className={`report-tab-btn ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <span>Products</span>
          </button>

          <button
            className={`report-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
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
    </div>
  );
}

export default Reports;

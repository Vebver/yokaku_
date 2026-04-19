import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

function Reports() {
  const [reportPeriod, setReportPeriod] = useState("Last 6 Months");
  const [loading, setLoading] = useState(true);

  // 1. MOVED STATE: From AdminDashboard
  const [revenueChartData, setRevenueChartData] = useState({
    labels: [],
    data: [],
  });

  // 2. MOVED API CALL: From AdminDashboard
  const fetchReportsData = async () => {
    try {
      setLoading(true);
      // Ensure token is attached if not already handled by a global interceptor
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const chartRes = await axios.get("/api/admin/revenue-chart", config);

      setRevenueChartData({
        labels: chartRes.data.labels || [],
        data: chartRes.data.data || [],
      });
    } catch (error) {
      console.error("Error fetching reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  // 3. MOVED CONFIG: Memoized chart configuration
  const barChartConfig = useMemo(
    () => ({
      labels:
        revenueChartData.labels.length > 0
          ? revenueChartData.labels
          : ["No Data"],
      datasets: [
        {
          label: "Downpayment Revenue ($)",
          data: revenueChartData.data.length > 0 ? revenueChartData.data : [0],
          backgroundColor: "rgba(16, 185, 129, 0.7)", // Green POS style from dashboard
          borderRadius: 5,
        },
      ],
    }),
    [revenueChartData],
  );

  // Static Comparison Data (for Revenue vs Expenses)
  const comparisonData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Revenue",
        data: [4500, 5200, 4800, 7100, 6800, 8200],
        backgroundColor: "#0d6efd",
        borderRadius: 5,
      },
      {
        label: "Expenses",
        data: [3100, 3800, 3200, 4100, 3900, 4800],
        backgroundColor: "#e9ecef",
        borderRadius: 5,
      },
    ],
  };

  return (
    <div className="container-fluid fade-in pb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Financial Reports</h2>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary shadow-sm">
            <i className="bi bi-download me-2"></i>CSV
          </button>
          <button className="btn btn-primary shadow-sm">
            <i className="bi bi-printer me-2"></i>PDF
          </button>
        </div>
      </div>

      {/* Row 2: MOVED SECTION FROM DASHBOARD */}
      <div className="row g-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0">
                Monthly Booking Revenue (Downpayments)
              </h5>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={fetchReportsData}
                disabled={loading}
              >
                <i
                  className={`bi bi-arrow-clockwise me-2 ${loading ? "spin" : ""}`}
                ></i>
                Refresh
              </button>
            </div>

            <div style={{ height: "400px" }}>
              {loading ? (
                <div className="h-100 d-flex align-items-center justify-content-center">
                  <div
                    className="spinner-border text-primary"
                    role="status"
                  ></div>
                </div>
              ) : (
                <Bar
                  data={barChartConfig}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;

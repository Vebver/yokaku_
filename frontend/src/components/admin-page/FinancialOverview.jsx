import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Calendar, BarChart3, PieChart } from "lucide-react";
import "../../Style/FinancialOverview.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const FinancialOverview = ({ data }) => {
  const reportData = data?.data || data;
  const [period, setPeriod] = useState("weekly");
  const [isExporting, setIsExporting] = useState(false);

  if (!reportData || !reportData.summary) {
    return (
      <div
        className="d-flex justify-content-center align-items-center p-5"
        style={{ minHeight: "400px" }}
      >
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading financial data...</p>
        </div>
      </div>
    );
  }

  const { summary } = reportData;

  const getActiveTrend = () => {
    if (period === "weekly") return reportData.weeklyTrend || [];
    if (period === "yearly") return reportData.yearlyTrend || [];
    return reportData.monthlyTrend || [];
  };

  const activeTrend = getActiveTrend();

  const totalYearly = Number(
    summary.yearly_revenue || summary.monthly_revenue || 0,
  );
  const totalMonthly = Number(summary.monthly_revenue || 0);
  const totalWeekly = Number(
    summary.weekly_revenue || summary.daily_revenue || 0,
  );
  const averageOrder = Number(summary.aov || 0);
  const totalOrders = Number(summary.total_orders || 0);

  const getProfitLabel = () => {
    if (period === "weekly") return totalWeekly;
    if (period === "yearly") return totalYearly;
    return totalMonthly;
  };

  const formatCurrency = (val) =>
    `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f1f5f9",
        bodyColor: "#cbd5e1",
        borderColor: "#f59e0b",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => ` Revenue: ${formatCurrency(context.raw)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "#e2e8f0", drawBorder: false },
        ticks: {
          callback: (val) => "₱" + val.toLocaleString(),
          color: "#64748b",
        },
        title: { display: true, text: "Revenue (₱)", color: "#94a3b8" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#64748b" },
      },
    },
    elements: { point: { hoverRadius: 8, hoverBorderWidth: 2 } },
  };

  const getGradient = (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(245, 158, 11, 0.3)");
    gradient.addColorStop(1, "rgba(245, 158, 11, 0.02)");
    return gradient;
  };

  const StatCard = ({
    label,
    value,
    color,
    isCurrency = true,
    subtitle = null,
  }) => (
    <div className="card border-0 shadow-sm rounded-4 h-100 bg-white position-relative overflow-hidden">
      <div
        className={`position-absolute top-0 end-0 w-25 h-100 opacity-10 bg-${color}`}
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      ></div>
      <div className="card-body p-3 p-sm-4 p-lg-5">
        {subtitle && (
          <div className="d-flex justify-content-end mb-2 mb-sm-3">
            <span className="badge bg-light text-muted rounded-pill">
              {subtitle}
            </span>
          </div>
        )}
        <h3 className="fw-bold mb-1 text-dark fo-kpi-value">
          {isCurrency ? formatCurrency(value) : value.toLocaleString()}
        </h3>
        <p className="text-muted small mb-0 text-uppercase fw-semibold fo-kpi-label">
          {label}
        </p>
      </div>
    </div>
  );

  const getPeriodLabel = () => {
    if (period === "weekly") return "Weekly Revenue & Profit";
    if (period === "yearly") return "Yearly Revenue & Profit";
    return "Monthly Revenue & Profit";
  };

  return (
    <div className="financial-overview p-3 p-md-4">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 mb-md-4 pb-2 border-bottom">
        <div className="min-w-0">
          <h2 className="fw-bold mb-1 text-dark fs-5 fs-md-3">
            Financial Report
          </h2>
          <p className="text-muted small mb-0">
            Profit Trend Analysis
            <span className="ms-1 text-muted d-block d-sm-inline">
              Date:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="row g-3 g-md-4 mb-3 mb-md-4">
        <div className="col-6 col-lg-3">
          <StatCard
            label={`${period === "weekly" ? "Weekly" : period === "yearly" ? "Yearly" : "Monthly"} Profit`}
            value={getProfitLabel()}
            color="warning"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            label="Average Order Value"
            value={averageOrder}
            color="info"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            label="Total Orders"
            value={totalOrders}
            color="success"
            isCurrency={false}
          />
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-gradient-warning text-white">
            <div className="card-body p-3 p-sm-4 p-lg-5">
              <h3 className="fw-bold mb-1 fo-kpi-value text-break">
                {formatCurrency(totalYearly)}
              </h3>
              <p className="mb-0 small text-white-50 text-uppercase fw-semibold fo-kpi-label">
                Year-to-Date Revenue
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card border-0 shadow-sm rounded-4 mb-3 mb-md-4">
        <div className="card-header bg-white border-0 pt-3 pt-md-4 px-3 px-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <div className="min-w-0">
              <h5 className="fw-bold mb-0 fs-6 fs-md-5">
                {getPeriodLabel()}
              </h5>
              <small className="text-muted">Revenue performance tracking</small>
            </div>
<div className="d-flex flex-wrap gap-2 mt-3 mt-md-0 w-100 w-md-auto fo-period-tabs">
              <button
                onClick={() => setPeriod("weekly")}
                className={`btn btn-sm px-3 px-md-4 rounded-pill fw-semibold transition-all flex-fill flex-md-grow-0 ${period === "weekly" ? "btn-warning text-white shadow-sm" : "btn-light text-muted"}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod("monthly")}
                className={`btn btn-sm px-3 px-md-4 rounded-pill fw-semibold transition-all flex-fill flex-md-grow-0 ${period === "monthly" ? "btn-warning text-white shadow-sm" : "btn-light text-muted"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod("yearly")}
                className={`btn btn-sm px-3 px-md-4 rounded-pill fw-semibold transition-all flex-fill flex-md-grow-0 ${period === "yearly" ? "btn-warning text-white shadow-sm" : "btn-light text-muted"}`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>
<div className="card-body p-2 p-md-4 chart-body">
          <Line
            options={chartOptions}
            data={{
              labels: activeTrend.map(
                (t) => t.label || t.month || t.date || t.year,
              ),
              datasets: [
                {
                  label: "Revenue",
                  data: activeTrend.map((t) =>
                    Number(t.value || t.revenue || 0),
                  ),
                  borderColor: "#f59e0b",
                  borderWidth: 3,
                  tension: 0.4,
                  pointRadius: 4,
                  pointBackgroundColor: "#f59e0b",
                  pointBorderColor: "white",
                  pointBorderWidth: 2,
                  fill: true,
                  backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return null;
                    const gradient = ctx.createLinearGradient(
                      0,
                      chartArea.top,
                      0,
                      chartArea.bottom,
                    );
                    gradient.addColorStop(0, "rgba(245, 158, 11, 0.25)");
                    gradient.addColorStop(1, "rgba(245, 158, 11, 0.02)");
                    return gradient;
                  },
                },
              ],
            }}
          />
        </div>
      </div>

      {/* Data Tables Section */}
      <div className="row g-4">
        {/* Weekly Trend Table */}
        {period === "weekly" &&
          reportData.weeklyTrend &&
          reportData.weeklyTrend.length > 0 && (
            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-white border-0 pt-3 pt-md-4 px-3 px-md-4">
                  <div className="d-flex align-items-center gap-2">
                    <Calendar size={18} className="text-warning flex-shrink-0" />
                    <h6 className="fw-bold mb-0 fs-6">Weekly Revenue Breakdown</h6>
                  </div>
                </div>
                <div className="card-body p-3 p-md-4 pt-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle fo-table">
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold">Week Period</th>
                          <th className="fw-semibold text-end">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.weeklyTrend.map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-muted fo-cell-label" data-label="Period">
                              {item.label || item.date}
                            </td>
                            <td className="text-end text-success fw-semibold">
                              {formatCurrency(item.value || item.revenue || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Monthly Trend Table */}
        {period === "monthly" &&
          reportData.monthlyTrend &&
          reportData.monthlyTrend.length > 0 && (
            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 pt-3 pt-md-4 px-3 px-md-4">
                  <div className="d-flex align-items-center gap-2">
                    <BarChart3 size={18} className="text-warning flex-shrink-0" />
                    <h6 className="fw-bold mb-0 fs-6">Monthly Performance</h6>
                  </div>
                </div>
                <div className="card-body p-3 p-md-4 pt-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle fo-table">
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold">Month</th>
                          <th className="fw-semibold text-end">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.monthlyTrend.map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-muted fo-cell-label" data-label="Month">
                              {item.month}
                            </td>
                            <td className="text-end fw-semibold text-dark">
                              {formatCurrency(item.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Yearly Trend Table */}
        {period === "yearly" &&
          reportData.yearlyTrend &&
          reportData.yearlyTrend.length > 0 && (
            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 pt-3 pt-md-4 px-3 px-md-4">
                  <div className="d-flex align-items-center gap-2">
                    <PieChart size={18} className="text-warning flex-shrink-0" />
                    <h6 className="fw-bold mb-0 fs-6">Yearly Performance</h6>
                  </div>
                </div>
                <div className="card-body p-3 p-md-4 pt-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle fo-table">
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold">Year</th>
                          <th className="fw-semibold text-end">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.yearlyTrend.map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-muted fo-cell-label" data-label="Year">
                              {item.year}
                            </td>
                            <td className="text-end fw-semibold text-dark">
                              {formatCurrency(item.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      </div>
  );
};

export default FinancialOverview;

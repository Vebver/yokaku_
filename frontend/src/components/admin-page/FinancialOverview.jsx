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
import {
  TrendingUp,
  ShoppingBag,
  Wallet,
  CreditCard,
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Download,
  FileText,
  Printer,
} from "lucide-react";

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
  const [period, setPeriod] = useState("monthly");
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
    if (period === "yearly") return reportData.monthlyTrend || [];
    return reportData.dailyTrend || [];
  };

  const activeTrend = getActiveTrend();

  const totalYearly = Number(
    summary.yearly_revenue || summary.monthly_revenue || 0,
  );
  const totalMonthly = Number(summary.monthly_revenue || 0);
  const averageOrder = Number(summary.aov || 0);
  const totalOrders = Number(summary.total_orders || 0);

  const getProfitLabel = () => {
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
    icon: Icon,
    color,
    isCurrency = true,
    subtitle = null,
  }) => (
    <div className="card border-0 shadow-sm rounded-4 h-100 bg-white position-relative overflow-hidden">
      <div
        className={`position-absolute top-0 end-0 w-25 h-100 opacity-10 bg-${color}`}
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      ></div>
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div
            className={`bg-${color}-light text-${color} rounded-3 d-flex align-items-center justify-content-center`}
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: `rgba(245, 158, 11, 0.1)`,
            }}
          >
            <Icon
              size={24}
              color={
                color === "warning"
                  ? "#f59e0b"
                  : color === "success"
                    ? "#10b981"
                    : color === "info"
                      ? "#3b82f6"
                      : "#f59e0b"
              }
            />
          </div>
          {subtitle && (
            <span className="badge bg-light text-muted rounded-pill">
              {subtitle}
            </span>
          )}
        </div>
        <h3 className="fw-bold mb-1 text-dark">
          {isCurrency ? formatCurrency(value) : value.toLocaleString()}
        </h3>
        <p className="text-muted small mb-0 text-uppercase fw-semibold">
          {label}
        </p>
      </div>
    </div>
  );

  const getPeriodLabel = () => {
    if (period === "yearly") return "Monthly Revenue by Year";
    return "Daily Revenue This Month";
  };

  return (
    <div className="financial-overview p-3 p-md-4">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Financial Report</h2>
          <p className="text-muted small mb-0">
            Profit Trend Analysis
            <span className="ms-2 text-warning">●</span>
            <span className="ms-1 text-muted">
              Generated:{" "}
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
      <div className="row g-4 mb-4">
        <div className="col-lg-3 col-md-6">
          <StatCard
            label={`${period === "yearly" ? "Year-to-Date" : "Monthly"} Revenue`}
            value={getProfitLabel()}
            icon={TrendingUp}
            color="warning"
          />
        </div>
        <div className="col-lg-3 col-md-6">
          <StatCard
            label="Average Order Value"
            value={averageOrder}
            icon={Wallet}
            color="info"
          />
        </div>
        <div className="col-lg-3 col-md-6">
          <StatCard
            label="Total Orders"
            value={totalOrders}
            icon={ShoppingBag}
            color="success"
            isCurrency={false}
          />
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-gradient-warning text-white">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div
                  className="bg-white bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: "48px", height: "48px" }}
                >
                  <CreditCard size={24} color="white" />
                </div>
              </div>
              <h3 className="fw-bold mb-1">{formatCurrency(totalYearly)}</h3>
              <p className="mb-0 small text-white-50 text-uppercase fw-semibold">
                Year-to-Date Revenue
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-header bg-white border-0 pt-4 px-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <div>
              <h5 className="fw-bold mb-0">{getPeriodLabel()}</h5>
              <small className="text-muted">Revenue performance tracking</small>
            </div>
<div className="d-flex flex-wrap gap-2 mt-3 mt-md-0">
              <button
                onClick={() => setPeriod("monthly")}
                className={`btn btn-sm px-4 rounded-pill fw-semibold transition-all ${period === "monthly" ? "btn-warning text-white shadow-sm" : "btn-light text-muted"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod("yearly")}
                className={`btn btn-sm px-4 rounded-pill fw-semibold transition-all ${period === "yearly" ? "btn-warning text-white shadow-sm" : "btn-light text-muted"}`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>
<div className="card-body p-4 chart-body" style={{ height: "420px" }}>
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
        {/* Daily Trend Table */}
        {period === "monthly" &&
          reportData.dailyTrend &&
          reportData.dailyTrend.length > 0 && (
            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-white border-0 pt-4 px-4">
                  <div className="d-flex align-items-center gap-2">
                    <Calendar size={18} className="text-warning" />
                    <h6 className="fw-bold mb-0">Daily Revenue Breakdown</h6>
                  </div>
                </div>
                <div className="card-body p-4 pt-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold">Day</th>
                          <th className="fw-semibold text-end">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.dailyTrend.map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-muted">
                              {item.date}
                            </td>
                            <td className="text-end text-success fw-semibold">
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
          reportData.monthlyTrend &&
          reportData.monthlyTrend.length > 0 && (
            <div className="col-md-6">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 pt-4 px-4">
                  <div className="d-flex align-items-center gap-2">
                    <BarChart3 size={18} className="text-warning" />
                    <h6 className="fw-bold mb-0">Monthly Revenue Breakdown</h6>
                  </div>
                </div>
                <div className="card-body p-4 pt-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold">Month</th>
                          <th className="fw-semibold text-end">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.monthlyTrend.map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-muted">{item.month}</td>
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

      {/* Custom CSS for styling */}
      <style>{`
        .financial-overview {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .bg-gradient-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        .transition-all {
          transition: all 0.2s ease;
        }
        .btn-warning {
          background: #f59e0b;
          border-color: #f59e0b;
        }
        .btn-warning:hover {
          background: #d97706;
          border-color: #d97706;
        }
        .table-light th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
        }
.alert-light {
          background-color: #f8fafc;
          border-color: #e2e8f0;
        }
        @media (max-width: 768px) {
          .financial-overview .chart-body {
            height: 300px !important;
          }
        }
        @media print {
          .btn, .card-header button {
            display: none !important;
          }
          .financial-overview {
            padding: 0 !important;
          }
          .card {
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FinancialOverview;

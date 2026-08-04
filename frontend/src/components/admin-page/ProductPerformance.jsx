import React, { useState } from "react";
import {
  ArrowDown,
  Award,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingDown,
  Package,
  DollarSign,
  BarChart3,
} from "lucide-react";

const ProductPerformance = ({ data }) => {
  const topProducts = data?.top_selling_products || [];
  const slowMoving = data?.slow_moving_products || [];
  const summary = data?.summary || {};

  const totalRevenue = summary?.total_revenue || 0;
  const totalItemsSold = summary?.total_items_sold || 0;
  const topProductCount = topProducts.length;
  const slowProductCount = slowMoving.length;

  // --- LOCAL PAGINATION STATE FOR TOP SELLERS ---
  const [topPage, setTopPage] = useState(1);
  const topItemsPerPage = 5;
  const totalTopPages = Math.ceil(topProducts.length / topItemsPerPage);

  const topIndexOfLastItem = topPage * topItemsPerPage;
  const topIndexOfFirstItem = topIndexOfLastItem - topItemsPerPage;
  const currentTopItems = topProducts.slice(
    topIndexOfFirstItem,
    topIndexOfLastItem,
  );

  // --- LOCAL PAGINATION STATE FOR SLOW MOVING ---
  const [slowPage, setSlowPage] = useState(1);
  const slowItemsPerPage = 6;
  const totalSlowPages = Math.ceil(slowMoving.length / slowItemsPerPage);

  const slowIndexOfLastItem = slowPage * slowItemsPerPage;
  const slowIndexOfFirstItem = slowIndexOfLastItem - slowItemsPerPage;
  const currentSlowItems = slowMoving.slice(
    slowIndexOfFirstItem,
    slowIndexOfLastItem,
  );

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);

  const formatNumber = (num) => new Intl.NumberFormat("en-PH").format(num);

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
            className="rounded-3 d-flex align-items-center justify-content-center"
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
          {isCurrency ? formatCurrency(value) : formatNumber(value)}
        </h3>
        <p className="text-muted small mb-0 text-uppercase fw-semibold">
          {label}
        </p>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="product-performance-container p-3 p-md-4">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Product Performance</h2>
          <p className="text-muted small mb-0">
            Insights into your menu's popularity
            <span className="ms-2 text-warning">●</span>
            <span className="ms-1 text-muted">Real-time analytics</span>
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-4 mb-4">
        {/* Total Revenue */}
        <div className="col-lg-4 col-md-6">
          <StatCard
            label="Kiosk Sales Revenue"
            value={totalRevenue}
            icon={DollarSign}
            color="primary"
          />
        </div>

        {/* Total Items Sold */}
        <div className="col-lg-4 col-md-6">
          <StatCard
            label="Total Items Sold"
            value={totalItemsSold}
            icon={Package}
            color="success"
            isCurrency={false}
          />
        </div>

        {/* Top Selling Items */}
        <div className="col-lg-4 col-md-12">
          <StatCard
            label="Top Selling Items"
            value={topProductCount}
            icon={Star}
            color="warning"
            isCurrency={false}
          />
        </div>


      </div>

      {/* Main Content Row */}
      <div className="row g-3">
        {/* Top Sellers Section */}
        <div className="col-12 col-lg-12">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 pt-4 px-4">
              <div className="d-flex align-items-center justify-content-between w-100">
                <div className="d-flex align-items-center gap-2">
                  <Award size={18} className="text-warning" />
                  <h6 className="fw-bold mb-0">Top Selling Items</h6>
                </div>
                <div className="d-flex gap-1">
                  <button
                    className="btn btn-light btn-sm rounded-circle p-1 border shadow-none"
                    style={{ width: "30px", height: "30px" }}
                    disabled={topPage === 1}
                    onClick={() => setTopPage((p) => p - 1)}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="btn btn-light btn-sm rounded-circle p-1 border shadow-none"
                    style={{ width: "30px", height: "30px" }}
                    disabled={topPage >= totalTopPages}
                    onClick={() => setTopPage((p) => p + 1)}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
<thead className="table-light">
                    <tr>
                      <th className="fw-semibold ps-4">Item</th>
                      <th className="fw-semibold text-center">Sold</th>
                      <th className="fw-semibold text-end pe-4">Revenue</th>
                    </tr>
                  </thead>
                 <tbody>
  {currentTopItems.length > 0 ? (
    currentTopItems.map((p, i) => {
      const rank = topIndexOfFirstItem + i + 1;
      return (
        <tr key={i}>
          <td className="py-3 ps-4" data-label="Item">
            <div className="d-flex align-items-center gap-3">
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${rank === 1 ? "bg-warning text-white" : "bg-light text-dark"}`}
                style={{
                  width: "32px",
                  height: "32px",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {rank}
              </div>
<div className="min-w-0">
                <div className="fw-semibold text-dark d-flex flex-wrap align-items-center gap-1">
                  {p.menu_name}
                  {rank === 1 && (
                    <span
                      className="badge bg-warning text-dark rounded-pill"
                      style={{
                        fontSize: "10px",
                        fontWeight: "600",
                      }}
                    >
                      BEST SELLER
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>
          <td className="text-center" data-label="Sold">
            <span className="fw-semibold">
              {p.total_sold}
            </span>
            <small className="text-muted d-block">
              units
            </small>
          </td>
          <td className="text-end pe-4" data-label="Revenue">
            <span className="fw-bold text-primary">
              {formatCurrency(p.total_revenue)}
            </span>
          </td>
        </tr>
      );
    })
  ) : (
    <tr>
      <td colSpan="3" className="text-center py-5 text-muted">
        <Package size={40} className="mb-3 opacity-25" />
        <p>No sales data available</p>
      </td>
    </tr>
  )}
</tbody>
                </table>
              </div>
            </div>
            {totalTopPages > 1 && (
              <div className="card-footer bg-white border-0 pt-2 pb-3 px-4">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Showing {topIndexOfFirstItem + 1} -{" "}
                    {Math.min(topIndexOfLastItem, topProducts.length)} of{" "}
                    {topProducts.length} items
                  </small>
                  <div className="d-flex gap-1">
                    {[...Array(Math.min(totalTopPages, 3))].map((_, idx) => (
                      <button
                        key={idx}
                        className={`btn btn-sm rounded-circle p-0 ${topPage === idx + 1 ? "btn-warning text-white" : "btn-light"}`}
                        style={{
                          width: "28px",
                          height: "28px",
                          fontSize: "12px",
                        }}
                        onClick={() => setTopPage(idx + 1)}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    {totalTopPages > 3 && (
                      <span className="mx-1 text-muted">...</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <style>{`
        .product-performance-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .bg-gradient-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }
        .table-light th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          padding: 12px 16px;
        }
        .table td {
          padding: 12px 16px;
          vertical-align: middle;
        }
        .list-group-item {
          transition: all 0.2s ease;
        }
.list-group-item:hover {
          background-color: #f8fafc;
          transform: translateX(4px);
        }
        @media (max-width: 768px) {
          .product-performance-container .table-responsive {
            overflow: visible;
          }
          .product-performance-container thead {
            display: none;
          }
          .product-performance-container .table,
          .product-performance-container .table tbody,
          .product-performance-container .table tr,
          .product-performance-container .table td {
            display: block;
            width: 100%;
          }
          .product-performance-container .table tbody tr {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 12px;
            padding: 12px 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }
          .product-performance-container .table td {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: none;
            padding: 8px 0;
            text-align: right !important;
          }
          .product-performance-container .table td[data-label]::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            text-align: left;
            flex-shrink: 0;
          }
          .product-performance-container .table td[data-label="Item"] {
            display: block;
            text-align: left !important;
            border-bottom: 1px dashed #e2e8f0;
            margin-bottom: 6px;
            padding-bottom: 10px;
          }
          .product-performance-container .table td[data-label="Item"]::before {
            display: none;
          }
          .product-performance-container .card-footer .d-flex {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
        }
        @media print {
          .btn, .card-header button {
            display: none !important;
          }
          .product-performance-container {
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

export default ProductPerformance;

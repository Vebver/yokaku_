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
import "../../Style/ProductPerformance.css";

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
        <h3 className="fw-bold mb-1 text-dark pp-kpi-value">
          {isCurrency ? formatCurrency(value) : formatNumber(value)}
        </h3>
        <p className="text-muted small mb-0 text-uppercase fw-semibold pp-kpi-label">
          {label}
        </p>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="product-performance-container p-3 p-md-4">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 mb-md-4 pb-2 border-bottom">
        <div className="min-w-0">
          <h2 className="fw-bold mb-1 text-dark fs-5 fs-md-3">
            Product Performance
          </h2>
          <p className="text-muted small mb-0">
            Insights into your menu's popularity
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-3 g-md-4 mb-3 mb-md-4">
        {/* Total Revenue */}
        <div className="col-12 col-sm-6 col-lg-4">
          <StatCard
            label="Kiosk Sales Revenue"
            value={totalRevenue}
            color="primary"
          />
        </div>

        {/* Total Items Sold */}
        <div className="col-12 col-sm-6 col-lg-4">
          <StatCard
            label="Total Items Sold"
            value={totalItemsSold}
            color="success"
            isCurrency={false}
          />
        </div>

        {/* Top Selling Items */}
        <div className="col-12 col-sm-12 col-lg-4">
          <StatCard
            label="Top Selling Items"
            value={topProductCount}
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
            <div className="card-header bg-white border-0 pt-3 pt-md-4 px-3 px-md-4">
              <div className="d-flex align-items-center justify-content-between w-100 gap-2">
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <Award size={18} className="text-warning flex-shrink-0" />
                  <h6 className="fw-bold mb-0 fs-6">Top Selling Items</h6>
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
              <div className="card-footer bg-white border-0 pt-2 pb-3 px-3 px-md-4">
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
    </div>
  );
};

export default ProductPerformance;

import React from "react";
import {
  AlertCircle,
  Activity,
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Clock,
  Download,
  Printer,
} from "lucide-react";

const InventoryReport = ({ data }) => {
  const lowStockCount = data?.low_stock_count || 0;
  const lowStockList = data?.low_stock_list || [];
  const usageData = data?.inventory_usage || [];
  const summary = data?.summary || {};

  const totalInventoryValue = summary?.total_inventory_value || 0;
  const totalItemsUsed = summary?.total_items_used || 0;
  const consumptionRate = summary?.consumption_rate || 0;
  const reorderItems = summary?.reorder_items || 0;

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);

  const formatNumber = (num) => new Intl.NumberFormat("en-PH").format(num);

  // Calculate urgent low stock (less than 5 units)
  const urgentLowStock = lowStockList.filter(
    (item) => item.current_stock < 5,
  ).length;
  const warningLowStock = lowStockList.filter(
    (item) => item.current_stock >= 5 && item.current_stock < 10,
  ).length;

  if (!data) return null;

  return (
    <div className="inventory-report-container">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Inventory Report</h2>
          <p className="text-muted small mb-0">
            Real-time stock & consumption tracking
            <span className="ms-2 text-warning">●</span>
            <span className="ms-1 text-muted">Updated just now</span>
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-4 mb-4">
        {/* Total Inventory Value */}
        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="bg-primary bg-opacity-10 rounded-3 p-2">
                  <Package size={22} className="text-primary" />
                </div>
                <span className="badge bg-light text-muted rounded-pill">
                  Total Value
                </span>
              </div>
              <h3 className="fw-bold mb-1 text-dark">
                {formatCurrency(totalInventoryValue)}
              </h3>
              <p className="text-muted small mb-0">Current inventory worth</p>
            </div>
          </div>
        </div>

        {/* Items Used */}
        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="bg-success bg-opacity-10 rounded-3 p-2">
                  <TrendingDown size={22} className="text-success" />
                </div>
                <span className="badge bg-light text-muted rounded-pill">
                  Consumed
                </span>
              </div>
              <h3 className="fw-bold mb-1 text-dark">
                {formatNumber(totalItemsUsed)} units
              </h3>
              <p className="text-muted small mb-0">Items used this period</p>
            </div>
          </div>
        </div>

        {/* Consumption Rate */}
        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="bg-warning bg-opacity-10 rounded-3 p-2">
                  <BarChart3 size={22} className="text-warning" />
                </div>
                <span className="badge bg-light text-muted rounded-pill">
                  Rate
                </span>
              </div>
              <h3 className="fw-bold mb-1 text-dark">{consumptionRate}%</h3>
              <p className="text-muted small mb-0">Weekly consumption rate</p>
            </div>
          </div>
        </div>

        {/* Reorder Items */}
        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-gradient-warning text-white">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <Clock size={22} color="white" />
                </div>
                <span className="badge bg-white bg-opacity-25 text-white rounded-pill">
                  Reorder
                </span>
              </div>
              <h3 className="fw-bold mb-1">
                {formatNumber(reorderItems)} items
              </h3>
              <p className="mb-0 small text-white-50">Need to reorder</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Consumption Table Row */}
      <div className="row g-4">
        {/* Low Stock Alerts Card */}
        <div className="col-12 col-md-5">
          <div
            className={`card border-0 shadow-sm rounded-4 h-100 overflow-hidden ${lowStockCount > 0 ? "border-start border-4 border-danger" : "border-start border-4 border-success"}`}
          >
            <div className="card-header bg-white border-0 pt-4 px-4">
              <div className="d-flex align-items-center gap-2">
                <AlertCircle
                  size={18}
                  className={lowStockCount > 0 ? "text-danger" : "text-success"}
                />
                <h6 className="fw-bold mb-0">Low Stock Alerts</h6>
              </div>
            </div>
            <div className="card-body p-4 pt-0">
              {lowStockCount > 0 ? (
                <>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className={`p-3 rounded-circle ${lowStockCount > 0 ? "bg-danger bg-opacity-10" : "bg-success bg-opacity-10"}`}
                    >
                      <AlertCircle
                        size={32}
                        className={
                          lowStockCount > 0 ? "text-danger" : "text-success"
                        }
                      />
                    </div>
                    <div>
                      <h2
                        className={`fw-bold mb-0 ${lowStockCount > 0 ? "text-danger" : "text-success"}`}
                      >
                        {lowStockCount}
                      </h2>
                      <p className="text-muted small mb-0">
                        Items low in stock
                      </p>
                    </div>
                  </div>

                  {/* Urgent vs Warning breakdown */}
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="bg-danger bg-opacity-10 rounded-3 p-2 text-center">
                        <AlertTriangle size={14} className="text-danger mb-1" />
                        <div className="fw-bold text-danger">
                          {urgentLowStock}
                        </div>
                        <small className="text-muted">
                          Urgent (&lt;5 units)
                        </small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-warning bg-opacity-10 rounded-3 p-2 text-center">
                        <Clock size={14} className="text-warning mb-1" />
                        <div className="fw-bold text-warning">
                          {warningLowStock}
                        </div>
                        <small className="text-muted">
                          Warning (&lt;10 units)
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Low stock list */}
                  {lowStockList.length > 0 && (
                    <div className="low-stock-list mt-2">
                      <p className="small fw-semibold text-dark mb-2">
                        Items needing attention:
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {lowStockList.slice(0, 5).map((item, idx) => (
                          <span
                            key={idx}
                            className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-3 py-2"
                          >
                            {item.name} ({item.current_stock} left)
                          </span>
                        ))}
                        {lowStockList.length > 5 && (
                          <span className="badge bg-light text-muted rounded-pill px-3 py-2">
                            +{lowStockList.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle size={48} className="text-success mb-3" />
                  <h5 className="fw-bold text-success mb-1">
                    All Levels Healthy
                  </h5>
                  <p className="text-muted small mb-0">
                    No items need reordering at this time
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Consumption Table */}
        <div className="col-12 col-md-7">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 pt-4 px-4">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <Activity size={18} className="text-warning" />
                  <h6 className="fw-bold mb-0">Weekly Consumption Rate</h6>
                </div>
                <span className="badge bg-light text-muted rounded-pill">
                  {usageData.length} items tracked
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="fw-semibold ps-4">Ingredient</th>
                      <th className="fw-semibold text-center">Starting</th>
                      <th className="fw-semibold text-center">Used</th>
                      <th className="fw-semibold text-center">Ending</th>
                      <th className="fw-semibold text-end pe-4">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData.length > 0 ? (
                      usageData.map((item, idx) => {
                        const isLowStock = item.current_stock < 10;
                        const isCritical = item.current_stock < 5;
                        return (
                          <tr key={idx}>
                            <td className="py-3 fw-semibold text-dark ps-4">
                              {item.name}
                              {isCritical && (
                                <span
                                  className="ms-2 badge bg-danger bg-opacity-10 text-danger rounded-pill"
                                  style={{ fontSize: "10px" }}
                                >
                                  Critical
                                </span>
                              )}
                              {!isCritical && isLowStock && (
                                <span
                                  className="ms-2 badge bg-warning bg-opacity-10 text-warning rounded-pill"
                                  style={{ fontSize: "10px" }}
                                >
                                  Low
                                </span>
                              )}
                            </td>
                            <td className="text-center text-muted small">
                              {item.starting_stock} {item.unit}
                            </td>
                            <td className="text-center text-muted small">
                              {item.used_stock} {item.unit}
                            </td>
                            <td className="text-center">
                              <span
                                className={`badge ${isCritical ? "bg-danger" : isLowStock ? "bg-warning" : "bg-light text-dark"} px-3 py-2 rounded-pill`}
                              >
                                {item.current_stock} {item.unit}
                              </span>
                            </td>
                            <td className="fw-semibold text-end pe-4 text-dark">
                              {formatCurrency(item.inventory_value)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-5 text-muted">
                          <Package size={40} className="mb-3 opacity-25" />
                          <p>No inventory data available</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {usageData.length > 5 && (
              <div className="card-footer bg-white border-0 pt-0 pb-3 px-4">
                <small className="text-muted">
                  Showing {Math.min(usageData.length, 10)} of {usageData.length}{" "}
                  items
                </small>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <style>{`
        .inventory-report-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .bg-gradient-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        .bg-danger-subtle {
          background-color: rgba(220, 53, 69, 0.1);
        }
        .bg-success-subtle {
          background-color: rgba(40, 167, 69, 0.1);
        }
        .table-light th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          padding: 12px 8px;
        }
        .table td {
          padding: 12px 8px;
          vertical-align: middle;
        }
        .low-stock-list .badge {
          font-weight: 500;
          font-size: 0.7rem;
        }
        @media print {
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

export default InventoryReport;

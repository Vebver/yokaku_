import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Activity,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import AdminPagination from "../shared/AdminPagination";

const InventoryReport = ({ data }) => {
  const attentionItems = data?.attention_items || data?.low_stock_list || [];
  const lowStockList = attentionItems.filter((item) => item.attention_reason === "low_stock");
  const expiredItems = data?.expiredItems || data?.expired_items || attentionItems.filter((item) => item.attention_reason !== "low_stock");
  const lowStockCount = lowStockList.length;
  const usageData = data?.inventory_usage || [];
  const summary = data?.summary || {};

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(usageData.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleUsage = usageData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // The row count can change between renders, so keep the page in range.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const [expiredPage, setExpiredPage] = useState(1);
  const expiredPerPage = 10;
  const expiredTotalPages = Math.max(
    1,
    Math.ceil(expiredItems.length / expiredPerPage),
  );
  const visibleExpired = expiredItems.slice(
    (Math.min(expiredPage, expiredTotalPages) - 1) * expiredPerPage,
    Math.min(expiredPage, expiredTotalPages) * expiredPerPage,
  );

  useEffect(() => {
    if (expiredPage > expiredTotalPages) setExpiredPage(expiredTotalPages);
  }, [expiredPage, expiredTotalPages]);

  const totalInventoryValue = summary?.total_inventory_value || 0;
  const reorderItems = data?.reorder_count ?? summary?.reorder_items ?? attentionItems.length;

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);

  const formatNumber = (num) => new Intl.NumberFormat("en-PH").format(num);

  const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date(new Date().toDateString());
  };

  // Expired inventory is not usable, regardless of its quantity.
  // Expired inventory is not usable, regardless of its quantity.
  const urgentLowStock = lowStockList.filter(
    (item) => Number(item.current_stock) <= Number(item.threshold ?? Infinity) && Number(item.current_stock) < 5,
  ).length;

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
    <div className="inventory-report-container p-3 p-md-4">
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
        <div className="col-md-6">
          <StatCard
            label="Total Inventory Value"
            value={totalInventoryValue}
            icon={Package}
            color="primary"
          />
        </div>

        {/* Reorder Items */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-gradient-warning text-white">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div
                  className="bg-white bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: "48px", height: "48px" }}
                >
                  <Clock size={24} color="white" />
                </div>
              </div>
              <h3 className="fw-bold mb-1">
                {formatNumber(reorderItems)} items
              </h3>
              <p className="mb-0 small text-white-50 text-uppercase fw-semibold">
                Need Attention (Low Stock or Expired)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts, Expired Items & Consumption Table Row */}
      <div className="row g-4">
        {/* Left Column: Low Stock + Expired Cards stacked */}
        <div className="col-12 col-md-5 d-flex flex-column gap-4">
          {/* Low Stock Alerts Card */}
          <div
            className={`card border-0 shadow-sm rounded-4 overflow-hidden ${lowStockCount > 0 ? "border-start border-4 border-danger" : "border-start border-4 border-success"}`}
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
                  {urgentLowStock > 0 && (
                    <div className="d-flex align-items-center gap-2 bg-danger bg-opacity-10 rounded-3 px-3 py-2 mb-3">
                      <AlertTriangle size={14} className="text-danger flex-shrink-0" />
                      <span className="small text-danger-emphasis">
                        <strong>{urgentLowStock}</strong> at or below 5 units
                      </span>
                    </div>
                  )}

                  {/* Low stock list */}
                  {lowStockList.length > 0 && (
                    <div className="low-stock-list mt-1">
                      <p className="small fw-semibold text-dark mb-2">
                        Items needing attention:
                      </p>
                      <div className="d-flex flex-column gap-2">
                        {lowStockList.slice(0, 5).map((item, idx) => (
                          <div
                            key={idx}
                            className="d-flex align-items-center justify-content-between gap-2 border border-danger-subtle bg-danger bg-opacity-10 rounded-3 px-3 py-2"
                          >
                            <span className="small fw-bold text-danger text-truncate">
                              {item.name}
                            </span>
                            <span className="small text-danger-emphasis text-nowrap">
                              {item.current_stock} {item.unit} left
                            </span>
                          </div>
                        ))}
                        {lowStockList.length > 5 && (
                          <small className="text-muted">
                            +{lowStockList.length - 5} more items
                          </small>
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

        {/* Inventory Status table */}
        <div className="col-12 col-md-7">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 pt-4 px-4">
              <div className="d-flex align-items-center gap-2">
                <Activity size={18} className="text-warning" />
                <h6 className="fw-bold mb-0">Inventory Status</h6>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="fw-semibold ps-4">Ingredient</th>
                      <th className="fw-semibold text-center">Reorder At</th>
                      <th className="fw-semibold text-center">Current</th>
                      <th className="fw-semibold text-center">Usable</th>
                      <th className="fw-semibold text-center">Expiry</th>
                      <th className="fw-semibold text-end pe-4">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsage.length > 0 ? (
                      visibleUsage.map((item, idx) => {
                        const isLowStock = Number(item.current_stock) <= Number(item.threshold ?? Infinity);
                        const isCritical = isLowStock && Number(item.current_stock) < 5;
                        const itemExpired = isExpired(item.expiry_date);
                        return (
<tr key={idx} className={itemExpired ? "bg-dark bg-opacity-10" : ""}>
                            <td className="py-3 fw-semibold text-dark ps-4" data-label="Ingredient">
                              <div className="d-flex flex-wrap align-items-center gap-1">
                                {item.name}
                                {itemExpired && (
                                  <span
                                    className="ms-1 badge bg-dark text-white rounded-pill"
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    EXPIRED
                                  </span>
                                )}
                                {!itemExpired && isCritical && (
                                  <span
                                    className="ms-1 badge bg-danger text-white rounded-pill"
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    CRITICAL
                                  </span>
                                )}
                                {!itemExpired && !isCritical && isLowStock && (
                                  <span
                                    className="ms-1 badge bg-warning text-dark rounded-pill"
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    LOW STOCK
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-center text-muted small" data-label="Reorder At">
                              {item.threshold ?? "---"} {item.unit}
                            </td>
                            <td className="text-center text-muted small" data-label="Current">
                              {item.current_stock} {item.unit}
                            </td>
                            <td className="text-center" data-label="Usable">
                              <span
                                className={`badge ${itemExpired ? "bg-dark text-white" : isCritical ? "bg-danger text-white" : isLowStock ? "bg-warning text-dark" : "bg-success-subtle text-success"} px-3 py-2 rounded-pill`}
                                style={{ fontWeight: "600" }}
                              >
                                {itemExpired ? 0 : item.current_stock} {item.unit}
                              </span>
                            </td>
                            <td className="text-center" data-label="Expiry">
                              <span className={`small ${itemExpired ? "text-dark fw-bold" : "text-muted"}`}>
                                {item.expiry_date ? formatDate(item.expiry_date) : "---"}
                              </span>
                            </td>
                            <td className="fw-semibold text-end pe-4 text-dark" data-label="Value">
                              {formatCurrency(item.inventory_value)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          <Package size={40} className="mb-3 opacity-25" />
                          <p>No inventory data available</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={usageData.length}
              itemsPerPage={itemsPerPage}
              label="items"
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>

      {/* EXPIRED ITEMS TABLE */}
      <div className="row g-4 mt-0">
        <div className="col-12">
          <div
            className={`card border-0 shadow-sm rounded-4 overflow-hidden ${expiredItems.length > 0 ? "border-start border-4 border-dark" : "border-start border-4 border-success"}`}
          >
            <div className="card-header bg-white border-0 pt-4 px-4">
              <div className="d-flex align-items-center gap-2">
                <AlertTriangle
                  size={18}
                  className={expiredItems.length > 0 ? "text-dark" : "text-success"}
                />
                <h6 className="fw-bold mb-0">Expired Items</h6>
                {expiredItems.length > 0 && (
                  <span className="badge bg-dark text-white rounded-pill">
                    {expiredItems.length}
                  </span>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              {expiredItems.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold ps-4">Item</th>
                          <th className="fw-semibold text-center">Expired On</th>
                          <th className="fw-semibold text-center">Stock Held</th>
                          <th className="fw-semibold text-center">Usable</th>
                          <th className="fw-semibold text-end pe-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleExpired.map((item, idx) => (
                          <tr key={item.inventory_id || idx} className="bg-dark bg-opacity-10">
                            <td className="py-3 fw-semibold text-dark ps-4" data-label="Item">
                              <span className="badge bg-dark text-white me-2" style={{ fontSize: "10px", fontWeight: "600" }}>
                                EXPIRED
                              </span>
                              {item.name}
                            </td>
                            <td className="text-center small fw-bold text-dark" data-label="Expired On">
                              {formatDate(item.expiry_date)}
                            </td>
                            <td className="text-center text-muted small" data-label="Stock Held">
                              {item.current_stock} {item.unit}
                            </td>
                            <td className="text-center" data-label="Usable">
                              <span className="badge bg-dark text-white px-3 py-2 rounded-pill" style={{ fontWeight: "600" }}>
                                0 {item.unit}
                              </span>
                            </td>
                            <td className="text-end pe-4 small text-muted" data-label="Action">
                              Remove from stock
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <AdminPagination
                    currentPage={expiredPage}
                    totalPages={expiredTotalPages}
                    totalItems={expiredItems.length}
                    itemsPerPage={expiredPerPage}
                    label="expired items"
                    onPageChange={setExpiredPage}
                  />
                </>
              ) : (
                <div className="text-center py-5">
                  <CheckCircle size={44} className="text-success mb-3" />
                  <h6 className="fw-bold text-success mb-1">
                    No Expired Items
                  </h6>
                  <p className="text-muted small mb-0">
                    All inventory items are within their expiry dates
                  </p>
                </div>
              )}
            </div>
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
.low-stock-list .badge {
          font-weight: 500;
          font-size: 0.7rem;
        }
        @media (max-width: 768px) {
          .inventory-report-container .table-responsive {
            overflow: visible;
          }
          .inventory-report-container thead {
            display: none;
          }
          .inventory-report-container .table,
          .inventory-report-container .table tbody,
          .inventory-report-container .table tr,
          .inventory-report-container .table td {
            display: block;
            width: 100%;
          }
          .inventory-report-container .table tbody tr {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 12px;
            padding: 12px 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }
          .inventory-report-container .table td {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: none;
            padding: 8px 0;
            text-align: right !important;
          }
          .inventory-report-container .table td[data-label]::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            text-align: left;
            flex-shrink: 0;
          }
          .inventory-report-container .table td[data-label="Ingredient"] {
            display: block;
            text-align: left !important;
            border-bottom: 1px dashed #e2e8f0;
            margin-bottom: 6px;
            padding-bottom: 10px;
          }
          .inventory-report-container .table td[data-label="Ingredient"]::before {
            display: none;
          }
        }
        @media print {
          .btn, .card-header button {
            display: none !important;
          }
          .inventory-report-container {
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

export default InventoryReport;
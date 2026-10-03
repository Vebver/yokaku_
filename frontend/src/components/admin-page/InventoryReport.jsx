import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import AdminPagination from "../shared/AdminPagination";

const InventoryReport = ({ data }) => {
  const attentionItems = data?.attention_items || data?.low_stock_list || [];
  const lowStockList = attentionItems.filter((item) =>
    ["low_stock", "low_stock_expired"].includes(item.attention_reason),
  );
  const expiredItems = data?.expiredItems || data?.expired_items || attentionItems.filter((item) => item.attention_reason !== "low_stock");
  const lowStockCount = lowStockList.length;

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

  const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const urgentLowStock = lowStockList.filter(
    (item) => Number(item.current_stock) <= Number(item.threshold ?? Infinity) && Number(item.current_stock) < 5,
  ).length;

  if (!data) return null;

  return (
    <div className="inventory-report-container p-3 p-md-4">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Inventory Report</h2>
          <p className="text-muted small mb-0">
            Stock alerts and expiry tracking
            <span className="ms-2 text-warning">●</span>
            <span className="ms-1 text-muted">Updated just now</span>
          </p>
        </div>
      </div>

      {/* Low Stock and Expired cards */}
      <div className="row g-4">
        <div className="col-12 col-md-6">
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

        <div className="col-12 col-md-6">
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
            <div className="card-body p-4 pt-0">
              {expiredItems.length > 0 ? (
                <>
                  <div className="d-flex flex-column gap-2">
                    {visibleExpired.map((item, idx) => (
                      <div
                        key={item.inventory_id || idx}
                        className="d-flex align-items-center justify-content-between gap-2 border border-dark-subtle bg-dark bg-opacity-10 rounded-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span className="badge bg-dark text-white me-2" style={{ fontSize: "10px", fontWeight: "600" }}>
                            EXPIRED
                          </span>
                          <span className="small fw-bold text-dark">{item.name}</span>
                          <div className="small text-muted mt-1">
                            Expired {formatDate(item.expiry_date)}
                          </div>
                        </div>
                        <span className="small text-dark text-nowrap">
                          {item.current_stock} {item.unit} held
                        </span>
                      </div>
                    ))}
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
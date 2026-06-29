import React, { useState, useEffect, useRef } from "react";
import api from "../../api";
import {
  Loader2,
  RefreshCw,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  XCircle,
  CornerDownRight,
  Eye,
} from "lucide-react";
import { useToast } from "../ToastContext";

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const closeBtnRef = useRef(null);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { showToast } = useToast();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    return () => {
      const backdrops = document.querySelectorAll(".offcanvas-backdrop");
      backdrops.forEach((el) => el.remove());
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [payments]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/billing`);
      setPayments(res.data.sort((a, b) => b.payment_id - a.payment_id));
      setCurrentPage(1);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
    const resId = (p.reservation_id || "").toLowerCase();
    const term = searchQuery.toLowerCase();
    return fullName.includes(term) || resId.includes(term);
  });

  const getItemPrice = (item) => {
    const isRefill =
      item.is_refill === 1 ||
      item.is_refill === true ||
      (item.customizations &&
        item.customizations.toString().includes("[REFILL]"));
    return isRefill ? 0 : Number(item.price || 0);
  };

  const calculateItemsSum = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.quantity * getItemPrice(item),
      0,
    );
  };

  const getRemainingBalanceInfo = () => {
    const total = calculateItemsSum();
    const paid = Number(selectedPayment?.amount || 0);
    const exceeds = total > paid;
    return {
      remaining: exceeds ? total - paid : 0,
      exceeds,
      overpaid: paid > total ? paid - total : 0,
    };
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = filteredPayments.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleReviewClick = async (p) => {
    setSelectedPayment(p);
    setOrderItems([]);
    setLoadingItems(true);
    setShowRejectForm(false);
    setIsEditingAmount(false);
    setTempAmount("");
    setRejectReason("The receipt image is unclear or details do not match.");

    try {
      const res = await api.get(`/reservations/${p.reservation_id}/items`);
      setOrderItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const submitRejection = async () => {
    const token = localStorage.getItem("token");
    if (!token) return showToast("Please log in again.");

    const finalReason =
      rejectReason.trim() ||
      "Invalid proof of payment. Please re-upload within 12 hours.";

    try {
      await api.put(`/billing/reject/${selectedPayment.reservation_id}`, {
        reason: finalReason,
      });

      setSelectedPayment((prev) => ({
        ...prev,
        payment_status: "rejected",
        rejection_reason: finalReason,
      }));

      await fetchPayments();
      setShowRejectForm(false);
    } catch (err) {
      console.error("Rejection error:", err);
      showToast("Failed to reject payment.");
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mb-2" size={40} />
          <div className="text-muted small fw-semibold">
            Loading transactions...
          </div>
        </div>
      </div>
    );

  const balanceInfo = getRemainingBalanceInfo();

  return (
    <div
      className="container-fluid py-4 bg-light"
      style={{ minHeight: "100vh" }}
    >
      {/* HEADER SECTION */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-3">
        <div className="mb-3 mb-md-0">
          <h2 className="fw-bold mb-1 text-dark">Billing & Transactions</h2>
          <p className="text-muted small mb-0">
            Monitor incoming payments, verify customer receipts, and manage
            order settlements.
          </p>
        </div>
        <button
          className="btn btn-white border shadow-sm fw-bold px-4 py-2 text-dark bg-white d-flex align-items-center align-self-start"
          onClick={fetchPayments}
        >
          <RefreshCw size={15} className="me-2 text-primary" /> Refresh Data
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-3 px-2" style={{ maxWidth: "320px" }}>
        <input
          type="text"
          className="form-control shadow-sm border py-2 fw-semibold"
          placeholder="Search by guest name or ID..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* TABLE CARD */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ minWidth: "1100px" }}
          >
            <thead className="bg-light-subtle border-bottom">
              <tr
                className="text-muted small text-uppercase"
                style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
              >
                <th className="ps-4 py-3">Customer Profile</th>
                <th>Method</th>
                <th>Downpayment Paid</th>
                <th>Payment Proof</th>
                <th>Settlement Status</th>
                <th className="text-center">Order status</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentPayments.length > 0 ? (
                currentPayments.map((p) => {
                  const payStatus = (
                    p.payment_status || "PENDING"
                  ).toLowerCase();
                  const isCompleted =
                    (p.order_status || p.status || "").toLowerCase() ===
                    "completed";

                  return (
                    <tr key={p.payment_id} className="transition-all">
                      <td className="ps-4 py-3">
                        <div className="d-flex align-items-center">
                          <div>
                            <div className="fw-bold text-dark mb-0">
                              {p.first_name === "Walk-in" ||
                              p.first_name === "Walk-In"
                                ? `Walk-In (Table ${p.table_number || "?"})`
                                : `${p.first_name || "Guest"} ${p.last_name || ""}`}
                            </div>
                            <small
                              className="text-muted font-monospace"
                              style={{ fontSize: "0.75rem" }}
                            >
                              ID: {p.reservation_id}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge bg-light text-dark border px-2 py-1 font-monospace"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {p.payment_method
                            ? p.payment_method.toUpperCase()
                            : "PENDING"}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">
                          ₱
                          {p.amount
                            ? Number(p.amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })
                            : "0.00"}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge rounded-pill px-3 py-1.5 fw-semibold ${
                            payStatus === "verified"
                              ? "bg-success-subtle text-success"
                              : payStatus === "rejected"
                                ? "bg-danger-subtle text-danger"
                                : "bg-warning-subtle text-warning-emphasis"
                          }`}
                        >
                          {payStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {isCompleted ? (
                          <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-1.5 fw-semibold">
                            FULLY PAID
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border px-3 py-1.5 fw-semibold">
                            PARTIAL BILL
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <span
                          className={`badge rounded-pill px-3 py-1.5 fw-semibold ${isCompleted ? "bg-success text-white" : "bg-secondary text-white"}`}
                        >
                          {(
                            p.order_status ||
                            p.status ||
                            "PENDING"
                          ).toUpperCase()}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-dark px-3 fw-bold shadow-sm rounded-3 py-1.5"
                          data-bs-toggle="offcanvas"
                          data-bs-target="#billingDrawer"
                          onClick={() => handleReviewClick(p)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <div className="py-3">
                      <p className="mb-0 fw-semibold">
                        No transactions available
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredPayments.length > itemsPerPage && (
          <div className="p-3 border-top bg-white d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <span className="text-muted small">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredPayments.length)} of{" "}
              {filteredPayments.length}
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link rounded-3 me-1"
                    onClick={() => paginate(currentPage - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link text-dark fw-bold border-0 bg-transparent px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                </li>
                <li
                  className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                >
                  <button
                    className="page-link rounded-3"
                    onClick={() => paginate(currentPage + 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* OFFCANVAS DRAWER */}
      <div
        className="offcanvas offcanvas-end border-0 shadow-lg"
        tabIndex="-1"
        id="billingDrawer"
        data-bs-backdrop="true"
        data-bs-scroll="true"
        style={{ width: "min(100%, 500px)" }}
      >
        <div className="offcanvas-header border-bottom bg-white py-3">
          <h5 className="fw-bold m-0 d-flex align-items-center text-dark">
            <ReceiptText size={20} className="me-2 text-primary" /> Financial
            Review
          </h5>
          <button
            type="button"
            className="btn-close shadow-none"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
          ></button>
        </div>

        <div className="offcanvas-body p-0 d-flex flex-column bg-light-subtle">
          {selectedPayment && (
            <>
              {/* 1. ORDER SUMMARY SECTION */}
              <div className="p-4 flex-grow-1 overflow-auto">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <span
                    className="fw-bold text-muted text-uppercase tracking-wider"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Order Items
                  </span>
                  <span
                    className="badge bg-secondary-subtle text-secondary font-monospace"
                    style={{ fontSize: "0.7rem" }}
                  >
                    ID: {selectedPayment.reservation_id}
                  </span>
                </div>

                {loadingItems ? (
                  <div className="text-center py-5">
                    <Loader2 className="animate-spin text-primary" />
                    <div className="text-muted small mt-2">
                      Loading itemized summary...
                    </div>
                  </div>
                ) : (
                  <div className="item-list">
                    {orderItems.map((item, idx) => {
                      const isRefill =
                        item.is_refill === 1 ||
                        item.is_refill === true ||
                        (item.customizations &&
                          item.customizations.toString().includes("[REFILL]"));
                      const currentPrice = isRefill
                        ? 0
                        : Number(item.price || 0);

                      return (
                        <div
                          key={idx}
                          className="mb-2 p-3 bg-white rounded-3 border shadow-sm"
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-bold text-dark small">
                                {item.name || item.item_name}
                                {isRefill && (
                                  <span
                                    className="badge bg-success-subtle text-success ms-2 text-uppercase"
                                    style={{ fontSize: "0.65rem" }}
                                  >
                                    Refill
                                  </span>
                                )}
                              </div>
                              <small className="text-muted">
                                Unit Price: ₱
                                {currentPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </small>
                            </div>
                            <div className="text-end">
                              <span className="badge bg-light text-dark border me-2">
                                x{item.quantity}
                              </span>
                              <span className="fw-bold text-dark small">
                                ₱
                                {(item.quantity * currentPrice).toLocaleString(
                                  undefined,
                                  { minimumFractionDigits: 2 },
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. RECEIPT & METADATA SECTION */}
              <div className="p-4 bg-dark text-white rounded-top-4 shadow-lg mt-auto">
                {/* FINANCIAL SUMMARY */}
                <div className="card bg-secondary bg-opacity-25 border-secondary border-opacity-25 p-3 mb-3">
                  <div className="d-flex justify-content-between mb-1.5 text-white-50 small">
                    <span>Total Bill</span>
                    <span className="text-white">
                      ₱
                      {calculateItemsSum().toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary border-opacity-50">
                    <span className="text-white-50 small">
                      Downpayment Paid
                    </span>
                    {isEditingAmount ? (
                      <div className="d-flex align-items-center gap-2 animate-fade-in">
                        <div
                          className="d-flex align-items-center gap-1 bg-dark px-2 rounded border border-secondary"
                          style={{ height: "30px" }}
                        >
                          <span
                            className="small fw-bold"
                            style={{ color: "#e0842d" }}
                          >
                            ₱
                          </span>
                          <input
                            type="number"
                            className="bg-transparent border-0 fw-semibold text-end text-warning"
                            style={{
                              width: "55px",
                              fontSize: "0.85rem",
                              outline: "none",
                              boxShadow: "none",
                            }}
                            value={tempAmount}
                            onChange={(e) => setTempAmount(e.target.value)}
                          />
                        </div>
                        <button
                          className="btn btn-sm btn-success px-2 py-1 fw-bold text-uppercase"
                          style={{ fontSize: "0.7rem", height: "30px" }}
                          onClick={async () => {
                            const newAmount = parseFloat(tempAmount);
                            if (isNaN(newAmount) || newAmount < 0) {
                              return showToast(
                                "Please enter a valid numeric amount.",
                              );
                            }

                            try {
                              await api.put(
                                `/billing/update-amount/${selectedPayment.reservation_id}`,
                                { amount: newAmount },
                              );

                              setSelectedPayment((prev) => ({
                                ...prev,
                                amount: newAmount,
                              }));

                              setIsEditingAmount(false);

                              const backdrops = document.querySelectorAll(
                                ".offcanvas-backdrop",
                              );
                              backdrops.forEach((el) => el.remove());
                              document.body.style.overflow = "";
                              document.body.style.paddingRight = "";

                              await fetchPayments();
                            } catch (err) {
                              console.error(
                                "Error updating payment amount:",
                                err,
                              );
                              showToast("Failed to update downpayment amount.");
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary text-white-50 px-2 py-1"
                          style={{ fontSize: "0.7rem", height: "30px" }}
                          onClick={() => setIsEditingAmount(false)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-success">
                          ₱
                          {Number(selectedPayment?.amount || 0).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </span>
                        <button
                          className="btn btn-link p-0 text-white-50 text-decoration-none small hover-white"
                          style={{
                            fontSize: "0.75rem",
                            borderBottom: "1px dashed rgba(255,255,255,0.25)",
                          }}
                          onClick={() => {
                            setTempAmount(selectedPayment?.amount || 0);
                            setIsEditingAmount(true);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* REMAINING BALANCE CALCULATION */}
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small fw-semibold text-white-50">
                      Remaining Balance
                    </span>
                    {balanceInfo.exceeds ? (
                      <span className="fw-bold text-warning fs-5">
                        ₱
                        {balanceInfo.remaining.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      <span className="badge bg-success-subtle text-success fw-semibold">
                        ₱0.00 (Paid in Full)
                      </span>
                    )}
                  </div>

                  {balanceInfo.exceeds && (
                    <div
                      className="mt-1 text-warning small d-flex align-items-center"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <AlertTriangle size={12} className="me-1 text-warning" />
                      Amount exceeds downpayment. Collect remainder at
                      settlement.
                    </div>
                  )}
                </div>

                {/* ==================== INTEGRATED DYNAMIC EVENT SPEND TRACKER ==================== */}
                {(() => {
                  const totalBill = calculateItemsSum();
                  const rawPackageName =
                    selectedPayment?.package_name ||
                    selectedPayment?.packageName ||
                    "";
                  const pkgName = rawPackageName.toLowerCase().trim();
                  const isEvent = pkgName.includes("event");

                  if (!isEvent) return null;

                  const eventLimits = {
                    event_a: 10000,
                    event_b: 12500,
                  };

                  const targetLimit = eventLimits[pkgName] || 10000;
                  const percentage = Math.min(
                    100,
                    (totalBill / targetLimit) * 100,
                  );
                  const warningThreshold = targetLimit * 0.85;
                  const isNearing =
                    totalBill >= warningThreshold && totalBill < targetLimit;
                  const isMet = totalBill >= targetLimit;

                  return (
                    <div className="card bg-secondary bg-opacity-10 border-secondary border-opacity-50 p-3 mb-3 text-white">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span
                          className="small fw-bold text-white-50 text-uppercase tracking-wider"
                          style={{ fontSize: "0.7rem" }}
                        >
                          {rawPackageName} Spend Progress
                        </span>
                        <span
                          className="small fw-bold"
                          style={{
                            color: isMet ? "#10b981" : "#f59e0b",
                            fontSize: "0.8rem",
                          }}
                        >
                          {percentage.toFixed(0)}%
                        </span>
                      </div>

                      <div
                        className="progress mb-2 bg-dark"
                        style={{ height: "8px", borderRadius: "50px" }}
                      >
                        <div
                          className={`progress-bar ${isMet ? "bg-success" : isNearing ? "bg-warning" : "bg-primary"}`}
                          role="progressbar"
                          style={{
                            width: `${percentage}%`,
                            borderRadius: "50px",
                            transition: "width 0.4s ease",
                          }}
                        ></div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span
                          className="text-white-50"
                          style={{ fontSize: "0.72rem" }}
                        >
                          Target Limit: ₱
                          {targetLimit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        {isMet ? (
                          <span
                            className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 rounded-pill"
                            style={{ fontSize: "0.65rem", padding: "3px 8px" }}
                          >
                            ✓ Limit Met
                          </span>
                        ) : isNearing ? (
                          <span
                            className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25 rounded-pill"
                            style={{ fontSize: "0.65rem", padding: "3px 8px" }}
                          >
                            ⚠️ Near Limit
                          </span>
                        ) : (
                          <span
                            className="badge bg-dark text-white-50 border border-secondary rounded-pill"
                            style={{ fontSize: "0.65rem", padding: "3px 8px" }}
                          >
                            Tracking
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ALERT BLOCK FOR REJECTED ATTEMPTS */}
                {selectedPayment?.payment_status === "rejected" &&
                  !showRejectForm && (
                    <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-white p-3 mb-3 rounded-3">
                      <div className="d-flex align-items-center mb-1 text-danger">
                        <XCircle size={16} className="me-2" />
                        <span className="fw-bold small text-uppercase tracking-wider">
                          Proof Rejected
                        </span>
                      </div>
                      <div
                        className="text-white-50 small mb-2 text-start px-1"
                        style={{ fontSize: "0.8rem" }}
                      >
                        <strong>Reason: </strong>{" "}
                        {selectedPayment.rejection_reason ||
                          "Invalid receipt upload."}
                      </div>
                      <div
                        className="text-warning small d-flex align-items-center bg-warning bg-opacity-10 rounded p-1.5"
                        style={{ fontSize: "0.72rem" }}
                      >
                        <Calendar size={12} className="me-1" />
                        Customer notified. 12-hour grace period active.
                      </div>
                    </div>
                  )}

                {!showRejectForm && (
                  <div className="mt-2 mb-4">
                    {(() => {
                      const receiptUrl = selectedPayment?.receipt_path
                        ? selectedPayment.receipt_path.startsWith("http")
                          ? selectedPayment.receipt_path
                          : selectedPayment.receipt_path.includes("restaurant_")
                            ? `https://res.cloudinary.com/dfajhhh84/image/upload/${selectedPayment.receipt_path}`
                            : `${api.defaults.baseURL?.replace("/api", "") || ""}/uploads/${selectedPayment.receipt_path}`
                        : null;

                      return (
                        <>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-white-50 small">
                              Proof of Payment Attachment
                            </span>
                            {receiptUrl && (
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary text-decoration-none small d-flex align-items-center gap-1 hover-white"
                                style={{
                                  fontSize: "0.75rem",
                                  borderBottom:
                                    "1px dashed rgba(13, 110, 253, 0.3)",
                                }}
                              >
                                <Eye size={12} /> View Full Size
                              </a>
                            )}
                          </div>

                          {selectedPayment?.receipt_path ? (
                            <div className="position-relative">
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Click to view full size"
                              >
                                <img
                                  src={receiptUrl}
                                  alt="Payment receipt"
                                  className="w-100 rounded-3 border border-secondary shadow-sm"
                                  style={{
                                    maxHeight: 180,
                                    objectFit: "contain",
                                    background: "#121212",
                                    cursor: "zoom-in",
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Image failed to load:",
                                      e.currentTarget.src,
                                    );
                                    e.currentTarget.src =
                                      "https://placehold.co/400x250/222/888?text=Image+Not+Found";
                                  }}
                                />
                              </a>
                            </div>
                          ) : (
                            <div className="py-4 text-center border border-secondary border-dashed rounded-3 text-white-50 small">
                              No receipt uploaded (Cash / Manual Entry).
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* REJECTION FORM */}
                {showRejectForm && (
                  <div className="card bg-danger bg-opacity-10 border border-danger border-opacity-25 p-3 mb-3 rounded-3 animate-fade-in">
                    <div className="text-danger fw-bold small mb-2 d-flex align-items-center">
                      <CornerDownRight size={14} className="me-1" /> Specify
                      Rejection Reason
                    </div>
                    <textarea
                      className="form-control form-control-sm bg-dark text-white border-secondary mb-3 shadow-inner"
                      rows="3"
                      style={{ fontSize: "0.85rem", resize: "none" }}
                      placeholder="Write feedback for the customer..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-danger btn-sm fw-bold flex-grow-1"
                        onClick={submitRejection}
                      >
                        Submit Rejection
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm text-white-50"
                        onClick={() => setShowRejectForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ACTION CONTROLS */}
                <div className="d-grid gap-2">
                  {!showRejectForm &&
                    selectedPayment?.payment_status !== "verified" && (
                      <>
                        <button
                          className="btn btn-success btn-lg fw-bold fs-6 py-2.5 shadow-sm d-flex align-items-center justify-content-center"
                          onClick={async () => {
                            if (
                              !window.confirm("Verify this proof of payment?")
                            )
                              return;
                            try {
                              await api.put(
                                `/billing/verify/${selectedPayment.reservation_id}`,
                                {},
                              );

                              setSelectedPayment((prev) => ({
                                ...prev,
                                payment_status: "verified",
                              }));

                              await fetchPayments();
                              closeBtnRef.current?.click();
                            } catch (err) {
                              showToast("Failed to verify.");
                            }
                          }}
                        >
                          <CheckCircle2 size={16} className="me-2" /> Verify
                          Payment Proof
                        </button>

                        {!(
                          selectedPayment?.first_name
                            ?.toLowerCase()
                            .includes("walk") ||
                          selectedPayment?.reservation_id?.startsWith("WALK")
                        ) &&
                          selectedPayment?.payment_status !== "rejected" && (
                            <button
                              className="btn btn-outline-danger fw-bold py-2 border-secondary"
                              onClick={() => setShowRejectForm(true)}
                            >
                              Reject Proof
                            </button>
                          )}
                      </>
                    )}

                  {!showRejectForm &&
                    (selectedPayment?.order_status?.toLowerCase() !==
                      "completed" &&
                    selectedPayment?.status?.toLowerCase() !== "completed" ? (
                      <button
                        className="btn btn-primary fw-bold py-2.5 d-flex align-items-center justify-content-center"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Mark this transaction as FULLY PAID and COMPLETED?",
                            )
                          )
                            return;

                          try {
                            await api.put(
                              `/billing/settle/${selectedPayment.reservation_id}`,
                              {},
                            );

                            setSelectedPayment((prev) => ({
                              ...prev,
                              order_status: "completed",
                              payment_status: "verified",
                            }));

                            await fetchPayments();
                            showToast("Transaction Settled!");
                          } catch (err) {
                            console.error("Settle error:", err.response?.data);
                            showToast("Failed to settle bill.");
                          }
                        }}
                      >
                        <Layers size={16} className="me-2" /> Settle Bill (Fully
                        Paid)
                      </button>
                    ) : (
                      <div className="alert alert-success border-0 py-3 text-center mb-0 d-flex flex-column align-items-center bg-success bg-opacity-10 text-success">
                        <CheckCircle2 size={24} className="mb-2" />
                        <div className="fw-bold small text-uppercase tracking-wide">
                          Transaction Settle Complete
                        </div>
                        <small
                          className="opacity-75"
                          style={{ fontSize: "0.75rem" }}
                        >
                          This bill has been paid and completed.
                        </small>
                      </div>
                    ))}

                  <button
                    className="btn btn-outline-secondary text-white-50 border-0 mt-1 py-2 btn-sm"
                    data-bs-dismiss="offcanvas"
                  >
                    Close Drawer
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .transition-all { transition: all 0.2s ease-in-out; }
        .transition-all:hover { background-color: rgba(0, 0, 0, 0.015); }
        .page-link { color: #495057; border: 1px solid #dee2e6; background-color: #fff; }
        .page-link:hover { background-color: #f8f9fa; color: #212529; }
        .page-item.disabled .page-link { color: #6c757d; pointer-events: none; background-color: #fff; border-color: #dee2e6; }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Billing;

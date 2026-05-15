import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  CreditCard,
  Check,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const getImageUrl = (path, BASE_URL) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cleanPath = path.replace("/uploads/", "");
  return `${BASE_URL}/uploads/${cleanPath}`;
};

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = res.data.sort((a, b) => b.payment_id - a.payment_id);
      setPayments(sorted);
      setLoading(false);
    } catch (err) {
      console.error("Billing Fetch Error:", err);
      setLoading(false);
    }
  };

  const handleReviewClick = async (p) => {
    setSelectedPayment(p);
    setOrderItems([]);
    setLoadingItems(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE}/reservations/${p.reservation_id}/items`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setOrderItems(res.data);
    } catch (err) {
      console.error("Order Items Fetch Error:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Mark this downpayment as ${newStatus.toUpperCase()}?`))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/billing/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Update local state so UI reflects change immediately
      setSelectedPayment((prev) => ({ ...prev, payment_status: newStatus }));
      fetchPayments();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleSettleFullBill = async (resId) => {
    if (!window.confirm("Mark this bill as fully settled and COMPLETED?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/billing/settle/${resId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // FIX: Update the selectedPayment state locally so the button disappears
      setSelectedPayment((prev) => ({ ...prev, status: "completed" }));

      alert("Transaction Finished!");
      fetchPayments(); // Refresh the background list
    } catch (err) {
      alert("Error settling bill.");
    }
  };

  const calculateItemsSum = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = payments.slice(
    (currentPage - 1) * itemsPerPage,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(payments.length / itemsPerPage);

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Loader2 className="spinner-border text-primary" />
      </div>
    );

  return (
    <div
      className="container-fluid py-3 py-md-4 text-dark bg-light"
      style={{ minHeight: "100vh" }}
    >
      {/* HEADER */}
      <div className="row align-items-center mb-4 px-2 g-3">
        <div className="col-12 col-md-8">
          <h2 className="fw-bold mb-1">Billing & Transactions</h2>
          <p className="text-muted small mb-0">
            Verify downpayments and settle final bills
          </p>
        </div>
        <div className="col-12 col-md-4 text-md-end">
          <button
            className="btn btn-white border shadow-sm fw-bold px-4 w-100 w-md-auto"
            onClick={fetchPayments}
          >
            <RefreshCw size={16} className="me-2" /> Refresh
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ minWidth: "1050px" }}
          >
            <thead className="bg-light border-bottom">
              <tr
                className="text-muted small text-uppercase"
                style={{ fontSize: "0.7rem", letterSpacing: "0.8px" }}
              >
                <th className="ps-4 py-3">Customer</th>
                <th>Method</th>
                <th>Downpayment</th>
                <th>Pay Status</th>
                <th className="text-center">Overall Bill</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((p) => (
                <tr key={p.payment_id}>
                  <td className="ps-4 py-3">
                    <div className="fw-bold text-dark">
                      {p.first_name} {p.last_name}
                    </div>
                    <code className="text-muted" style={{ fontSize: "0.6rem" }}>
                      Res ID: #{p.reservation_id}
                    </code>
                  </td>
                  <td>
                    <span className="badge bg-white text-dark border px-3 py-2 fw-normal">
                      {p.payment_method?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="fw-bold text-primary">
                      ₱{Number(p.amount).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill px-3 py-1 small ${p.payment_status === "verified" ? "bg-success text-white" : p.payment_status === "pending" ? "bg-warning text-dark" : "bg-danger text-white"}`}
                    >
                      {p.payment_status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-center">
                    <span
                      className={`badge rounded-pill px-3 py-1 small ${p.status === "completed" ? "bg-secondary text-white" : "bg-dark text-white"}`}
                    >
                      {p.status?.toUpperCase() || "UNPAID"}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-dark fw-bold px-3 py-1 shadow-sm"
                      style={{ minWidth: "100px" }}
                      data-bs-toggle="offcanvas"
                      data-bs-target="#billingDrawer"
                      onClick={() => handleReviewClick(p)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <span className="small text-muted">
          Showing {currentItems.length} of {payments.length}
        </span>
        <div className="btn-group shadow-sm bg-white rounded border overflow-hidden">
          <button
            className="btn btn-sm btn-white border-0 px-3 py-2"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="btn btn-sm disabled border-0 px-3 py-2 text-dark fw-bold bg-white">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            className="btn btn-sm btn-white border-0 px-3 py-2"
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* DRAWER */}
      <div
        className="offcanvas offcanvas-end border-0 shadow-sm"
        tabIndex="-1"
        id="billingDrawer"
        data-bs-backdrop="false"
        style={{ width: "min(100%, 500px)" }}
      >
        <div className="offcanvas-header border-bottom bg-white">
          <h5 className="fw-bold m-0 text-dark">
            <ReceiptText size={20} className="me-2" />
            Downpayment Review
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
          ></button>
        </div>

        <div className="offcanvas-body bg-white p-0">
          {selectedPayment && (
            <div className="d-flex flex-column h-100">
              {/* 1. RECEIPT SECTION */}
              <div className="p-3 border-bottom bg-light-subtle text-center">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="x-small fw-bold text-muted text-uppercase">
                    Proof Attachment
                  </span>
                  {selectedPayment.receipt_path && (
                    <a
                      href={getImageUrl(selectedPayment.receipt_path, BASE_URL)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary x-small text-decoration-none fw-bold"
                    >
                      Open Full <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <div
                  className="bg-dark rounded overflow-hidden d-flex align-items-center justify-content-center"
                  style={{ height: "220px" }}
                >
                  {selectedPayment.receipt_path ? (
                    <img
                      src={getImageUrl(selectedPayment.receipt_path, BASE_URL)}
                      alt="Receipt"
                      style={{ maxHeight: "100%", objectFit: "contain" }}
                      onError={(e) =>
                        (e.target.src =
                          "https://placehold.co/400?text=Receipt+Not+Found")
                      }
                    />
                  ) : (
                    <div className="text-white-50 text-center x-small">
                      <XCircle size={32} className="mb-2 mx-auto" />
                      <p>No Receipt Uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. ORDER LIST */}
              <div className="p-3 flex-grow-1 overflow-auto">
                <span className="x-small fw-bold text-muted text-uppercase d-block mb-2">
                  Items in Reservation
                </span>
                {loadingItems ? (
                  <div className="text-center py-3">
                    <Loader2 className="spinner-border spinner-border-sm text-primary" />
                  </div>
                ) : (
                  <div className="item-list">
                    {orderItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="d-flex justify-content-between align-items-center mb-1 py-1 border-bottom border-light"
                      >
                        <div className="small text-dark">
                          {item.name || item.item_name}{" "}
                          <span className="text-muted small">
                            x{item.quantity}
                          </span>
                        </div>
                        <div className="small fw-bold">
                          ₱{(item.quantity * item.price).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. FINANCIAL SUMMARY */}
              {/* --- Replace your footer section with this corrected logic --- */}

              <div className="p-3 bg-dark text-white sticky-bottom mt-auto shadow-lg">
                <div className="d-flex flex-column gap-2 mb-3">
                  <div className="d-flex justify-content-between border-bottom border-secondary pb-1">
                    <span className="x-small text-white-50">
                      Total Bill Amount
                    </span>
                    <span className="fw-bold">
                      ₱{calculateItemsSum().toLocaleString()}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between border-bottom border-secondary pb-1 text-info">
                    <span className="x-small text-info opacity-75">
                      Downpayment Applied
                    </span>
                    <span className="fw-bold">
                      - ₱{Number(selectedPayment.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between pt-1">
                    <div>
                      <span className="x-small text-warning text-uppercase fw-bold">
                        Balance to Settle
                      </span>
                      <h2 className="fw-bold mb-0 text-warning">
                        ₱
                        {(
                          calculateItemsSum() - Number(selectedPayment.amount)
                        ).toLocaleString()}
                      </h2>
                    </div>
                    <div className="text-end">
                      <div className="x-small text-white-50 mb-1">Status</div>
                      <span
                        className={`badge py-1 px-2 small ${selectedPayment.status?.toLowerCase() === "completed" ? "bg-success" : "bg-primary"}`}
                      >
                        {selectedPayment.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* IMPROVED LOGIC: Case-insensitive check to hide button */}
                {selectedPayment.status?.toLowerCase() !== "completed" ? (
                  <button
                    className="btn btn-warning btn-lg w-100 py-3 fw-bold shadow mb-2 text-dark d-flex align-items-center justify-content-center"
                    onClick={() =>
                      handleSettleFullBill(selectedPayment.reservation_id)
                    }
                    style={{ whiteSpace: "nowrap" }} // Prevents text from cutting off
                  >
                    <CreditCard size={18} className="me-2" />
                    <span>Settle Remaining Balance</span>
                  </button>
                ) : (
                  /* This will show instead of the button if status is COMPLETED */
                  <div className="bg-success bg-opacity-25 text-success border border-success p-3 rounded mb-3 text-center d-flex align-items-center justify-content-center gap-2">
                    <CheckCircle2 size={20} />
                    <div className="fw-bold small">
                      This transaction is fully settled.
                    </div>
                  </div>
                )}

                {/* DP APPROVAL (Only show if payment is still pending) */}
                {selectedPayment.payment_status?.toLowerCase() ===
                  "pending" && (
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <button
                        className="btn btn-success w-100 fw-bold py-2 shadow-sm"
                        onClick={() =>
                          handleStatusChange(
                            selectedPayment.payment_id,
                            "verified",
                          )
                        }
                      >
                        Verify DP
                      </button>
                    </div>
                    <div className="col-6">
                      <button
                        className="btn btn-outline-danger w-100 fw-bold py-2"
                        onClick={() =>
                          handleStatusChange(
                            selectedPayment.payment_id,
                            "rejected",
                          )
                        }
                      >
                        Reject DP
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-dark border border-secondary w-100 fw-bold py-2"
                  data-bs-dismiss="offcanvas"
                >
                  Close Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .x-small { font-size: 0.65rem; }
        .btn-white:hover { background: #f8f9fa; }
        @media (max-width: 576px) {
           .btn-lg { font-size: 0.9rem; padding: 12px; }
        }
      `}</style>
    </div>
  );
};

export default Billing;

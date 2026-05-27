import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Loader2,
  RefreshCw,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayments(res.data.sort((a, b) => b.payment_id - a.payment_id));
      setCurrentPage(1);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = payments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(payments.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const calculateItemsSum = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  return (
    <div
      className="container-fluid py-4 bg-light"
      style={{ minHeight: "100vh" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <div>
          <h2 className="fw-bold mb-1">Billing & Transactions</h2>
          <p className="text-muted small mb-0">
            Manage payments for Online Bookings and Walk-in Kiosks
          </p>
        </div>
        <button
          className="btn btn-white border shadow-sm fw-bold"
          onClick={fetchPayments}
        >
          <RefreshCw size={16} className="me-2" /> Refresh
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ minWidth: "1100px" }}
          >
            <thead className="bg-light border-bottom">
              <tr
                className="text-muted small text-uppercase"
                style={{ fontSize: "0.7rem", letterSpacing: "0.8px" }}
              >
                <th className="ps-4 py-3">Customer</th>
                <th>Method</th>
                <th>Amount Paid</th>
                <th>Pay Status</th>
                <th>Settlement</th>
                <th className="text-center">Order Status</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentPayments.length > 0 ? (
                currentPayments.map((p) => (
                  <tr key={p.payment_id}>
                    <td className="ps-4 py-3">
                      <div className="fw-bold">
                        {p.first_name === "Walk-in"
                          ? `Kiosk (Table ${p.table_number || "?"})`
                          : `${p.first_name || "Guest"} ${p.last_name || ""}`}
                      </div>
                      <small className="text-muted">{p.reservation_id}</small>
                    </td>
                    <td>
                      <span className="badge bg-white text-dark border font-monospace">
                        {p.payment_method
                          ? p.payment_method.toUpperCase()
                          : "PENDING"}
                      </span>
                    </td>
                    <td className="fw-bold text-primary">
                      ₱{p.amount ? Number(p.amount).toLocaleString() : "0.00"}
                    </td>
                    <td>
                      <span
                        className={`badge rounded-pill px-3 ${
                          p.payment_status === "verified"
                            ? "bg-success"
                            : p.payment_status === "rejected"
                              ? "bg-danger"
                              : "bg-warning text-dark"
                        }`}
                      >
                        {(p.payment_status || "PENDING").toUpperCase()}
                      </span>
                    </td>

                    {/* NEW SETTLEMENT COLUMN LOGIC */}
                    <td>
                      {/* FIX: Convert to lowercase before comparing */}
                      {p.order_status?.toLowerCase() === "completed" ||
                      p.status?.toLowerCase() === "completed" ? (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3">
                          FULL PAID
                        </span>
                      ) : (
                        <span className="badge bg-light text-muted border px-3">
                          PARTIAL
                        </span>
                      )}
                    </td>

                    <td className="text-center">
                      {(() => {
                        const statusText = (
                          p.order_status ||
                          p.status ||
                          "PENDING"
                        ).toLowerCase();
                        const isCompleted = statusText === "completed";

                        return (
                          <span
                            className={`badge rounded-pill px-3 ${isCompleted ? "bg-success" : "bg-dark"}`}
                          >
                            {statusText.toUpperCase()}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="text-end pe-4">
                      <button
                        className="btn btn-sm btn-dark px-3 fw-bold shadow-sm"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#billingDrawer"
                        onClick={() => handleReviewClick(p)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {payments.length > itemsPerPage && (
          <div className="p-3 border-top bg-white d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, payments.length)} of {payments.length}
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => paginate(currentPage - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link text-dark fw-bold">
                    Page {currentPage} of {totalPages}
                  </span>
                </li>
                <li
                  className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
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
      {/* FIXED OFFCANVAS ELEMENT */}
      <div
        className="offcanvas offcanvas-end border-0 shadow-lg"
        tabIndex="-1"
        id="billingDrawer"
        data-bs-backdrop="true"
        data-bs-scroll="true"
        style={{ width: "min(100%, 500px)" }}
      >
        <div className="offcanvas-header border-bottom bg-white">
          <h5 className="fw-bold m-0">
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

        <div className="offcanvas-body p-0 d-flex flex-column">
          {selectedPayment && (
            <>
              {/* 1. ORDER ITEMS LIST */}
              <div className="p-3 flex-grow-1 overflow-auto bg-light-subtle">
                <span
                  className="fw-bold text-muted text-uppercase d-block mb-3"
                  style={{ fontSize: "0.7rem" }}
                >
                  Order Summary
                </span>
                {loadingItems ? (
                  <div className="text-center py-5">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="item-list">
                    {orderItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="mb-2 p-2 bg-white rounded-2 border-bottom shadow-sm"
                      >
                        <div className="d-flex justify-content-between small">
                          <div className="fw-bold text-dark">
                            {item.name || item.item_name}{" "}
                            <span className="text-primary ms-1">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="fw-bold">
                            ₱{(item.quantity * item.price).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. PAYMENT REVIEW PANEL */}
              <div className="p-4 bg-dark text-white shadow-lg">
                <div className="d-flex justify-content-between border-bottom border-secondary pb-2 mb-3">
                  <span className="text-white-50 small">Total Bill</span>
                  <span className="fw-bold fs-5 text-warning">
                    ₱{calculateItemsSum().toLocaleString()}
                  </span>
                </div>

                {/* CLOUDINARY IMAGE DISPLAY */}
                <div className="mt-2">
                  <span className="text-white-50 small">Proof of Payment</span>
                  {selectedPayment?.receipt_path ? (
                    <img
                      src={
                        selectedPayment.receipt_path?.startsWith("http")
                          ? selectedPayment.receipt_path
                          : selectedPayment.receipt_path?.includes(
                                "restaurant_",
                              ) // FIX: Use "restaurant_" to catch all Cloudinary folders
                            ? `https://res.cloudinary.com/dfajhhh84/image/upload/${selectedPayment.receipt_path}`
                            : `${API_BASE.replace("/api", "")}/uploads/${selectedPayment.receipt_path}`
                      }
                      alt="Payment receipt"
                      className="w-100 rounded-3 border border-secondary shadow"
                      style={{
                        maxHeight: 250,
                        objectFit: "contain",
                        background: "#1a1a1a",
                      }}
                      onError={(e) => {
                        console.error(
                          "Image failed to load at URL:",
                          e.currentTarget.src,
                        );
                        e.currentTarget.src =
                          "https://placehold.co/400x250/222/888?text=Image+Not+Found";
                      }}
                    />
                  ) : (
                    <div className="py-4 text-center border border-secondary border-dashed rounded-3 text-white-50 small">
                      No receipt uploaded.
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS (Verify & Reject) */}
                <div className="mt-4 d-grid gap-2">
                  {/* --- 1. PROOF VERIFICATION BLOCK --- */}
                  {/* Disappears once the receipt is verified */}
                  {selectedPayment?.payment_status !== "verified" && (
                    <>
                      <button
                        className="btn btn-success btn-lg fw-bold"
                        onClick={async () => {
                          const token = localStorage.getItem("token");
                          if (
                            !token ||
                            !window.confirm("Verify this payment proof?")
                          )
                            return;
                          try {
                            await axios.put(
                              `${API_BASE}/billing/verify/${selectedPayment.reservation_id}`,
                              {},
                              { headers: { Authorization: `Bearer ${token}` } },
                            );
                            fetchPayments();
                            closeBtnRef.current?.click();
                          } catch (err) {
                            alert("Failed to verify.");
                          }
                        }}
                      >
                        Verify Payment Proof
                      </button>

                      <button
                        className="btn btn-outline-danger fw-bold"
                        onClick={async () => {
                          const token = localStorage.getItem("token");
                          if (!token || !window.confirm("Reject this payment?"))
                            return;
                          try {
                            await axios.put(
                              `${API_BASE}/billing/reject/${selectedPayment.reservation_id}`,
                              {},
                              { headers: { Authorization: `Bearer ${token}` } },
                            );
                            fetchPayments();
                            closeBtnRef.current?.click();
                          } catch (err) {
                            alert("Failed to reject.");
                          }
                        }}
                      >
                        Reject Payment
                      </button>
                    </>
                  )}

                  {/* --- 2. SETTLE BILL BLOCK --- */}
                  {/* This button will disappear ONLY when the order_status/status is 'completed' */}
                  {selectedPayment?.order_status?.toLowerCase() !==
                    "completed" &&
                  selectedPayment?.status?.toLowerCase() !== "completed" ? (
                    <button
                      className="btn btn-primary fw-bold py-2"
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        if (!token) return alert("Please log in again.");
                        if (
                          !window.confirm("Mark as FULLY PAID and COMPLETED?")
                        )
                          return;

                        try {
                          await axios.put(
                            `${API_BASE}/billing/settle/${selectedPayment.reservation_id}`,
                            {},
                            { headers: { Authorization: `Bearer ${token}` } },
                          );

                          // FIX 1: Manually update the selectedPayment state so the button disappears
                          setSelectedPayment((prev) => ({
                            ...prev,
                            order_status: "completed", // Match your SQL alias
                            payment_status: "verified",
                          }));

                          // FIX 2: Refresh the main list
                          await fetchPayments();

                          alert("Transaction Settled!");
                          // Optional: closeBtnRef.current?.click();
                        } catch (err) {
                          console.error("Settle error:", err.response?.data);
                          alert("Failed to settle bill.");
                        }
                      }}
                    >
                      Verify Full Paid (Settle)
                    </button>
                  ) : (
                    /* This message shows when the Settle button disappears */
                    <div className="alert alert-success border-0 py-3 text-center mb-0">
                      <div className="fw-bold">✓ TRANSACTION COMPLETED</div>
                      <small className="opacity-75">
                        This bill has been fully settled.
                      </small>
                    </div>
                  )}

                  <button
                    className="btn btn-secondary mt-2"
                    data-bs-dismiss="offcanvas"
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .page-link { color: #6c757d; transition: all 0.2s; }
        .page-link:hover { background-color: #e9ecef; }
        .page-item.active .page-link { box-shadow: 0 4px 10px rgba(13, 110, 253, 0.2); }
      `}</style>
    </div>
  );
};

export default Billing;

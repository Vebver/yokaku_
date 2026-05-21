import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Loader2,
  RefreshCw,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Pagination States
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
      setCurrentPage(1); // Reset to page 1 on refresh
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Pagination Logic ---
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

  const handleSettleFullBill = async (resId) => {
    if (!window.confirm("Mark this bill as fully settled?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/billing/settle/${resId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSelectedPayment((prev) => ({
        ...prev,
        status: "completed",
        payment_status: "verified",
      }));

      fetchPayments();
      alert("Transaction Completed & Payment Verified");
    } catch (err) {
      alert("Error settling bill.");
    }
  };

  const handlePayLater = async (resId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/billing/payment-status/${resId}`,
        { payment_status: "pending" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSelectedPayment((prev) => ({
        ...prev,
        payment_status: "pending",
      }));

      fetchPayments();
      alert("Payment set to Pay Later - Customer will settle at checkout");
    } catch (err) {
      alert("Error updating payment status.");
    }
  };

  const handleFinishSession = async (resId) => {
    if (!window.confirm("Finish session and verify payment?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/billing/settle/${resId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSelectedPayment((prev) => ({
        ...prev,
        status: "completed",
        payment_status: "verified",
      }));

      fetchPayments();
      alert("Session Finished & Payment Verified");
    } catch (err) {
      alert("Error finishing session.");
    }
  };

  const calculateItemsSum = () => {
    return orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  return (
    <div className="container-fluid py-4 bg-light" style={{ minHeight: "100vh" }}>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <div>
          <h2 className="fw-bold mb-1">Billing & Transactions</h2>
          <p className="text-muted small mb-0">Manage payments for Online Bookings and Walk-in Kiosks</p>
        </div>
        <button className="btn btn-white border shadow-sm fw-bold" onClick={fetchPayments}>
          <RefreshCw size={16} className="me-2" /> Refresh
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ minWidth: "1000px" }}>
            <thead className="bg-light border-bottom">
              <tr className="text-muted small text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: '0.8px' }}>
                <th className="ps-4 py-3">Customer</th>
                <th>Method</th>
                <th>Amount Paid</th>
                <th>Pay Status</th>
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
                        {p.payment_method ? p.payment_method.toUpperCase() : "PENDING"}
                      </span>
                    </td>
                    <td className="fw-bold text-primary">
                      ₱{p.amount ? Number(p.amount).toLocaleString() : "0.00"}
                    </td>
                    <td>
                      <span className={`badge rounded-pill px-3 ${p.payment_status === "verified" || p.status === "completed" ? "bg-success" : "bg-warning text-dark"}`}>
                        {(p.payment_status || "PENDING").toUpperCase()}
                      </span>
                    </td>
                    <td className="text-center">
                      {(() => {
                        const isKiosk = p.first_name === "Walk-in" || p.reservation_id?.toString().includes("WALK");
                        const isCompleted = p.status === "completed" || p.payment_status === "verified" || isKiosk;
                        return (
                          <span className={`badge rounded-pill px-3 ${isCompleted ? "bg-success" : "bg-dark"}`}>
                            {isCompleted ? "COMPLETED" : (p.status || "PENDING").toUpperCase()}
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
                  <td colSpan="6" className="text-center py-5 text-muted">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {payments.length > itemsPerPage && (
          <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div className="text-muted small">
              Showing <strong>{indexOfFirstItem + 1}</strong> to <strong>{Math.min(indexOfLastItem, payments.length)}</strong> of <strong>{payments.length}</strong>
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button className="page-link border-0 px-3 py-2" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
                </li>
                <li className="page-item disabled"><span className="page-link border-0 text-dark fw-bold px-3 py-2">Page {currentPage} of {totalPages || 1}</span></li>
                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                  <button className="page-link border-0 px-3 py-2" onClick={() => paginate(currentPage + 1)} disabled={currentPage >= totalPages}><ChevronRight size={16} /></button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* OFFCANVAS DRAWER */}
      <div className="offcanvas offcanvas-end border-0 shadow-sm" tabIndex="-1" id="billingDrawer" style={{ width: "min(100%, 500px)" }}>
        <div className="offcanvas-header border-bottom bg-white">
          <h5 className="fw-bold m-0"><ReceiptText size={20} className="me-2 text-primary" /> Financial Review</h5>
          <button type="button" className="btn-close shadow-none" data-bs-dismiss="offcanvas" ref={closeBtnRef}></button>
        </div>

        <div className="offcanvas-body p-0 d-flex flex-column">
          {selectedPayment && (
            <>
              <div className="p-3 flex-grow-1 overflow-auto bg-light-subtle">
                <span className="fw-bold text-muted text-uppercase d-block mb-3" style={{ fontSize: '0.7rem' }}>Order Summary</span>
                {loadingItems ? (
                  <div className="text-center py-5"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                  <div className="item-list">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="mb-2 p-2 bg-white rounded-2 border-bottom shadow-sm">
                        <div className="d-flex justify-content-between small">
                          <div className="fw-bold text-dark">
                            {item.name || item.item_name} <span className="text-primary ms-1">x{item.quantity}</span>
                          </div>
                          <div className="fw-bold">₱{(item.quantity * item.price).toLocaleString()}</div>
                        </div>
                        {item.customizations && (
                          <div className="text-muted" style={{ fontSize: "0.7rem" }}>{item.customizations}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Summary Footer */}
              <div className="p-4 bg-dark text-white shadow-lg">
                {(() => {
                  const menuTotal = calculateItemsSum();
                  const dpAmount = Number(selectedPayment.amount || 0);
                  
                  // Check if it's a kiosk/walk-in (already paid)
                  const isKiosk = selectedPayment.first_name === "Walk-in" || 
                                  selectedPayment.reservation_id?.toString().includes("WALK");
                  
                  let balanceToPay;
                  let isAlreadyPaid = false;
                  
                  if (isKiosk) {
                    // Kiosk walk-in is already paid
                    balanceToPay = 0;
                    isAlreadyPaid = true;
                  } else {
                    // Online reservation with down payment - deduct payment from total
                    balanceToPay = Math.max(0, menuTotal - dpAmount);
                  }

                  return (
                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex justify-content-between border-bottom border-secondary pb-2">
                        <span className="text-white-50 small">Total Menu Price</span>
                        <span className="fw-bold fs-5">₱{menuTotal.toLocaleString()}</span>
                      </div>
                      
                      {!isKiosk && dpAmount > 0 && (
                        <div className="d-flex justify-content-between border-bottom border-secondary pb-2 text-info">
                          <span className="small">Down Payment Received</span>
                          <span className="fw-bold">- ₱{dpAmount.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-end pt-1">
                        <div>
                          <span className="small text-uppercase fw-bold text-warning opacity-75">
                            {balanceToPay === 0 ? isAlreadyPaid ? "Already Paid" : "Account Cleared" : "Remaining Balance"}
                          </span>
                          <h1 className="fw-bold mb-0 text-warning">₱{balanceToPay.toLocaleString()}</h1>
                        </div>
                        <span className={`badge px-3 py-2 rounded-pill ${balanceToPay === 0 ? "bg-success" : "bg-primary"}`}>
                          {balanceToPay === 0 ? "PAID" : selectedPayment.status.toUpperCase()}
                        </span>
                      </div>

                      {(() => {
                        const isKiosk = selectedPayment.first_name === "Walk-in" || 
                                        selectedPayment.reservation_id?.toString().includes("WALK");
                        const isPending = selectedPayment.payment_status === "pending";
                        const isVerified = selectedPayment.payment_status === "verified";

                        // KIOSK: Show Pay Later / Finish Session buttons
                        if (isKiosk && isPending) {
                          return (
                            <div className="d-flex gap-2">
                              <button 
                                className="btn btn-outline-warning btn-sm w-50 py-2 fw-bold"
                                onClick={() => handlePayLater(selectedPayment.reservation_id)}
                              >
                                Pay Later
                              </button>
                              <button 
                                className="btn btn-success btn-sm w-50 py-2 fw-bold"
                                onClick={() => handleFinishSession(selectedPayment.reservation_id)}
                              >
                                Finish Session
                              </button>
                            </div>
                          );
                        }

                        // ONLINE: Show Settle & Verify Payment button
                        if (!isAlreadyPaid && selectedPayment.status !== "completed" && balanceToPay > 0) {
                          return (
                            <button 
                              className="btn btn-warning btn-lg w-100 py-3 fw-bold mt-2 shadow" 
                              onClick={() => handleSettleFullBill(selectedPayment.reservation_id)}
                            >
                              Settle & Verify Payment
                            </button>
                          );
                        }

                        // COMPLETED: Show transaction completed
                        return (
                          <div className="alert alert-success py-3 text-center mb-0 mt-2 fw-bold border-0 shadow-sm">
                            TRANSACTION COMPLETED
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
                <button className="btn btn-link text-white-50 w-100 mt-3 text-decoration-none small" data-bs-dismiss="offcanvas">Close Review</button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .page-link { color: #6c757d; transition: all 0.2s; }
        .page-link:hover { background-color: #e9ecef; }
        .page-item.active .page-link { box-shadow: 0 4px 10px rgba(13, 110, 253, 0.2); }
        .font-monospace { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
      `}</style>
    </div>
  );
};

export default Billing;
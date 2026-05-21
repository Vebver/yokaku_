import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Loader2,
  CheckCircle2,
  RefreshCw,
  ReceiptText,
  CreditCard,
  Banknote,
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
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayments(res.data.sort((a, b) => b.payment_id - a.payment_id));
      setLoading(false);
    } catch (err) {
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
        {
          headers: { Authorization: `Bearer ${token}` },
        },
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

  const calculateItemsSum = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Loader2 className="spinner-border text-primary" />
      </div>
    );

  return (
    <div
      className="container-fluid py-4 bg-light"
      style={{ minHeight: "100vh" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <div>
          <h2 className="fw-bold">Billing & Transactions</h2>
          <p className="text-muted small">
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
            style={{ minWidth: "1000px" }}
          >
            <thead className="bg-light border-bottom">
              <tr className="text-muted small text-uppercase">
                <th className="ps-4 py-3">Customer</th>
                <th>Method</th>
                <th>Amount Paid</th>
                <th>Pay Status</th>
                <th className="text-center">Order Status</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
  {(payments || []).map((p, index) => (
    <tr key={p.payment_id || p.reservation_id || index}>
      <td className="ps-4 py-3">
        <div className="fw-bold">
          {p.first_name === "Walk-in" ? "Kiosk Guest" : `${p.first_name || 'Guest'} ${p.last_name || ''}`}
        </div>
        <small className="text-muted">{p.reservation_id}</small>
      </td>
      <td>
        <span className="badge bg-white text-dark border">
          {(p.payment_method || "CASH").toUpperCase()}
        </span>
      </td>
      <td className="fw-bold text-primary">
        ₱{p.amount ? Number(p.amount).toLocaleString() : "0.00"}
      </td>
      <td>
        <span className={`badge rounded-pill px-3 ${
          (p.payment_status === 'verified' || p.order_status === 'completed') 
          ? 'bg-success' : 'bg-warning text-dark'
        }`}>
          {(p.payment_status || "PENDING").toUpperCase()}
        </span>
      </td>
      <td className="text-center">
        <span className={`badge rounded-pill px-3 ${p.order_status === 'completed' ? 'bg-secondary' : 'bg-dark'}`}>
          {(p.order_status || "PENDING").toUpperCase()}
        </span>
      </td>
      <td className="text-end pe-4">
        <button 
          className="btn btn-sm btn-dark px-3" 
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

      <div
        className="offcanvas offcanvas-end border-0 shadow-sm"
        tabIndex="-1"
        id="billingDrawer"
        style={{ width: "min(100%, 500px)" }}
      >
        <div className="offcanvas-header border-bottom bg-white">
          <h5 className="fw-bold m-0">
            <ReceiptText size={20} className="me-2" /> Financial Review
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
          ></button>
        </div>

        <div className="offcanvas-body p-0 d-flex flex-column">
          {selectedPayment && (
            <>
              <div className="p-3 flex-grow-1 overflow-auto">
                <span className="x-small fw-bold text-muted text-uppercase d-block mb-3">
                  Order Items
                </span>
                {loadingItems ? (
                  <div className="text-center py-5">
                    <Loader2 className="spinner-border text-primary" />
                  </div>
                ) : (
                  <div className="item-list">
                    {orderItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="mb-3 pb-2 border-bottom border-light"
                      >
                        <div className="d-flex justify-content-between small">
                          <div className="fw-bold">
                            {item.name || item.item_name}{" "}
                            <span className="text-muted ms-1">
                              x{item.quantity}
                            </span>
                            {item.customizations?.includes("[TAKE-OUT]") && (
                              <span
                                className="badge bg-warning text-dark ms-2"
                                style={{ fontSize: "0.6rem" }}
                              >
                                TO-GO
                              </span>
                            )}
                          </div>
                          <div className="fw-bold text-dark">
                            ₱{(item.quantity * item.price).toLocaleString()}
                          </div>
                        </div>
                        {item.customizations && (
                          <div
                            className="text-muted"
                            style={{ fontSize: "0.7rem" }}
                          >
                            {item.customizations
                              .replace("[TAKE-OUT]", "")
                              .trim()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-dark text-white shadow-lg">
                {(() => {
                  const menuTotal = calculateItemsSum();
                  const isWalkIn =
                    selectedPayment.reservation_id?.startsWith("WALK");
                  const dpAmount = Number(selectedPayment.amount || 0);
                  let balanceToPay = menuTotal - dpAmount;
                  if (balanceToPay < 0) balanceToPay = 0;

                  return (
                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex justify-content-between border-bottom border-secondary pb-2">
                        <span className="text-white-50 small">
                          Total Menu Price
                        </span>
                        <span className="fw-bold fs-5">
                          ₱{menuTotal.toLocaleString()}
                        </span>
                      </div>
                      {dpAmount > 0 && (
                        <div className="d-flex justify-content-between border-bottom border-secondary pb-2 text-info">
                          <span className="small">
                            {isWalkIn ? "Paid at Kiosk" : "Downpayment"}
                          </span>
                          <span className="fw-bold">
                            - ₱{dpAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-end pt-1 text-warning">
                        <div>
                          <span className="small text-uppercase fw-bold opacity-75">
                            {balanceToPay === 0
                              ? "Account Cleared"
                              : "Remaining Balance"}
                          </span>
                          <h1 className="fw-bold mb-0">
                            ₱{balanceToPay.toLocaleString()}
                          </h1>
                        </div>
                        <div className="text-end">
  {/* If balance is 0 or status is completed or payment is verified, show Green */}
  <span className={`badge px-3 rounded-pill ${
    balanceToPay === 0 || selectedPayment.payment_status === 'verified' || selectedPayment.status === 'completed' 
    ? "bg-success text-white" 
    : "bg-primary"
  }`}>
    {balanceToPay === 0 ? "PAID / SEATED" : selectedPayment.status.toUpperCase()}
  </span>
</div>
                      </div>
                      {selectedPayment.status !== "completed" &&
                      balanceToPay > 0 ? (
                        <button
                          className="btn btn-warning btn-lg w-100 py-3 fw-bold mt-2"
                          onClick={() =>
                            handleSettleFullBill(selectedPayment.reservation_id)
                          }
                        >
                          Settle & Verify Payment
                        </button>
                      ) : (
                        <div className="alert alert-success py-3 text-center mb-0 mt-2 fw-bold">
                          TRANSACTION SETTLED
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button
                  className="btn btn-link text-white-50 w-100 mt-3 text-decoration-none"
                  data-bs-dismiss="offcanvas"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;

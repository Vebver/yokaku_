import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  User,
  Loader2,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

const API_BASE = "https://yokaku-backend.onrender.com/api";
const BASE_URL = "https://yokaku-backend.onrender.com"; // Base URL for images

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const closeBtnRef = useRef(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/billing`);
      setPayments(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleReviewClick = async (p) => {
    setSelectedPayment(p);
    setOrderItems([]);
    setLoadingItems(true);
    try {
      const res = await axios.get(
        `${API_BASE}/reservations/${p.reservation_id}/items`,
      );
      setOrderItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Mark as ${newStatus}?`)) return;
    try {
      await axios.put(`${API_BASE}/billing/${id}/status`, {
        status: newStatus,
      });

      if (newStatus === "verified") {
        window.dispatchEvent(new Event("payment-verified"));
        localStorage.setItem("payment_verified", "true");
      }

      fetchPayments();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      alert("Failed to update");
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
    <div className="container-fluid p-4 text-dark">
      <div className="fade-in">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0">Billing & Payments</h2>
            <p className="text-muted">
              Manage customer balances and payment verification
            </p>
          </div>
          <button
            className="btn btn-dark px-4 shadow-sm"
            onClick={fetchPayments}
          >
            Refresh Data
          </button>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Customer & ID</th>
                  <th>Method</th>
                  <th>Paid Amount</th>
                  <th>Payment Type</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id} style={{ height: "70px" }}>
                    <td className="ps-4">
                      <div className="fw-bold">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="text-muted small">
                        ID: {p.reservation_id}
                      </div>
                    </td>
                    <td>
                      <span className="badge rounded-pill bg-light text-dark border px-3 py-2">
                        {p.payment_method?.toUpperCase() || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className="fw-bold text-success">
                        ₱{Number(p.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge rounded-pill px-3 py-2 ${p.payment_method === "Gcash" ? "bg-primary-subtle text-primary" : "bg-info-subtle text-info"}`}
                      >
                        {p.payment_method === "Gcash"
                          ? "DIGITAL"
                          : "MANUAL/CASH"}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <button
                        className="btn btn-sm btn-outline-dark px-3 fw-bold"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#billingDrawer"
                        onClick={() => handleReviewClick(p)}
                      >
                        Review Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* OFFCANVAS DRAWER */}
      <div
        className="offcanvas offcanvas-end border-0 shadow"
        tabIndex="-1"
        id="billingDrawer"
        style={{ width: "500px" }}
      >
        <div className="offcanvas-header border-bottom py-3 px-4">
          <h5 className="offcanvas-title fw-bold">Payment Verification</h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
          ></button>
        </div>

        <div className="offcanvas-body px-4 bg-light-subtle">
          {selectedPayment && (
            <>
              {/* Customer Box */}
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body d-flex align-items-center">
                  <div className="bg-primary-subtle text-primary p-3 rounded-circle me-3">
                    <User size={24} />
                  </div>
                  <div>
                    <div className="fw-bold fs-5">
                      {selectedPayment.first_name} {selectedPayment.last_name}
                    </div>
                    <div className="small text-muted">
                      Ref: {selectedPayment.reservation_id}
                    </div>
                  </div>
                </div>
              </div>

              {/* NEW: PROOF OF PAYMENT SECTION */}
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                  <label className="small fw-bold text-muted text-uppercase mb-2 d-block">
                    Proof of Payment
                  </label>
                  {selectedPayment.receipt_path ? (
                    <div className="text-center">
                      <a
                        href={
                          selectedPayment.receipt_path.startsWith("http")
                            ? selectedPayment.receipt_path
                            : `${BASE_URL}/uploads/${selectedPayment.receipt_path.replace("/uploads/", "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={
                            selectedPayment.receipt_path.startsWith("http")
                              ? selectedPayment.receipt_path
                              : `${BASE_URL}/uploads/${selectedPayment.receipt_path.replace("/uploads/", "")}`
                          }
                          alt="Payment Proof"
                          className="img-fluid rounded border"
                          style={{ maxHeight: "300px" }}
                          onError={(e) => {
                            // Fallback if the URL is still malformed
                            e.target.src =
                              "https://placehold.co/300?text=Error+Loading+Image";
                          }}
                        />
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-light rounded">
                      <p className="text-muted small mb-0">
                        No image proof uploaded
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details Box */}
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                  <label className="small fw-bold text-muted text-uppercase mb-3 d-block">
                    Order Details
                  </label>
                  {loadingItems ? (
                    <div className="text-center py-3">
                      <Loader2 className="spinner-border animate-spin" />
                    </div>
                  ) : (
                    <div className="item-list">
                      {orderItems.map((item, idx) => {
                        let customs = null;
                        if (item.customizations) {
                          customs =
                            typeof item.customizations === "string"
                              ? JSON.parse(item.customizations)
                              : item.customizations;
                        }
                        return (
                          <div
                            key={idx}
                            className="mb-3 pb-2 border-bottom border-light"
                          >
                            <div className="d-flex justify-content-between">
                              <span className="fw-bold">
                                {item.name || item.item_name}{" "}
                                <span className="text-muted small">
                                  x{item.quantity}
                                </span>
                              </span>
                              <span className="fw-bold">
                                ₱{(item.quantity * item.price).toLocaleString()}
                              </span>
                            </div>
                            {/* ... Customizations UI remains same ... */}
                            {customs && (
                              <div className="mt-1 ps-2 border-start border-2 border-warning-subtle small text-muted">
                                {customs.flavor && (
                                  <div>
                                    • Flavor:{" "}
                                    <span className="text-dark">
                                      {customs.flavor}
                                    </span>
                                  </div>
                                )}
                                {customs.drink && (
                                  <div>
                                    • Drink:{" "}
                                    <span className="text-dark">
                                      {customs.drink}
                                    </span>
                                  </div>
                                )}
                                {customs.spiceLevel && (
                                  <div>
                                    • Spice:{" "}
                                    <span className="text-dark">
                                      {customs.spiceLevel}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Summary Box */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <label className="small fw-bold text-muted text-uppercase mb-3 d-block">
                    Payment Breakdown
                  </label>

                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Total Bill:</span>
                    <span className="fw-bold">
                      ₱
                      {calculateItemsSum().toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">
                      Amount Paid ({selectedPayment.payment_method}):
                    </span>
                    <span className="fw-bold text-success">
                      - ₱
                      {Number(selectedPayment.amount).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between border-top pt-2 mt-2">
                    <span className="fw-bold fs-5">Remaining Balance:</span>
                    <span className="fw-bold text-danger fs-5">
                      ₱
                      {(
                        calculateItemsSum() - Number(selectedPayment.amount)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="mb-4">
                {selectedPayment.payment_status === "pending" ? (
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-success py-2 fw-bold"
                      onClick={() =>
                        handleStatusChange(
                          selectedPayment.payment_id,
                          "verified",
                        )
                      }
                    >
                      Approve Payment
                    </button>
                    <button
                      className="btn btn-outline-danger py-2"
                      onClick={() =>
                        handleStatusChange(
                          selectedPayment.payment_id,
                          "rejected",
                        )
                      }
                    >
                      Reject Payment
                    </button>
                  </div>
                ) : (
                  <div
                    className={`alert ${selectedPayment.payment_status === "verified" ? "alert-success" : "alert-danger"} text-center fw-bold border-0 shadow-sm`}
                  >
                    {selectedPayment.payment_status?.toUpperCase()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;

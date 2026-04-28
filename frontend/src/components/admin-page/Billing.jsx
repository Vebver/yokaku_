import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  User,
  Loader2,
  Receipt,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

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
      const res = await axios.get("/api/billing");
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
        `/api/reservations/${p.reservation_id}/items`,
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
      await axios.put(`/api/billing/${id}/status`, { status: newStatus });
      fetchPayments();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      alert("Failed to update");
    }
  };

  const calculateTotal = () => {
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
                  <th>Amount</th>
                  <th>Payment Type</th> {/* Changed from 'Status' */}
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id} style={{ height: "70px" }}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">
                        {p.first_name} {p.last_name}
                      </div>
                      <div
                        className="text-muted small"
                        style={{ fontSize: "0.75rem" }}
                      >
                        ID: {p.reservation_id}
                      </div>
                    </td>

                    <td>
                      <span className="badge rounded-pill bg-light text-dark border px-3 py-2">
                        {p.payment_method
                          ? p.payment_method.toUpperCase()
                          : "N/A"}
                      </span>
                    </td>

                    <td>
                      <span className="fw-bold text-success">
                        ₱
                        {Number(p.amount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    {/* CHANGED: This column now shows "PAYMENT TYPE" instead of just Status */}
                    <td>
                      {p.payment_method === "Gcash" ? (
                        <span
                          className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2"
                          style={{ fontSize: "0.7rem" }}
                        >
                          DIGITAL (PAYMONGO)
                        </span>
                      ) : (
                        <span
                          className="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3 py-2"
                          style={{ fontSize: "0.7rem" }}
                        >
                          MANUAL UPLOAD
                        </span>
                      )}
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
          <h5 className="offcanvas-title fw-bold text-dark">
            Payment Verification
          </h5>
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
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <label className="small fw-bold text-muted text-uppercase mb-2 d-block">
                    Customer
                  </label>
                  <div className="d-flex align-items-center">
                    <div className="bg-primary-subtle text-primary p-2 rounded-circle me-3">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="fw-bold fs-5 text-dark">
                        {selectedPayment.first_name} {selectedPayment.last_name}
                      </div>
                      <div className="small text-muted">
                        Reservation ID: {selectedPayment.reservation_id}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Details Box */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <label className="small fw-bold text-muted text-uppercase mb-3 d-block">
                    Order Details
                  </label>
                  {loadingItems ? (
                    <div className="text-center py-3">
                      <Loader2 className="spinner-border spinner-border-sm" />
                    </div>
                  ) : (
                    <>
                      {orderItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="d-flex justify-content-between mb-2 small"
                        >
                          <span className="text-dark">
                            {item.name}{" "}
                            <span className="text-muted">x{item.quantity}</span>
                          </span>
                          <span className="fw-bold text-dark">
                            ₱{(item.quantity * item.price).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <hr className="my-3" />
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold text-dark">Total Bill:</span>
                        <span className="fs-4 fw-bold text-primary">
                          ₱{calculateTotal().toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Payment Summary Box */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <label className="small fw-bold text-muted text-uppercase mb-3 d-block">
                    Payment Breakdown
                  </label>

                  {/* Inside the Payment Summary Box in Billing.jsx */}
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Total Bill:</span>
                    <span className="fw-bold text-dark">
                      ₱
                      {Number(selectedPayment.total_bill).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Amount Paid:</span>
                    <span className="fw-bold text-success">
                      - ₱
                      {Number(selectedPayment.amount).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between border-top pt-2 mt-2">
                    <span className="fw-bold text-dark">
                      Remaining Balance:
                    </span>
                    <span className="fw-bold text-danger">
                      ₱
                      {(
                        Number(selectedPayment.total_bill) -
                        Number(selectedPayment.amount)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {/* Inside the Payment Summary Box in Billing.jsx */}
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Total Bill:</span>
                    <span className="fw-bold text-dark">
                      ₱
                      {Number(selectedPayment.total_bill).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Amount Paid:</span>
                    <span className="fw-bold text-success">
                      - ₱
                      {Number(selectedPayment.amount).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between border-top pt-2 mt-2">
                    <span className="fw-bold text-dark">
                      Remaining Balance:
                    </span>
                    <span className="fw-bold text-danger">
                      ₱
                      {(
                        Number(selectedPayment.total_bill) -
                        Number(selectedPayment.amount)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between border-top pt-2 mt-2">
                    <span className="fw-bold text-dark fs-5">
                      Remaining Balance:
                    </span>
                    <span className="fw-bold text-danger fs-5">
                      ₱
                      {(
                        calculateTotal() - parseFloat(selectedPayment.amount)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Info (Text instead of Image) */}
              <div className="mb-4">
                <label className="small fw-bold text-muted text-uppercase mb-2 d-block">
                  Payment Status
                </label>
                {selectedPayment.payment_method === "Gcash" ? (
                  <div className="alert alert-success d-flex align-items-center gap-3 py-3 border-0 shadow-sm">
                    <CheckCircle2 size={24} className="text-success" />
                    <div>
                      <div className="fw-bold">
                        PayMongo Digital Verification
                      </div>
                      <small className="text-muted">
                        No manual receipt required.
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-info py-3 border-0 shadow-sm">
                    Manual Payment via{" "}
                    <strong>{selectedPayment.payment_method}</strong>
                  </div>
                )}
              </div>

              {/* Action Buttons Section */}
              <div className="d-grid gap-2 mb-5">
                {selectedPayment.payment_status === "pending" ? (
                  <>
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
                  </>
                ) : (
                  <div
                    className={`alert ${selectedPayment.payment_status === "verified" ? "alert-success" : "alert-info"} text-center fw-bold border-0 shadow-sm`}
                  >
                    {selectedPayment.payment_status === "verified"
                      ? "PAYMENT VERIFIED"
                      : `STATUS: ${selectedPayment.payment_status.toUpperCase()}`}
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

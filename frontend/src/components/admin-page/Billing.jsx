import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { User, Loader2, Receipt, CreditCard, AlertCircle } from "lucide-react";

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
      // This calls the model function we updated with the UNION SQL
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

  // Helper calculation for Total Bill
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
    <div className="container-fluid p-4">
      <div className="fade-in">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0">Billing & Payments</h2>
            <p className="text-muted">
              Verify customer receipts and manage balances
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
                  <th className="ps-4">Receipt</th>
                  <th>Customer & ID</th>
                  <th>Paid (Downpayment)</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id}>
                    <td className="ps-4">
                      <img
                        src={`http://localhost:5000/uploads/${p.receipt_path}`}
                        alt="Receipt"
                        style={{
                          width: "50px",
                          height: "50px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #eee",
                        }}
                      />
                    </td>
                    <td>
                      <div className="fw-bold text-dark">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="text-muted smallest">
                        ID: {p.reservation_id}
                      </div>
                    </td>
                    <td>
                      <span className="fw-bold text-success">
                        ₱{parseFloat(p.amount).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${p.payment_status === "verified" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"} border px-2 py-1`}
                      >
                        {p.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <button
                        className="btn btn-sm btn-outline-dark px-3"
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
                      <div className="fw-bold fs-5">
                        {selectedPayment.first_name} {selectedPayment.last_name}
                      </div>
                      <div className="small text-muted">
                        Reservation ID: {selectedPayment.reservation_id}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Box */}
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
                          <span>
                            {item.name}
                            {/* Only show the extra xQty if the name doesn't already have '(x' in it */}
                            {!item.name.includes("(x") && (
                              <span className="text-muted">
                                {" "}
                                x{item.quantity}
                              </span>
                            )}
                          </span>
                          <span className="fw-bold text-dark">
                            ₱
                            {(item.quantity * item.price).toLocaleString(
                              undefined,
                              { minimumFractionDigits: 2 },
                            )}
                          </span>
                        </div>
                      ))}
                      <hr className="my-3" />
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">
                          Total Bill (Actual Price):
                        </span>
                        <span className="fs-4 fw-bold text-primary">
                          ₱
                          {calculateTotal().toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
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
                    Payment Calculation
                  </label>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Downpayment Paid:</span>
                    <span className="fw-bold text-success">
                      - ₱
                      {parseFloat(selectedPayment.amount).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-2">
                    <span className="fw-bold">Remaining Balance:</span>
                    <span className="fw-bold text-danger">
                      ₱
                      {(
                        calculateTotal() - parseFloat(selectedPayment.amount)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipt Image */}
              <div className="mb-4">
                <label className="small fw-bold text-muted text-uppercase mb-2 d-block">
                  Uploaded Receipt Proof
                </label>
                <a
                  href={`http://localhost:5000/uploads/${selectedPayment.receipt_path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={`http://localhost:5000/uploads/${selectedPayment.receipt_path}`}
                    alt="Receipt"
                    className="w-100 rounded shadow-sm border"
                  />
                </a>
              </div>

              {/* Action Buttons */}
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
                      Verify & Approve Payment
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
                      Reject Receipt
                    </button>
                  </>
                ) : (
                  <div className="alert alert-info text-center fw-bold border-0 shadow-sm">
                    This order is already{" "}
                    {selectedPayment.payment_status.toUpperCase()}
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

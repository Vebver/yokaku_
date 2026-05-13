import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
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

  const closeBtnRef = useRef(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("token"); // GET TOKEN
      const res = await axios.get(`${API_BASE}/billing`, {
        headers: { Authorization: `Bearer ${token}` }, // ATTACH TOKEN
      });
      setPayments(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Billing Fetch Error:", err.response?.data || err.message);
      setLoading(false);
    }
  };

  const handleReviewClick = async (p) => {
    setSelectedPayment(p);
    setOrderItems([]);
    setLoadingItems(true);
    try {
      const token = localStorage.getItem("token"); // GET TOKEN
      const res = await axios.get(`${API_BASE}/reservations/${p.reservation_id}/items`, {
        headers: { Authorization: `Bearer ${token}` }, // ATTACH TOKEN
      });
      setOrderItems(res.data);
    } catch (err) {
      console.error("Order Items Fetch Error:", err.response?.data || err.message);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Mark this payment as ${newStatus.toUpperCase()}?`)) return;
    try {
      const token = localStorage.getItem("token"); // GET TOKEN
      await axios.put(`${API_BASE}/billing/${id}/status`, 
        { status: newStatus }, 
        { headers: { Authorization: `Bearer ${token}` } } // ATTACH TOKEN
      );
      fetchPayments();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      alert("Failed to update status. Make sure you are logged in as an Authorized user.");
    }
  };

  const calculateItemsSum = () => {
    return orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="text-center">
        <Loader2 className="spinner-border text-primary mb-2" />
        <p className="text-muted fw-bold">Loading Financial Data...</p>
      </div>
    </div>
  );

  return (
    <div className="container-fluid p-4" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Billing & Payments</h2>
          <p className="text-muted small">Verify customer transactions and receipts</p>
        </div>
        <button className="btn btn-white border shadow-sm fw-bold px-4" onClick={fetchPayments}>
          Refresh
        </button>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: "12px" }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="bg-light border-bottom">
              <tr style={{ height: "60px" }}>
                <th className="ps-4 small fw-bold text-uppercase text-muted">Customer</th>
                <th className="small fw-bold text-uppercase text-muted">Method</th>
                <th className="small fw-bold text-uppercase text-muted">Amount</th>
                <th className="small fw-bold text-uppercase text-muted">Status</th>
                <th className="text-end pe-4 small fw-bold text-uppercase text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.payment_id} style={{ height: "80px" }}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{p.first_name} {p.last_name}</div>
                    <small className="text-muted">Res ID: #{p.reservation_id}</small>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border px-3 py-2">
                      {p.payment_method?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="fw-bold text-success">₱{Number(p.amount).toLocaleString()}</span>
                  </td>
                  <td>
                    <span className={`badge rounded-pill px-3 py-2 ${
                      p.payment_status === 'verified' ? 'bg-success-subtle text-success' : 
                      p.payment_status === 'pending' ? 'bg-warning-subtle text-warning' : 'bg-danger-subtle text-danger'
                    }`}>
                      {p.payment_status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button 
                      className="btn btn-dark btn-sm fw-bold px-3"
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

      <div className="offcanvas offcanvas-end border-0 shadow" tabIndex="-1" id="billingDrawer" style={{ width: "550px" }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="fw-bold mb-0">Payment Details</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" ref={closeBtnRef}></button>
        </div>
        <div className="offcanvas-body bg-light">
          {selectedPayment && (
            <div className="d-flex flex-column gap-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <label className="small fw-bold text-muted text-uppercase">Proof of Payment</label>
                    {selectedPayment.receipt_path && (
                      <a href={getImageUrl(selectedPayment.receipt_path, BASE_URL)} target="_blank" rel="noreferrer" className="text-primary small text-decoration-none fw-bold">
                        Full View <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  <div className="text-center bg-dark rounded overflow-hidden" style={{ minHeight: "200px" }}>
                    {selectedPayment.receipt_path ? (
                      <img
                        src={getImageUrl(selectedPayment.receipt_path, BASE_URL)}
                        alt="Receipt"
                        className="img-fluid"
                        style={{ maxHeight: "400px", cursor: "zoom-in" }}
                        onError={(e) => (e.target.src = "https://placehold.co/400?text=Receipt+Not+Found")}
                      />
                    ) : (
                      <div className="py-5 text-white-50 text-center">
                        <XCircle size={48} className="mb-2 mx-auto" />
                        <p>No Image Provided</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <label className="small fw-bold text-muted text-uppercase mb-3 d-block">Order Summary</label>
                  {loadingItems ? <div className="text-center"><Loader2 className="spinner-border animate-spin" /></div> : (
                    <div className="list-group list-group-flush">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="list-group-item px-0 border-light d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-bold">{item.name || item.item_name} <span className="text-muted small">x{item.quantity}</span></div>
                          </div>
                          <span className="fw-bold">₱{(item.quantity * item.price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card border-0 bg-dark text-white shadow-sm p-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Total Amount Due:</span>
                  <span className="fw-bold">₱{calculateItemsSum().toLocaleString()}</span>
                </div>
                <div className="d-flex justify-content-between text-success mb-2">
                  <span>Amount Paid:</span>
                  <span className="fw-bold">- ₱{Number(selectedPayment.amount).toLocaleString()}</span>
                </div>
                <hr className="border-secondary" />
                <div className="d-flex justify-content-between fs-5 fw-bold text-warning">
                  <span>Remaining:</span>
                  <span>₱{(calculateItemsSum() - Number(selectedPayment.amount)).toLocaleString()}</span>
                </div>
              </div>

              {selectedPayment.payment_status === "pending" && (
                <div className="row g-2">
                  <div className="col-6">
                    <button className="btn btn-success w-100 py-3 fw-bold shadow-sm" onClick={() => handleStatusChange(selectedPayment.payment_id, 'verified')}>
                      <CheckCircle2 size={18} className="me-2" /> Verify
                    </button>
                  </div>
                  <div className="col-6">
                    <button className="btn btn-outline-danger w-100 py-3 fw-bold" onClick={() => handleStatusChange(selectedPayment.payment_id, 'rejected')}>
                      <XCircle size={18} className="me-2" /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
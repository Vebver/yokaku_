import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  DollarSign
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

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const closeBtnRef = useRef(null);

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Sort newest first
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
      const res = await axios.get(`${API_BASE}/reservations/${p.reservation_id}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderItems(res.data);
    } catch (err) { console.error("Order Items Fetch Error:", err); } 
    finally { setLoadingItems(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Mark this payment as ${newStatus.toUpperCase()}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE}/billing/${id}/status`, 
        { status: newStatus }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPayments();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) { alert("Failed to update status."); }
  };

  const calculateItemsSum = () => {
    return orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  // PAGINATION LOGIC
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = payments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(payments.length / itemsPerPage);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100"><Loader2 className="spinner-border text-primary" /></div>
  );

  return (
    <div className="container-fluid py-3 py-md-4 fade-in text-dark bg-light" style={{ minHeight: "100vh" }}>
      {/* HEADER */}
      <div className="row align-items-center g-3 mb-4 px-2">
        <div className="col-12 col-md-8">
          <h2 className="fw-bold mb-1">Billing & Payments</h2>
          <p className="text-muted small mb-0">Verify customer transactions and receipts</p>
        </div>
        <div className="col-12 col-md-4 text-md-end">
          <button className="btn btn-white border shadow-sm fw-bold px-4" onClick={fetchPayments}>
            <RefreshCw size={16} className="me-2" /> Refresh
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ minWidth: '900px' }}>
            <thead className="bg-light border-bottom">
              <tr className="text-muted small text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: '0.8px' }}>
                <th className="ps-4 py-3">Customer Info</th>
                <th>Method</th>
                <th>Amount Paid</th>
                <th className="text-center">Status</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((p) => (
                <tr key={p.payment_id}>
                  <td className="ps-4 py-3">
                    <div className="fw-bold text-dark">{p.first_name} {p.last_name}</div>
                    <code className="text-muted" style={{ fontSize: '0.6rem' }}>Res ID: #{p.reservation_id}</code>
                  </td>
                  <td>
                    <span className="badge bg-white text-dark border px-3 py-2 fw-normal">
                      {p.payment_method?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="fw-bold text-success">₱{Number(p.amount).toLocaleString()}</span>
                  </td>
                  <td className="text-center">
                    <span className={`badge rounded-pill px-3 py-1 small ${
                      p.payment_status === 'verified' ? 'bg-success text-white' : 
                      p.payment_status === 'pending' ? 'bg-warning text-dark' : 'bg-danger text-white'
                    }`}>
                      {p.payment_status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button 
                      className="btn btn-sm btn-dark fw-bold px-3 py-1 shadow-sm"
                      style={{ minWidth: '100px' }}
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
        <div className="text-muted small">
          Showing <strong>{indexOfFirstItem + 1}</strong> to <strong>{Math.min(indexOfLastItem, payments.length)}</strong> of <strong>{payments.length}</strong>
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button className="page-link border-0 px-3 py-2" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
            </li>
            <li className="page-item disabled"><span className="page-link border-0 text-dark fw-bold px-3 py-2">Page {currentPage} of {totalPages}</span></li>
            <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
              <button className="page-link border-0 px-3 py-2" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPages}><ChevronRight size={16} /></button>
            </li>
          </ul>
        </nav>
      </div>

      {/* COMPRESSED DRAWER */}
      <div className="offcanvas offcanvas-end border-0 shadow-sm" tabIndex="-1" id="billingDrawer" data-bs-backdrop="false" style={{ width: "min(100%, 500px)" }}>
        <div className="offcanvas-header border-bottom bg-white">
          <h5 className="fw-bold m-0 text-dark"><ReceiptText size={20} className="me-2" />Payment Details</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" ref={closeBtnRef}></button>
        </div>
        
        <div className="offcanvas-body bg-white p-0">
          {selectedPayment && (
            <div className="d-flex flex-column">
              
              {/* 1. RECEIPT IMAGE SECTION */}
              <div className="p-3 border-bottom bg-light-subtle">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="x-small fw-bold text-muted text-uppercase">Proof of Payment</span>
                  {selectedPayment.receipt_path && (
                    <a href={getImageUrl(selectedPayment.receipt_path, BASE_URL)} target="_blank" rel="noreferrer" className="text-primary x-small text-decoration-none fw-bold">
                      Full View <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <div className="bg-dark rounded overflow-hidden d-flex align-items-center justify-content-center" style={{ height: "250px" }}>
                  {selectedPayment.receipt_path ? (
                    <img
                      src={getImageUrl(selectedPayment.receipt_path, BASE_URL)}
                      alt="Receipt"
                      style={{ maxHeight: "100%", width: "auto", objectFit: "contain", cursor: "zoom-in" }}
                      onError={(e) => (e.target.src = "https://placehold.co/400?text=Receipt+Not+Found")}
                    />
                  ) : (
                    <div className="text-white-50 text-center x-small">
                      <XCircle size={32} className="mb-2 mx-auto" />
                      <p>No Image Provided</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. ORDER SUMMARY SECTION */}
              <div className="p-3 border-bottom">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <ReceiptText size={14} className="text-muted" />
                  <span className="x-small fw-bold text-muted text-uppercase">Items Summary</span>
                </div>
                {loadingItems ? <div className="text-center py-3"><Loader2 className="spinner-border spinner-border-sm text-primary" /></div> : (
                  <div className="item-list">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="d-flex justify-content-between align-items-center mb-1 py-1">
                        <div className="small text-dark">{item.name || item.item_name} <span className="text-muted small">x{item.quantity}</span></div>
                        <div className="small fw-bold">₱{(item.quantity * item.price).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. FINANCIAL SUMMARY (STICKY BOTTOM) */}
              <div className="p-3 bg-dark text-white sticky-bottom mt-auto">
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <div className="x-small text-white-50">Total Bill</div>
                    <div className="fw-bold">₱{calculateItemsSum().toLocaleString()}</div>
                  </div>
                  <div className="col-6 text-end">
                    <div className="x-small text-white-50">Amount Paid</div>
                    <div className="fw-bold text-success">₱{Number(selectedPayment.amount).toLocaleString()}</div>
                  </div>
                  <div className="col-12 border-top border-secondary pt-2 mt-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="x-small text-warning text-uppercase fw-bold">Remaining Balance</div>
                        <h3 className="fw-bold mb-0 text-warning">₱{(calculateItemsSum() - Number(selectedPayment.amount)).toLocaleString()}</h3>
                      </div>
                      <span className={`badge py-2 px-3 ${selectedPayment.payment_status === 'verified' ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {selectedPayment.payment_status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                {selectedPayment.payment_status === "pending" && (
                  <div className="row g-2">
                    <div className="col-6">
                      <button className="btn btn-success btn-sm w-100 fw-bold py-2" onClick={() => handleStatusChange(selectedPayment.payment_id, 'verified')}>
                        Verify
                      </button>
                    </div>
                    <div className="col-6">
                      <button className="btn btn-outline-danger btn-sm w-100 fw-bold py-2" onClick={() => handleStatusChange(selectedPayment.payment_id, 'rejected')}>
                        Reject
                      </button>
                    </div>
                  </div>
                )}
                
                <button className="btn btn-outline-light btn-sm w-100 fw-bold py-2 mt-2 border-0 opacity-75" data-bs-dismiss="offcanvas">
                  Close Review
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      <style>{`
        .x-small { font-size: 0.65rem; }
        .page-link:focus { box-shadow: none; }
        .btn-outline-light:hover { background: rgba(255,255,255,0.1); color: #fff; }
      `}</style>
    </div>
  );
};

export default Billing;
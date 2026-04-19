import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, X, Search, Image as ImageIcon, ReceiptText, User, Calendar } from 'lucide-react';

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null); // State for the Side Drawer

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await axios.get('/api/billing');
      setPayments(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Mark this payment as ${newStatus}?`)) return;
    try {
      await axios.put(`/api/billing/${id}/status`, { status: newStatus });
      setPayments(payments.map(p => p.payment_id === id ? { ...p, payment_status: newStatus } : p));
      // Close drawer if open
      setSelectedOrder(null);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  if (loading) return <div className="p-5 text-center">Loading Payments...</div>;

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Billing & Downpayments</h2>
          <p className="text-muted small">Verify customer receipts and order accuracy</p>
        </div>
        <button className="btn btn-dark btn-sm px-3" onClick={fetchPayments}>
          Refresh List
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-muted small text-uppercase">
              <tr>
                <th className="ps-4">Receipt</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const imgUrl = p.receipt_path ? `http://localhost:5000/uploads/${p.receipt_path}` : null;

                return (
                  <tr key={p.payment_id}>
                    <td className="ps-4">
                      {imgUrl ? (
                        <div 
                          className="rounded border overflow-hidden bg-light shadow-sm" 
                          style={{ width: '50px', height: '50px', cursor: 'pointer' }}
                          onClick={() => setSelectedImage(imgUrl)}
                        >
                          <img src={imgUrl} alt="Proof" className="w-100 h-100 object-fit-cover" />
                        </div>
                      ) : (
                        <div className="text-muted small italic"><ImageIcon size={16}/> No file</div>
                      )}
                    </td>

                    <td>
                      <div className="fw-bold">{p.first_name} {p.last_name}</div>
                      <button 
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#orderDetailsDrawer"
                        onClick={() => setSelectedOrder(p)}
                      >
                        View Order Details #{p.reservation_id}
                      </button>
                    </td>
                    
                    <td className="fw-bold text-success">₱{parseFloat(p.amount).toFixed(2)}</td>
                    
                    <td>
                      <span className={`badge rounded-pill ${
                        p.payment_status === 'verified' ? 'bg-success' : 
                        p.payment_status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'
                      }`}>
                        {p.payment_status?.toUpperCase()}
                      </span>
                    </td>

                    <td className="text-end pe-4">
                      <button 
                        className="btn btn-sm btn-outline-dark"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#orderDetailsDrawer"
                        onClick={() => setSelectedOrder(p)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ORDER DETAILS SIDE DRAWER --- */}
      <div className="offcanvas offcanvas-end" tabIndex="-1" id="orderDetailsDrawer" style={{ width: '450px' }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold">Order Summary</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body">
          {selectedOrder && (
            <>
              {/* Customer Info */}
              <div className="mb-4 p-3 bg-light rounded">
                <div className="d-flex align-items-center mb-2">
                    <User size={18} className="me-2 text-primary" />
                    <span className="fw-bold">{selectedOrder.first_name} {selectedOrder.last_name}</span>
                </div>
                <div className="small text-muted mb-1">Reservation ID: #{selectedOrder.reservation_id}</div>
                <div className="small text-muted">Status: <span className="text-uppercase fw-bold">{selectedOrder.payment_status}</span></div>
              </div>

              {/* Items List */}
              <h6 className="fw-bold mb-3 d-flex align-items-center">
                <ReceiptText size={18} className="me-2" /> Ordered Items
              </h6>
              <div className="list-group list-group-flush mb-4">
                {/* 
                    NOTE: This assumes your API returns an array of items 
                    called 'items' inside the payment object.
                    If it doesn't, you may need a separate useEffect to fetch items by reservation_id.
                */}
                {selectedOrder.items ? selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold small">{item.name}</div>
                      <small className="text-muted">Qty: {item.quantity} x ₱{parseFloat(item.price).toFixed(2)}</small>
                    </div>
                    <div className="fw-bold">₱{(item.quantity * item.price).toFixed(2)}</div>
                  </div>
                )) : (
                    <div className="text-muted small py-3 border-bottom mb-3">Item details not available.</div>
                )}
              </div>

              {/* Total Calculation */}
              <div className="border-top pt-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>
                  <span>₱{parseFloat(selectedOrder.amount).toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-4 fw-bold fs-5 text-success">
                  <span>Total Paid/Due</span>
                  <span>₱{parseFloat(selectedOrder.amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Proof of Payment Thumbnail */}
              {selectedOrder.receipt_path && (
                <div className="mb-4">
                    <label className="form-label small fw-bold">Proof of Payment:</label>
                    <img 
                        src={`http://localhost:5000/uploads/${selectedOrder.receipt_path}`} 
                        className="w-100 rounded border shadow-sm cursor-pointer"
                        alt="Receipt"
                        onClick={() => setSelectedImage(`http://localhost:5000/uploads/${selectedOrder.receipt_path}`)}
                    />
                </div>
              )}

              {/* Verification Actions */}
              {selectedOrder.payment_status === 'pending' && (
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-success" 
                    onClick={() => handleStatusChange(selectedOrder.payment_id, 'verified')}
                    data-bs-dismiss="offcanvas"
                  >
                    Verify & Confirm Order
                  </button>
                  <button 
                    className="btn btn-outline-danger" 
                    onClick={() => handleStatusChange(selectedOrder.payment_id, 'rejected')}
                    data-bs-dismiss="offcanvas"
                  >
                    Reject Payment
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- LIGHTBOX (IMAGE PREVIEW) --- */}
      {selectedImage && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
          style={{ zIndex: 10000, background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setSelectedImage(null)}
        >
          <div className="position-relative bg-white p-2 rounded" onClick={e => e.stopPropagation()}>
            <button className="btn btn-dark btn-sm position-absolute top-0 end-0 m-2 rounded-circle" onClick={() => setSelectedImage(null)}>
              <X size={18} />
            </button>
            <img src={selectedImage} alt="Full Receipt" style={{ maxHeight: '90vh', maxWidth: '95vw' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
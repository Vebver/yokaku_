import React, { useState, useEffect } from 'react';
import axios from 'axios';
// Added Search, Eye, and X icons
import { Eye, X, Search, Image as ImageIcon } from 'lucide-react';

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null); // For the popup preview

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
          <p className="text-muted small">Verify customer receipts and payment status</p>
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
                <th>Reference #</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                // Construct the correct path to your backend uploads folder
                const imgUrl = p.receipt_path ? `http://localhost:5000/uploads/${p.receipt_path}` : null;

                return (
                  <tr key={p.payment_id}>
                    <td className="ps-4">
                      {imgUrl ? (
                        <div className="d-flex align-items-center gap-2">
                          {/* Small Thumbnail */}
                          <div 
                            className="rounded border overflow-hidden bg-light" 
                            style={{ width: '45px', height: '45px', cursor: 'pointer' }}
                            onClick={() => setSelectedImage(imgUrl)}
                          >
                            <img src={imgUrl} alt="Proof" className="w-100 h-100 object-fit-cover" />
                          </div>
                          {/* THE VIEW BUTTON YOU WANTED */}
                          <button 
                            className="btn btn-sm btn-light border"
                            onClick={() => setSelectedImage(imgUrl)}
                            title="View Full Image"
                          >
                            <Search size={14} /> View
                          </button>
                        </div>
                      ) : (
                        <div className="text-muted small italic"><ImageIcon size={16}/> No file</div>
                      )}
                    </td>

                    <td>
                      <div className="fw-bold">{p.first_name} {p.last_name}</div>
                      <small className="text-muted">Res ID: {p.reservation_id}</small>
                    </td>
                    
                    <td>
                        <span className="badge bg-light text-dark border fw-normal">
                            {p.payment_reference || 'NO REF'}
                        </span>
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
                      <div className="d-flex justify-content-end gap-2">
                        {p.payment_status === 'pending' ? (
                          <>
                            <button 
                              className="btn btn-sm btn-success px-3" 
                              onClick={() => handleStatusChange(p.payment_id, 'verified')}
                            >
                              Verify
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger px-3" 
                              onClick={() => handleStatusChange(p.payment_id, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-muted small border rounded px-2 py-1 bg-light">Processed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- FULL IMAGE PREVIEW MODAL (LIGHTBOX) --- */}
      {selectedImage && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setSelectedImage(null)}
        >
          <div className="position-relative bg-white p-2 rounded shadow-lg" onClick={e => e.stopPropagation()}>
            <button 
              className="btn btn-dark btn-sm position-absolute top-0 end-0 m-2 rounded-circle"
              onClick={() => setSelectedImage(null)}
              style={{ width: '30px', height: '30px', padding: 0 }}
            >
              <X size={18} />
            </button>
            <img 
              src={selectedImage} 
              alt="Full Receipt" 
              style={{ maxHeight: '85vh', maxWidth: '90vw', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
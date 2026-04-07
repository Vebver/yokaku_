import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

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
      // Update local UI
      setPayments(payments.map(p => p.payment_id === id ? { ...p, payment_status: newStatus } : p));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  if (loading) return <div className="p-5 text-center">Loading Payments...</div>;

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Billing & Downpayments</h2>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchPayments}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-muted">
              <tr>
                <th className="ps-4">Ref #</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.payment_id}>
                  <td className="ps-4">
                    <span className="text-muted small">#{p.payment_reference || 'N/A'}</span>
                  </td>
                  <td>
                    <div className="fw-bold">{p.first_name} {p.last_name}</div>
                    <small className="text-muted">Res ID: {p.payment_id}</small>
                  </td>
                  <td><span className="text-uppercase small fw-bold">{p.payment_method}</span></td>
                  <td className="fw-bold text-success">₱{parseFloat(p.amount).toFixed(2)}</td>
                  <td>
                    <span className={`badge rounded-pill ${
                      p.payment_status === 'verified' ? 'bg-success' : 
                      p.payment_status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'
                    }`}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    {p.payment_status === 'pending' && (
                      <>
                        <button 
                          className="btn btn-sm btn-success me-2" 
                          onClick={() => handleStatusChange(p.payment_id, 'verified')}
                        >
                          <i className="bi bi-check-lg"></i> Verify
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger" 
                          onClick={() => handleStatusChange(p.payment_id, 'rejected')}
                        >
                          <i className="bi bi-x-lg"></i> Reject
                        </button>
                      </>
                    )}
                    {p.payment_status !== 'pending' && (
                      <span className="text-muted small italic">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Billing;
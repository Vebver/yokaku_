import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Reservations = () => {
  const [inquiries, setInquiries] = useState([]); // Start with empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/reservations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInquiries(response.data);
      } catch (err) {
        setError("Failed to fetch reservations.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-warning text-dark';
      case 'confirmed': return 'bg-success text-white';
      case 'urgent': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  };

  if (loading) return <div className="p-5 text-center">Loading Reservations...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0 text-dark">Reservations</h2>
          <p className="text-muted small">Manage incoming inquiries from your web platform.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="text-muted small text-uppercase">
                <th className="ps-4 py-3">Customer</th>
                <th className="py-3">Package</th>
                <th className="py-3">Date & Time</th>
                <th className="py-3">Guests</th>
                <th className="py-3">Status</th>
                <th className="text-end pe-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((item) => (
                <tr key={item.reservation_id} className="border-bottom">
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                      <div className="avatar me-3 bg-light rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                        <i className="bi bi-person text-primary"></i>
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{item.first_name} {item.last_name}</div>
                        <div className="text-muted small">{item.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border">{item.package_name}</span>
                  </td>
                  <td>
                    <div className="fw-bold">{new Date(item.reservation_date).toLocaleDateString()}</div>
                    <div className="text-muted small">{item.reservation_time}</div>
                  </td>
                  <td>{item.num_guests}</td>
                  <td>
                    <span className={`badge rounded-pill ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="btn-group">
                      <button className="btn btn-sm btn-outline-success">Approve</button>
                      <button className="btn btn-sm btn-outline-danger">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {inquiries.length === 0 && <div className="text-center p-5">No reservations found.</div>}
        </div>
      </div>
    </div>
  );
};

export default Reservations;  
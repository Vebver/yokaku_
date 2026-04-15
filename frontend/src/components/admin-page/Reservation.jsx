import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Calendar, Users, CreditCard, MapPin } from "lucide-react";

const Reservations = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await axios.get("/api/reservations");
      setInquiries(response.data);
    } catch (err) {
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (!window.confirm(`Mark as ${newStatus}?`)) return;
    try {
      await axios.put(`/api/reservations/${id}/status`, { status: newStatus });
      setInquiries(prev => prev.map(item => 
        item.reservation_id === id ? { ...item, status: newStatus } : item
      ));
    } catch (err) { alert("Action failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(`/api/reservations/${id}`);
      setInquiries(prev => prev.filter(item => item.reservation_id !== id));
    } catch (err) { alert("Delete failed"); }
  };

  // --- STYLING HELPERS ---
  const getStatusBadge = (s) => {
    const status = s?.toLowerCase();
    if (status === 'confirmed') return 'bg-success text-white';
    if (status === 'pending') return 'bg-warning text-dark';
    if (status === 'seated') return 'bg-info text-white';
    return 'bg-secondary text-white';
  };

  const getPaymentBadge = (p) => {
    return p ? 'bg-success-subtle text-success border border-success' : 'bg-light text-muted border';
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = inquiries.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

  if (loading) return <div className="p-5 text-center text-muted">Loading Records...</div>;

  return (
    <div className="container-fluid py-4 fade-in">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="fw-bold mb-1">Reservations</h2>
          <p className="text-muted small mb-0">Live booking management and seating</p>
        </div>
        <div className="badge bg-dark px-3 py-2">{inquiries.length} Total</div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="text-muted small text-uppercase">
                <th className="ps-4">ID</th>
                <th>Guest Details</th>
                <th>Schedule</th>
                <th className="text-center">Pax</th>
                <th>Tables</th>
                <th>Downpayment</th>
                <th>Status</th>
                <th className="text-end pe-4">Manage</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.reservation_id}>
                  <td className="ps-4 text-muted small">#{item.reservation_id}</td>
                  <td>
                    <div className="fw-bold">{item.first_name} {item.last_name}</div>
                    <div className="text-muted x-small" style={{fontSize: '0.75rem'}}>{item.email}</div>
                  </td>
                  <td>
                    <div className="fw-bold">{new Date(item.reservation_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div>
                    <div className="text-muted small">{item.reservation_time}</div>
                  </td>
                  <td className="text-center fw-bold">{item.num_guests}</td>
                  <td>
                    <span className="badge bg-dark-subtle text-dark border px-2">
                      {item.assigned_tables || "None"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge rounded-pill ${getPaymentBadge(item.payment_status)}`}>
                      {item.payment_status ? "VERIFIED" : "PENDING"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge rounded-pill ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end gap-2">
                      {item.status === "Pending" && (
                        <button className="btn btn-sm btn-success px-3" onClick={() => updateStatus(item.reservation_id, "Confirmed")}>Approve</button>
                      )}
                      {item.status === "Confirmed" && (
                        <button className="btn btn-sm btn-info text-white px-3" onClick={() => updateStatus(item.reservation_id, "Seated")}>Seat</button>
                      )}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.reservation_id)}>
                        {item.status === "Pending" ? "Reject" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {inquiries.length === 0 && (
        <div className="text-center py-5 bg-white border-top">
          <p className="text-muted">No active reservations found.</p>
        </div>
      )}
    </div>
  );
};

export default Reservations;
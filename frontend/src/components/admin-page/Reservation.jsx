import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";

// --- SUB-COMPONENT: REAL-TIME COUNTDOWN ---
const CountdownTimer = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(expiryDate));

  function calculateTimeLeft(target) {
    const difference = new Date(target) - new Date();
    if (difference <= 0) return null;

    return {
      d: Math.floor(difference / (1000 * 60 * 60 * 24)),
      h: Math.floor((difference / (1000 * 60 * 60)) % 24),
      m: Math.floor((difference / 1000 / 60) % 60),
      s: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(expiryDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryDate]);

  if (!timeLeft) return <span className="badge bg-danger-subtle text-danger">EXPIRED</span>;

  return (
    <div className="d-flex align-items-center gap-1 text-primary fw-bold" style={{ fontSize: '0.85rem' }}>
      <Clock size={14} className="animate-pulse" />
      <span>
        {timeLeft.d > 0 && `${timeLeft.d}d `}
        {timeLeft.h.toString().padStart(2, '0')}:
        {timeLeft.m.toString().padStart(2, '0')}:
        {timeLeft.s.toString().padStart(2, '0')}
      </span>
    </div>
  );
};

const Reservations = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/reservations");
      setInquiries(response.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (!window.confirm(`Mark as ${newStatus}?`)) return;
    try {
      await axios.put(`http://localhost:5000/api/reservations/${id}/status`, { status: newStatus });
      setInquiries(prev => prev.map(item => 
        item.reservation_id === id ? { ...item, status: newStatus } : item
      ));
    } catch (err) { alert("Action failed"); }
  };

  const getStatusBadge = (s) => {
    const status = s?.toLowerCase();
    if (status === 'confirmed') return 'bg-success text-white';
    if (status === 'pending') return 'bg-warning text-dark';
    if (status === 'seated') return 'bg-info text-white';
    return 'bg-secondary text-white';
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = inquiries.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

  if (loading) return <div className="p-5 text-center text-muted">Loading Records...</div>;

  return (
    <div className="container-fluid py-4 fade-in text-dark">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="fw-bold mb-1">Reservations</h2>
          <p className="text-muted small mb-0">Live booking management and automatic expiry tracking</p>
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
                <th>Time Remaining</th> {/* New Column Label */}
                <th>Schedule</th>
                <th className="text-center">Pax</th>
                <th>Status</th>
                <th className="text-end pe-4">Manage</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => {
                // Assuming your backend sends 'expires_at' or we calculate it 
                // based on reservation_date + 2 days
                const startDateTime = new Date(`${item.reservation_date.split('T')[0]} ${item.reservation_time}`);
                const expiryDate = new Date(startDateTime);
                expiryDate.setDate(expiryDate.getDate() + 2); // The 2-day duration

                return (
                  <tr key={item.reservation_id}>
                    <td className="ps-4 text-muted small">#{item.reservation_id}</td>
                    <td>
                      <div className="fw-bold">{item.first_name} {item.last_name}</div>
                      <div className="text-muted x-small">{item.email}</div>  
                    </td>
                    <td>
                       {/* --- THE COUNTDOWN TIMER --- */}
                       <CountdownTimer expiryDate={expiryDate} />
                    </td>
                    <td>
                      <div className="fw-bold">{new Date(item.reservation_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div>
                      <div className="text-muted small">{item.reservation_time}</div>
                    </td>
                    <td className="text-center fw-bold">{item.num_guests}</td>
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
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.reservation_id)}> Reject </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reservations;
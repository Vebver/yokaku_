import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, Armchair } from "lucide-react";

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

  if (!timeLeft)
    return <span className="badge bg-danger-subtle text-danger">EXPIRED</span>;

  return (
    <div
      className="d-flex align-items-center gap-1 text-primary fw-bold"
      style={{ fontSize: "0.8rem" }}
    >
      <Clock size={12} />
      <span>
        {timeLeft.d > 0 && `${timeLeft.d}d `}
        {timeLeft.h.toString().padStart(2, "0")}:
        {timeLeft.m.toString().padStart(2, "0")}:
        {timeLeft.s.toString().padStart(2, "0")}
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

  const getStatusBadge = (s) => {
    const status = s?.toLowerCase();
    if (status === "confirmed") return "bg-success text-white";
    if (status === "pending") return "bg-warning text-dark";
    if (status === "seated") return "bg-info text-white";
    if (status === "rejected") return "bg-danger text-white";
    return "bg-secondary text-white";
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = inquiries.slice(
    indexOfLastItem - itemsPerPage,
    indexOfLastItem
  );

  if (loading)
    return <div className="p-5 text-center text-muted">Loading Records...</div>;

  return (
    <div className="container-fluid py-4 fade-in text-dark">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Reservation Logs</h2>
          <p className="text-muted small mb-0">
            View all booking history and current assignments
          </p>
        </div>
        <div className="badge bg-dark px-3 py-2">{inquiries.length} Total</div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden rounded-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr
                className="text-muted small text-uppercase"
                style={{ fontSize: "0.75rem" }}
              >
                <th className="ps-4">ID</th>
                <th>Guest Details</th>
                <th>Assigned Tables</th>
                <th>Time Remaining</th>
                <th>Schedule</th>
                <th className="text-center">Pax</th>
                <th className="pe-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => {
                const startDateTime = new Date(
                  `${item.reservation_date.split("T")[0]} ${item.reservation_time}`
                );
                const expiryDate = new Date(startDateTime);
                expiryDate.setDate(expiryDate.getDate() + 2);

                return (
                  <tr key={item.reservation_id} style={{ height: "70px" }}>
                    <td className="ps-4 text-muted small">
                      #{item.reservation_id}
                    </td>
                    <td>
                      <div className="fw-bold text-dark">
                        {item.first_name} {item.last_name}
                      </div>
                      <div
                        className="text-muted"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {item.email}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-1 bg-primary-subtle text-primary rounded">
                          <Armchair size={14} />
                        </div>
                        <span className="fw-bold" style={{ color: "#333" }}>
                          {item.assigned_tables || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <CountdownTimer expiryDate={expiryDate} />
                    </td>
                    <td>
                      <div className="fw-bold text-dark">
                        {new Date(item.reservation_date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </div>
                      <div className="text-muted small">
                        {item.reservation_time}
                      </div>
                    </td>
                    <td className="text-center fw-bold text-dark">
                      {item.num_guests}
                    </td>
                    <td className="pe-4">
                      <span
                        className={`badge rounded-pill ${getStatusBadge(item.status)}`}
                      >
                        {item.status}
                      </span>
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
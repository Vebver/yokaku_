import React, { useState, useEffect } from "react";
import axios from "axios";

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
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/reservations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInquiries(response.data);
    } catch (err) {
      setError("Failed to fetch reservations.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = inquiries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(inquiries.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- HANDLE APPROVE (Pending -> Confirmed) ---
  const handleApprove = async (id) => {
    if (!window.confirm("Approve this reservation?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/reservations/${id}/status`, { status: "Confirmed" }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setInquiries((prev) =>
        prev.map((item) => (item.reservation_id === id ? { ...item, status: "Confirmed" } : item))
      );
    } catch (err) {
      alert("Error approving reservation");
    }
  };

  // --- HANDLE SEATED (Confirmed -> Seated) ---
  const handleSeated = async (id) => {
    if (!window.confirm("Mark this guest as Seated at a table?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/reservations/${id}/status`, { status: "Seated" }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state so the UI changes to "Seated"
      setInquiries((prev) =>
        prev.map((item) => (item.reservation_id === id ? { ...item, status: "Seated" } : item))
      );
    } catch (err) {
      alert("Error marking as seated");
    }
  };

  // --- HANDLE DELETE ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/reservations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInquiries((prev) => prev.filter((item) => item.reservation_id !== id));
    } catch (err) {
      alert("Error deleting");
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return "bg-warning text-dark";
      case "confirmed": return "bg-success text-white";
      case "seated": return "bg-info text-white"; // Added Seated Style
      case "urgent": return "bg-danger text-white";
      default: return "bg-secondary text-white";
    }
  };

  if (loading) return <div className="p-5 text-center">Loading...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

  return (
    <div className="container-fluid px-2 px-md-4 fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-0 text-dark fs-3 fs-md-2">Reservations</h2>
          <p className="text-muted small mb-0">Manage guest seating and inquiries.</p>
        </div>
        <div className="text-muted small">Total: <span className="fw-bold">{inquiries.length}</span></div>
      </div>

      <div className="d-none d-md-block card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light text-muted small text-uppercase">
              <tr>
                <th className="ps-4 py-3">Customer</th>
                <th className="py-3">Package</th>
                <th className="py-3">Date & Time</th>
                <th className="py-3 text-center">Guests</th>
                <th className="py-3">Status</th>
                <th className="text-end pe-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.reservation_id} className="border-bottom">
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{item.first_name} {item.last_name}</div>
                    <div className="text-muted small">{item.email}</div>
                  </td>
                  <td><span className="badge bg-light text-dark border">{item.package_name}</span></td>
                  <td>
                    <div className="fw-bold">{new Date(item.reservation_date).toLocaleDateString()}</div>
                    <div className="text-muted small">{item.reservation_time}</div>
                  </td>
                  <td className="text-center">{item.num_guests}</td>
                  <td>
                    <span className={`badge rounded-pill ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="btn-group">
                      {/* Only show Approve for Pending */}
                      {item.status === "Pending" && (
                        <button className="btn btn-sm btn-outline-success" onClick={() => handleApprove(item.reservation_id)}>
                          Approve
                        </button>
                      )}
                      
                      {/* Only show Mark as Seated for Confirmed */}
                      {item.status === "Confirmed" && (
                        <button className="btn btn-sm btn-outline-info" onClick={() => handleSeated(item.reservation_id)}>
                          Seat Guest
                        </button>
                      )}

                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.reservation_id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav className="d-flex justify-content-center mt-4">
          <ul className="pagination shadow-sm">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => paginate(currentPage - 1)}>&laquo;</button>
            </li>
            {[...Array(totalPages)].map((_, index) => (
              <li key={index + 1} className={`page-item ${currentPage === index + 1 ? "active" : ""}`}>
                <button className="page-link" onClick={() => paginate(index + 1)}>{index + 1}</button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => paginate(currentPage + 1)}>&raquo;</button>
            </li>
          </ul>
        </nav>
      )}

      {inquiries.length === 0 && (
        <div className="text-center py-5 bg-white rounded shadow-sm">
          <p className="text-muted mt-3">No reservations found.</p>
        </div>
      )}
    </div>
  );
};

export default Reservations;
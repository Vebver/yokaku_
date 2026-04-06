import React, { useState, useEffect } from "react";
import axios from "axios";

const Reservations = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Adjust as needed
  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem("token");
      // Since you set up the proxy in vite.config.js, you can remove localhost:5000
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

  // --- NEW: PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = inquiries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(inquiries.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to top on page change
  };

  // --- NEW: HANDLE APPROVE ---
  const handleApprove = async (id) => {
    if (!window.confirm("Approve this reservation?")) return;

    try {
      const token = localStorage.getItem("token");
      // We send a PUT request to change the status to 'Confirmed'
      await axios.put(
        `/api/reservations/${id}/status`,
        { status: "Confirmed" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Update the local state so the UI changes immediately
      setInquiries((prev) =>
        prev.map((item) =>
          item.reservation_id === id ? { ...item, status: "Confirmed" } : item,
        ),
      );

      alert("Reservation Approved!");
    } catch (err) {
      alert(
        "Error approving reservation: " +
          (err.response?.data?.error || err.message),
      );
    }
  };

  // --- NEW: HANDLE DELETE ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reservation?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/reservations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove the item from the local state
      setInquiries((prev) => prev.filter((item) => item.reservation_id !== id));
      alert("Reservation Deleted.");
    } catch (err) {
      alert("Error deleting: " + (err.response?.data?.error || err.message));
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-warning text-dark";
      case "confirmed":
        return "bg-success text-white";
      case "urgent":
        return "bg-danger text-white";
      default:
        return "bg-secondary text-white";
    }
  };

  if (loading) return <div className="p-5 text-center">Loading...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

  return (
    <div className="container-fluid px-2 px-md-4 fade-in">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-0 text-dark fs-3 fs-md-2">Reservations</h2>
          <p className="text-muted small mb-0">
            Manage incoming inquiries from your web platform.
          </p>
        </div>
        <div className="text-muted small">
          Total: <span className="fw-bold">{inquiries.length}</span>
        </div>
      </div>

      {/* Desktop & Tablet View (Hidden on mobile < 768px) */}
      <div className="d-none d-md-block card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light text-muted small text-uppercase">
              <tr>
                <th className="ps-4 py-3">Customer</th>
                <th className="py-3">Package</th>
                <th className="py-3 text-nowrap">Date & Time</th>
                <th className="py-3 text-center">Guests</th>
                <th className="py-3">Status</th>
                <th className="text-end pe-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.reservation_id} className="border-bottom">
                  <td className="ps-4">
                    <div
                      className="fw-bold text-dark text-truncate"
                      style={{ maxWidth: "180px" }}
                    >
                      {item.first_name} {item.last_name}
                    </div>
                    <div
                      className="text-muted small text-truncate"
                      style={{ maxWidth: "180px" }}
                    >
                      {item.email}
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      {item.package_name}
                    </span>
                  </td>
                  <td className="text-nowrap">
                    <div className="fw-bold">
                      {new Date(item.reservation_date).toLocaleDateString()}
                    </div>
                    <div className="text-muted small">
                      {item.reservation_time}
                    </div>
                  </td>
                  <td className="text-center">{item.num_guests}</td>
                  <td>
                    <span
                      className={`badge rounded-pill ${getStatusStyle(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="btn-group">
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => handleApprove(item.reservation_id)}
                        disabled={item.status === "Confirmed"}
                      >
                        <i className="bi bi-check-lg d-lg-none"></i>
                        <span className="d-none d-lg-inline">Approve</span>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(item.reservation_id)}
                      >
                        <i className="bi bi-trash d-lg-none"></i>
                        <span className="d-none d-lg-inline">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View (Hidden on screens >= 768px) */}
      <div className="d-md-none">
        {currentItems.map((item) => (
          <div
            key={item.reservation_id}
            className="card border-0 shadow-sm mb-3 overflow-hidden"
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">
                    {item.first_name} {item.last_name}
                  </h6>
                  <small className="text-muted">{item.email}</small>
                </div>
                <span
                  className={`badge rounded-pill ${getStatusStyle(item.status)}`}
                >
                  {item.status}
                </span>
              </div>

              <div className="row g-2 mb-3 small">
                <div className="col-6">
                  <div className="text-muted mb-1">Package</div>
                  <div className="fw-bold">{item.package_name}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted mb-1">Guests</div>
                  <div className="fw-bold">{item.num_guests} Pax</div>
                </div>
                <div className="col-12 border-top pt-2 mt-2">
                  <div className="text-muted mb-1">Date & Time</div>
                  <div className="fw-bold">
                    {new Date(item.reservation_date).toLocaleDateString()} @{" "}
                    {item.reservation_time}
                  </div>
                </div>
              </div>

              <div className="d-grid gap-2 border-top pt-3">
                <button
                  className="btn btn-success btn-sm w-100"
                  onClick={() => handleApprove(item.reservation_id)}
                  disabled={item.status === "Confirmed"}
                >
                  Approve Reservation
                </button>
                <button
                  className="btn btn-outline-danger btn-sm w-100"
                  onClick={() => handleDelete(item.reservation_id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/*Pagination Controls (Only show if more than 1 page)*/}
      {totalPages > 1 && (
        <nav className="d-flex justify-content-center mt-4">
          <ul className="pagination shadow-sm">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => paginate(currentPage - 1)}
              >
                &laquo;
              </button>
            </li>

            {[...Array(totalPages)].map((_, index) => (
              <li
                key={index + 1}
                className={`page-item ${currentPage === index + 1 ? "active" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => paginate(index + 1)}
                >
                  {index + 1}
                </button>
              </li>
            ))}

            <li
              className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
            >
              <button
                className="page-link"
                onClick={() => paginate(currentPage + 1)}
              >
                &raquo;
              </button>
            </li>
          </ul>
        </nav>
      )}

      {inquiries.length === 0 && (
        <div className="text-center py-5 bg-white rounded shadow-sm">
          <p className="text-muted mt-3">No reservations found.</p>
        </div>
      )}

      {/* Empty State */}
      {inquiries.length === 0 && (
        <div className="text-center py-5 bg-white rounded shadow-sm">
          <i className="bi bi-calendar-x text-muted display-4"></i>
          <p className="text-muted mt-3">No reservations found.</p>
        </div>
      )}
    </div>
  );
};

export default Reservations;

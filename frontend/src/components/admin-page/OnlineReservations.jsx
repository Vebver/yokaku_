import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Armchair,
  User,
  Package,
  ChevronLeft,
  ChevronRight,
  Clock,
  ReceiptText,
  Info,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const OnlineReservations = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Filter: Online only (Exclude WALK)
      const filtered = response.data.filter(
        (item) => !item.reservation_id?.includes("WALK"),
      );
      setInquiries(
        filtered.sort((a, b) => b.reservation_id - a.reservation_id),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (resId) => {
    setOrderItems([]);
    setLoadingItems(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/reservations/${resId}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Helper for Status Colors
  const getStatusBadge = (s) => {
    const status = s?.toLowerCase();
    if (status === "confirmed" || status === "verified")
      return "bg-success text-white";
    if (status === "pending") return "bg-warning text-dark";
    if (status === "seated") return "bg-info text-white";
    if (status === "completed") return "bg-secondary text-white";
    return "bg-danger text-white";
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = inquiries.slice(
    (currentPage - 1) * itemsPerPage,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(inquiries.length / itemsPerPage);

  if (loading)
    return (
      <div className="p-5 text-center text-muted">
        <div className="spinner-border text-primary"></div>
      </div>
    );

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* HEADER */}
      <div className="row align-items-center mb-4 px-2">
        <div className="col">
          <h2 className="fw-bold mb-1">Online Reservations</h2>
          <p className="text-muted small mb-0">
            Manage website bookings and customer downpayments
          </p>
        </div>
        <div className="col-auto">
          <div className="bg-white border rounded-pill px-3 py-1 shadow-sm small fw-bold">
            {inquiries.length} Bookings
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ minWidth: "950px" }}
          >
            <thead className="bg-light border-bottom">
              <tr
                className="text-muted small text-uppercase"
                style={{ fontSize: "0.7rem", letterSpacing: "0.8px" }}
              >
                <th className="ps-4 py-3">Guest & ID</th>
                <th>Table</th>
                <th>Schedule</th>
                <th>Down Payment</th>
                <th className="text-center">Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.reservation_id}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">
                      {item.first_name} {item.last_name}
                    </div>
                    <code className="x-small text-muted">
                      {item.reservation_id}
                    </code>
                  </td>
                  <td>
                    <Armchair size={14} className="me-1 text-muted" />
                    <span className="small fw-bold">
                      {item.assigned_tables || "T-?"}
                    </span>
                  </td>
                  <td>
                    <div className="fw-bold small">
                      {new Date(item.reservation_date).toLocaleDateString()}
                    </div>
                    <div className="x-small text-muted">
                      {item.reservation_time}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge border px-2 py-1 small fw-normal ${
                        item.payment_status?.toLowerCase() === "verified"
                          ? "bg-success-subtle text-success border-success-subtle"
                          : "bg-warning-subtle text-warning border-warning-subtle"
                      }`}
                    >
                      {item.payment_status?.toUpperCase() || "PENDING"}
                    </span>
                  </td>
                  <td className="text-center">
                    <span
                      className={`badge rounded-pill px-3 py-1 small ${getStatusBadge(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-dark px-3 shadow-sm fw-bold"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#onlineDrawer"
                      onClick={() => {
                        setSelectedRes(item);
                        fetchItems(item.reservation_id);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 px-3 d-flex justify-content-between align-items-center">
        <span className="small text-muted">
          Showing {currentItems.length} of {inquiries.length} items
        </span>
        <div className="btn-group shadow-sm bg-white rounded border">
          <button
            className="btn btn-sm btn-white border-0 px-3"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="btn btn-sm disabled border-0 px-3 text-dark fw-bold">
            Page {currentPage}
          </span>
          <button
            className="btn btn-sm btn-white border-0 px-3"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* DRAWER (Fixed Structure) */}
      <div
        className="offcanvas offcanvas-end border-0 shadow-sm"
        tabIndex="-1"
        id="onlineDrawer"
        data-bs-backdrop="false"
        style={{ width: "min(100%, 450px)" }}
      >
        <div className="offcanvas-header border-bottom bg-white">
          <h5 className="fw-bold m-0 text-dark">
            <ReceiptText size={20} className="me-2" />
            Reservation Details
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
          ></button>
        </div>

        <div className="offcanvas-body bg-white p-0">
          {selectedRes && (
            <div className="d-flex flex-column h-100">
              {/* 1. HEADER */}
              <div className="p-3 border-bottom bg-light-subtle">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="p-2 bg-primary text-white rounded-circle shadow-sm">
                    <User size={18} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="fw-bold text-dark lh-1 mb-1">
                      {selectedRes.first_name} {selectedRes.last_name}
                    </div>
                    <div className="x-small text-muted text-truncate mb-1">
                      {selectedRes.email}
                    </div>
                    {/* ADDED PHONE NUMBER HERE */}
                    <div className="d-flex align-items-center gap-1">
                      <a
                        href={`tel:${selectedRes.phone_number || selectedRes.phone}`}
                        className="x-small fw-bold text-decoration-none text-primary"
                      >
                        {selectedRes.phone_number ||
                          selectedRes.phone ||
                          "No Phone Provided"}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="row g-0 mt-3 pt-2 border-top border-light text-center">
                  <div className="col-4 border-end">
                    <div className="x-small text-muted text-uppercase">
                      Occasion
                    </div>
                    <div className="small fw-bold text-primary">
                      {selectedRes.occasion || "N/A"}
                    </div>
                  </div>
                  <div className="col-4 border-end">
                    <div className="x-small text-muted text-uppercase">
                      Guests
                    </div>
                    <div className="small fw-bold">
                      {selectedRes.pax || "0"} Pax
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="x-small text-muted text-uppercase">
                      High Chair
                    </div>
                    <div className="small fw-bold">
                      {selectedRes.high_chair ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. TIMELINE & ALLERGIES */}
              <div className="p-3 border-bottom">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <Clock size={14} className="text-muted" />
                    <span className="x-small fw-bold text-muted text-uppercase">
                      Timeline
                    </span>
                  </div>
                  <div className="small fw-bold">
                    <span className="text-muted">
                      {selectedRes.time_started || "--:--"}
                    </span>
                    <ChevronRight size={14} className="mx-1 text-muted" />
                    <span className="text-dark">
                      {selectedRes.time_ended || "Active"}
                    </span>
                  </div>
                </div>

                {selectedRes.allergies && (
                  <div className="p-2 bg-warning-subtle rounded border border-warning-subtle d-flex gap-2">
                    <Info
                      size={14}
                      className="text-warning mt-1 flex-shrink-0"
                    />
                    <div className="x-small">{selectedRes.allergies}</div>
                  </div>
                )}
              </div>

              {/* 3. ORDERS */}
              <div className="p-3 flex-grow-1 overflow-auto">
                <span className="x-small fw-bold text-muted text-uppercase d-block mb-2">
                  Orders
                </span>
                {loadingItems ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm text-primary"></div>
                  </div>
                ) : (
                  <div className="item-list">
                    {orderItems.length > 0 ? (
                      orderItems.map((order, idx) => (
                        <div
                          key={idx}
                          className="d-flex justify-content-between align-items-center mb-1 py-1"
                        >
                          <div className="small text-dark">
                            {order.name || order.item_name}{" "}
                            <span className="text-muted small">
                              x{order.quantity}
                            </span>
                          </div>
                          <div className="small fw-bold">
                            ₱{Number(order.price * order.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 text-muted x-small">
                        No items.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. FOOTER */}
              <div className="p-3 bg-dark text-white sticky-bottom">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <div className="x-small text-white-50 text-uppercase fw-bold">
                      Total Bill
                    </div>
                    <h3 className="fw-bold mb-0">
                      ₱
                      {orderItems
                        .reduce((t, i) => t + Number(i.price) * i.quantity, 0)
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                    </h3>
                  </div>
                  <span
                    className={`badge py-2 px-3 ${getStatusBadge(selectedRes.status)}`}
                  >
                    {selectedRes.status?.toUpperCase()}
                  </span>
                </div>
                <button
                  className="btn btn-dark btn-sm w-100 fw-bold border border-white border-opacity-25 py-2"
                  data-bs-dismiss="offcanvas"
                >
                  Close Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineReservations;

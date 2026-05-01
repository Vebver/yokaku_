import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Clock,
  Armchair,
  Receipt,
  User,
  Package,
  ChevronRight,
  X,
  Info,
} from "lucide-react";

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
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft(expiryDate)), 1000);
    return () => clearInterval(timer);
  }, [expiryDate]);

  if (!timeLeft) return <span className="badge bg-danger-subtle text-danger">EXPIRED</span>;

  return (
    <div className="d-flex align-items-center gap-1 text-primary fw-bold" style={{ fontSize: "0.8rem" }}>
      <Clock size={12} />
      <span>
        {timeLeft.d > 0 && `${timeLeft.d}d `}
        {timeLeft.h.toString().padStart(2, "0")}:{timeLeft.m.toString().padStart(2, "0")}:{timeLeft.s.toString().padStart(2, "0")}
      </span>
    </div>
  );
};

const Reservations = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

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

  const fetchItems = async (resId) => {
    setOrderItems([]); // Clear old items while loading
    setLoadingItems(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/reservations/${resId}/items`);
      setOrderItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const getStatusBadge = (s) => {
    const status = s?.toLowerCase();
    if (status === "confirmed") return "bg-success text-white";
    if (status === "pending") return "bg-warning text-dark";
    if (status === "seated") return "bg-info text-white";
    if (status === "completed") return "bg-secondary text-white";
    return "bg-danger text-white";
  };

  const getPaymentBadge = (s) => {
    const status = s?.toLowerCase();
    if (status === "verified") return "badge bg-success-subtle text-success border border-success-subtle";
    if (status === "pending") return "badge bg-warning-subtle text-warning border border-warning-subtle";
    return "badge bg-danger-subtle text-danger border border-danger-subtle";
  };

  // Logic to calculate bill from items in drawer
  const calculateDrawerTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + parseFloat(item.price || 0) * parseInt(item.quantity || 1);
    }, 0);
  };

  return (
    <div className="container-fluid py-4 fade-in text-dark">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="fw-bold mb-1">Reservation Logs</h2>
          <p className="text-muted small mb-0">Monitor bookings, orders, and payments</p>
        </div>
        <div className="badge bg-dark px-3 py-2">{inquiries.length} Total Records</div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden rounded-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="text-muted small text-uppercase" style={{ fontSize: "0.75rem" }}>
                <th className="ps-4">Guest & ID</th>
                <th>Assigned Tables</th>
                <th>Schedule</th>
                <th>Payment</th>
                <th className="text-center">Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((item) => (
                <tr key={item.reservation_id} style={{ height: "70px" }}>
                  <td className="ps-4">
                    <div className="fw-bold">{item.first_name} {item.last_name}</div>
                    <div className="text-muted" style={{ fontSize: "0.7rem" }}>ID: {item.reservation_id}</div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Armchair size={14} className="text-primary" />
                      <span className="fw-bold small">{item.assigned_tables || "N/A"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="fw-bold small">{new Date(item.reservation_date).toLocaleDateString()}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>{item.reservation_time}</div>
                  </td>
                  <td>
                    <span className={getPaymentBadge(item.payment_status)}>
                      {item.payment_status?.toUpperCase() || "UNPAID"}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`badge rounded-pill ${getStatusBadge(item.status)}`}>{item.status}</span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-outline-dark fw-bold px-3"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#resDetailsDrawer"
                      onClick={() => { setSelectedRes(item); fetchItems(item.reservation_id); }}
                    >
                      View Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILS DRAWER */}
      <div className="offcanvas offcanvas-end border-0 shadow" tabIndex="-1" id="resDetailsDrawer" style={{ width: "450px" }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="fw-bold m-0">Reservation Details</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body bg-light-subtle">
          {selectedRes && (
            <>
              {/* Section: Customer */}
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="text-muted small text-uppercase fw-bold mb-3">Customer Info</h6>
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-primary-subtle text-primary rounded-circle"><User size={20} /></div>
                    <div>
                      <div className="fw-bold">{selectedRes.first_name} {selectedRes.last_name}</div>
                      <div className="small text-muted">{selectedRes.email}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Items */}
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="text-muted small text-uppercase fw-bold mb-3">Order Items</h6>
                  {loadingItems ? (
                    <div className="text-center py-3"><div className="spinner-border spinner-border-sm"></div></div>
                  ) : (
                    <div className="item-list">
                      {orderItems.length > 0 ? orderItems.map((order, idx) => {
                        let customs = null;
                        if (order.customizations) {
                          customs = typeof order.customizations === "string" ? JSON.parse(order.customizations) : order.customizations;
                        }
                        return (
                          <div key={idx} className="mb-3 pb-2 border-bottom border-light">
                            <div className="d-flex justify-content-between fw-bold">
                              <span>{order.name || order.item_name || "Unknown Item"}</span>
                              <span className="text-primary">x{order.quantity}</span>
                            </div>
                            <div className="text-muted x-small">₱{Number(order.price).toFixed(2)} each</div>
                            {customs && (
                              <div className="mt-1 ps-2 border-start border-2 border-warning-subtle">
                                {customs.flavor && <div className="small text-muted">Flavor: <span className="text-dark fw-bold">{customs.flavor}</span></div>}
                                {customs.drink && <div className="small text-muted">Drink: <span className="text-dark fw-bold">{customs.drink}</span></div>}
                                {customs.spiceLevel && <div className="small text-muted">Spice: <span className="text-dark fw-bold">{customs.spiceLevel}</span></div>}
                              </div>
                            )}
                          </div>
                        );
                      }) : <p className="text-center text-muted small">No items found.</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Single Clean Payment Card */}
              <div className="card border-0 shadow-sm bg-dark text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="small text-white-50 text-uppercase">
                        {selectedRes.amount > 0 ? "Amount Paid (Downpayment)" : "Estimated Bill Total"}
                      </div>
                      <div className="fs-4 fw-bold">
                        ₱{selectedRes.amount > 0 
                          ? Number(selectedRes.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) 
                          : calculateDrawerTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })
                        }
                      </div>
                    </div>
                    <span className={`badge ${selectedRes.payment_status === 'verified' ? 'bg-success' : 'bg-warning'}`}>
                      {selectedRes.payment_status?.toUpperCase() || "PENDING"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reservations;
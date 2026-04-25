import React, { useState, useEffect } from "react";
import axios from "axios";

const TableStatus = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestName, setGuestName] = useState("");

  // Fetch Tables from Backend
  const fetchTables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/admin/table-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTables(res.data);
    } catch (err) {
      console.error("Error fetching tables", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchTables, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle Walk-in Submission
  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!guestName) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `/api/admin/walk-in/${selectedTable.table_id}`,
        { customer_name: guestName },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setShowModal(false);
      setGuestName("");
      fetchTables(); // Refresh grid
    } catch (err) {
      alert("Failed to process walk-in");
    } finally {
      setUpdating(false);
    }
  };

  // Handle Checkout (Clear Table)
  const handleCheckout = async (e, tableId) => {
    e.stopPropagation(); // Prevent opening modal
    if (!window.confirm("Are you sure you want to clear this table?")) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/admin/checkout/${tableId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchTables();
    } catch (err) {
      alert("Failed to checkout");
    } finally {
      setUpdating(false);
    }
  };

  const getMinutesElapsed = (startTime) => {
    if (!startTime) return 0;
    const diff = Math.floor((new Date() - new Date(startTime)) / 60000);
    return diff;
  };

  if (loading && tables.length === 0)
    return <div className="text-center mt-5 p-5">Loading Floor Plan...</div>;

  return (
    <div className="container-fluid px-5 py-4 bg-light min-vh-100">
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-start mb-5">
        <div>
          <h1 className="fw-bold mb-0 text-dark" style={{ fontSize: "2.5rem" }}>
            Table Management
          </h1>
          <p className="text-muted small">
            Monitor real-time table occupancy and process walk-ins
          </p>
        </div>
        <button
          className="btn btn-dark px-4 fw-bold shadow-sm"
          style={{ borderRadius: "8px" }}
          onClick={fetchTables}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Floor Plan"}
        </button>
      </div>

      {/* TABLE GRID */}
      <div className="row g-4">
        {tables.map((table) => {
          // Check 'reservation_status' instead of 'status'
          const isOccupied = table.reservation_status === "seated";
          const time = isOccupied ? getMinutesElapsed(table.check_in_time) : 0;
          const isWarning = time > 90;

          return (
            <div key={table.table_id} className="col-12 col-md-4 col-lg-3">
              <div
                className="card border-0 shadow-sm h-100 position-relative overflow-hidden hover-card"
                style={{
                  cursor: isOccupied ? "default" : "pointer",
                  transition: "0.3s",
                }}
                onClick={() =>
                  !isOccupied && (setSelectedTable(table), setShowModal(true))
                }
              >
                {/* Top Indicator Bar */}
                <div
                  style={{
                    height: "6px",
                    backgroundColor: !isOccupied
                      ? "#10b981"
                      : isWarning
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                ></div>

                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h3 className="fw-bold mb-0">
                        Table {table.table_number}
                      </h3>
                      <span className="text-muted small">
                        {isOccupied 
                          ? `${table.available_seats || 0} Available` 
                          : `${table.capacity} Seater`
                        }
                      </span>
                    </div>
                    <span
                      className="badge rounded-pill px-3 py-2"
                      style={{
                        backgroundColor: !isOccupied
                          ? "#ecfdf5"
                          : isWarning
                            ? "#fffbeb"
                            : "#fef2f2",
                        color: !isOccupied
                          ? "#059669"
                          : isWarning
                            ? "#b45309"
                            : "#dc2626",
                        fontSize: "0.65rem",
                      }}
                    >
                      {isOccupied ? "OCCUPIED" : "AVAILABLE"}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-top">
                    {isOccupied ? (
                      <div>
                        <div
                          className="fw-bold text-dark small text-uppercase mb-1"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Guest Name
                        </div>
                        <div className="fw-bold mb-2">
                          {table.customer_name}
                        </div>
                        <div
                          className={`small mb-3 ${isWarning ? "text-danger fw-bold" : "text-muted"}`}
                        >
                          ⏱ Seated for {time} minutes
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger w-100 fw-bold"
                          onClick={(e) => handleCheckout(e, table.table_id)}
                        >
                          Checkout
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-muted small fw-bold text-uppercase">
                        Click to Start Walk-in
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* WALK-IN MODAL */}
      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  Walk-in: Table {selectedTable?.table_number}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleWalkInSubmit}>
                <div className="modal-body py-4">
                  <label className="form-label small fw-bold text-muted text-uppercase">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    className="form-control bg-light border-0 py-2"
                    placeholder="Enter guest name..."
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark px-4"
                    disabled={updating}
                  >
                    {updating ? "Processing..." : "Confirm Walk-in"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
      `}</style>
    </div>
  );
};

export default TableStatus;

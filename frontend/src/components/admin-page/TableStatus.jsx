import React, { useState, useEffect } from "react";
import api from "../../api"
import { Plus, Armchair } from "lucide-react"; // Added icons
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TableStatus = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false); // For adding new tables
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [showBillModal, setShowBillModal] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [loadingBill, setLoadingBill] = useState(false);
  const [activeTableLabel, setActiveTableLabel] = useState("");

  const handleViewBill = async (reservationId, tableLabel) => {
    if (!reservationId) return alert("No active session found for this table.");

    setActiveTableLabel(tableLabel);
    setShowBillModal(true);
    setLoadingBill(true);

    try {
      const res = await api.get(
        `${API_BASE}/reservations/${reservationId}/items`,
      );
      setBillItems(res.data);
    } catch (err) {
      console.error("Error fetching bill:", err);
    } finally {
      setLoadingBill(false);
    }
  };
  // New Table State
  const [newTableData, setNewTableData] = useState({
    table_number: "",
    capacity: 4,
  });

  // Fetch Tables from Backend
  const fetchTables = async () => {
     console.log("DEBUG: Token in localStorage is:", localStorage.getItem("token"));
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get("/admin/table-status", {
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
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Adding a New Table to the Database
  const handleAddTableSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      await api.post("/admin/add-table", newTableData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowAddModal(false);
      setNewTableData({ table_number: "", capacity: 4 });
      fetchTables(); // Refresh the grid
    } catch (err) {
      alert("Failed to add table. Table number might already exist.");
    } finally {
      setUpdating(false);
    }
  };

  // Handle Walk-in Submission
  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!guestName) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      await api.post(
        `/admin/walk-in/${selectedTable.table_id}`,
        { customerName: guestName },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setShowModal(false);
      setGuestName("");
      fetchTables();
    } catch (err) {
      alert("Failed to process walk-in");
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsSeated = async (tableId, reservationId) => {
    // If you wrote 'resId' here, it will crash because the parameter above is 'reservationId'
    console.log("Reservation ID is:", reservationId);

    try {
      setUpdating(true);
      const token = localStorage.getItem("token");

      // Ensure you use 'reservationId' here to match the parameter name above
      await api.put(
        `${API_BASE}/reservations/${reservationId}/status`,
        { status: "Seated" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      fetchTables(); // Refresh the grid
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleCheckout = async (e, tableId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to clear this table?")) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      await api.put(
        `/admin/checkout/${tableId}`,
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
    return Math.floor((new Date() - new Date(startTime)) / 60000);
  };

  if (loading && tables.length === 0)
    return (
      <div className="text-center mt-5 p-5 text-dark">
        Loading Floor Plan...
      </div>
    );

  return (
    <div className="container-fluid px-5 py-4 bg-light min-vh-100">
      <div className="d-flex justify-content-between align-items-start mb-5">
        <div>
          <h1 className="fw-bold mb-0 text-dark" style={{ fontSize: "2.5rem" }}>
            Table Management
          </h1>
          <p className="text-muted small">
            Monitor occupancy and manage your restaurant floor
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-dark px-4 fw-bold shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} className="me-1" /> Add Table
          </button>
          <button
            className="btn btn-dark px-4 fw-bold shadow-sm"
            onClick={fetchTables}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Layout"}
          </button>
        </div>
      </div>

      <div className="row g-4">
        {tables.map((table) => {
          const isSeated = table.bridge_status === "seated";
          const isReserved = table.bridge_status === "confirmed"; // Matches your 'INSERT' logic

          let currentStatus = "AVAILABLE";
          let statusColor = "#10b981"; // Green
          let badgeColor = "#ecfdf5";
          let textColor = "#059669";

          // RED: Physically at the restaurant
          if (isSeated) {
            currentStatus = "OCCUPIED";
            statusColor = "#ef4444";
            badgeColor = "#fef2f2";
            textColor = "#dc2626";
          }
          // YELLOW: Someone booked it for today, but hasn't arrived yet
          else if (isReserved) {
            currentStatus = "RESERVED";
            statusColor = "#f59e0b";
            badgeColor = "#fff7ed";
            textColor = "#d97706";
          }

          return (
            <div key={table.table_id} className="col-12 col-md-4 col-lg-3">
              <div
                className="card border-0 shadow-sm h-100 position-relative overflow-hidden hover-card"
                style={{
                  cursor: isSeated || isReserved ? "default" : "pointer",
                }}
                onClick={() =>
                  !isSeated &&
                  !isReserved &&
                  (setSelectedTable(table), setShowModal(true))
                }
              >
                <div
                  style={{ height: "6px", backgroundColor: statusColor }}
                ></div>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h3 className="fw-bold mb-0">
                        Table {table.table_number}
                      </h3>
                      <span className="text-muted small">
                        {table.capacity} Pax Capacity
                      </span>
                    </div>
                    <span
                      className="badge rounded-pill px-3 py-2"
                      style={{
                        backgroundColor: badgeColor,
                        color: textColor,
                        fontSize: "0.65rem",
                      }}
                    >
                      {currentStatus}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-top">
                    {isSeated ? (
                      <div className="d-flex flex-column gap-2 mt-3">
                        <button
                          className="btn btn-sm btn-primary fw-bold"
                          onClick={() =>
                            handleViewBill(
                              table.reservation_id,
                              table.table_number,
                            )
                          }
                        >
                          View Bill / Items
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger fw-bold"
                          onClick={(e) => handleCheckout(e, table.table_id)}
                        >
                          Checkout (Clear Table)
                        </button>
                      </div>
                    ) : isReserved ? (
                      <button
                        className="btn btn-sm btn-warning w-100 fw-bold text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Check if the property name is 'reservation_id' in your SQL query
                          if (table.reservation_id) {
                            handleMarkAsSeated(
                              table.table_id,
                              table.reservation_id,
                            );
                          } else {
                            console.error(
                              "Missing reservation_id for table:",
                              table,
                            );
                            alert("No reservation found for this table.");
                          }
                        }}
                      >
                        Mark Seated
                      </button>
                    ) : (
                      <div className="text-center py-2 text-muted small fw-bold text-uppercase">
                        Start Walk-in
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD NEW TABLE */}
      {showAddModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Add New Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddTableSubmit}>
                <div className="modal-body py-4">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">
                      Table Number / Label
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 15 or T-1"
                      value={newTableData.table_number}
                      onChange={(e) =>
                        setNewTableData({
                          ...newTableData,
                          table_number: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">
                      Seating Capacity
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={newTableData.capacity}
                      onChange={(e) =>
                        setNewTableData({
                          ...newTableData,
                          capacity: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={updating}
                  >
                    Create Table
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* WALK-IN MODAL (Existing) */}
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
                  <label className="form-label small fw-bold">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={updating}
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`.hover-card:hover { transform: translateY(-5px); transition: 0.3s; box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }`}</style>

      {/* MODAL: VIEW BILL */}
      {showBillModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-bottom-0 pt-4 px-4">
                <div>
                  <h5 className="modal-title fw-bold fs-4">
                    Table {activeTableLabel} Bill
                  </h5>
                  <span className="text-muted small">
                    Current running total for this session
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBillModal(false)}
                ></button>
              </div>

              <div className="modal-body px-4">
                {loadingBill ? (
                  <div className="text-center py-5">
                    <div
                      className="spinner-border text-primary"
                      role="status"
                    ></div>
                    <p className="mt-2 text-muted">Calculating bill...</p>
                  </div>
                ) : billItems.length > 0 ? (
                  <div className="bill-container">
                    <div className="table-responsive">
                      <table className="table table-borderless align-middle">
                        <thead className="text-muted small text-uppercase">
                          <tr>
                            <th>Item</th>
                            <th className="text-center">Qty</th>
                            <th className="text-end">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billItems.map((item, idx) => {
                            // Parse customizations (Flavors, Drinks)
                            const customs = item.customizations
                              ? typeof item.customizations === "string"
                                ? JSON.parse(item.customizations)
                                : item.customizations
                              : null;

                            return (
                              <tr key={idx} className="border-bottom-light">
                                <td className="py-3">
                                  <div className="fw-bold text-dark">
                                    {item.name || item.item_name}
                                  </div>
                                  {customs && (
                                    <div
                                      className="small text-primary"
                                      style={{ fontSize: "0.75rem" }}
                                    >
                                      {customs.flavor && (
                                        <span>• {customs.flavor} </span>
                                      )}
                                      {customs.drink && (
                                        <span>• {customs.drink} </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="text-center py-3">
                                  x{item.quantity}
                                </td>
                                <td className="text-end py-3 fw-bold">
                                  ₱
                                  {(item.price * item.quantity).toLocaleString(
                                    undefined,
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Total Calculation */}
                    <div className="bg-light rounded-3 p-3 mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-1 text-muted">
                        <span>Subtotal</span>
                        <span>
                          ₱
                          {billItems
                            .reduce((sum, i) => sum + i.price * i.quantity, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                        <span className="fw-bold fs-5">Amount Due</span>
                        <span className="fw-bold fs-4 text-success">
                          ₱
                          {billItems
                            .reduce((sum, i) => sum + i.price * i.quantity, 0)
                            .toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <Armchair size={48} className="mb-3 opacity-25" />
                    <p>No items have been ordered yet.</p>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top-0 pb-4 px-4 gap-2">
                <button
                  className="btn btn-light px-4 fw-bold"
                  onClick={() => setShowBillModal(false)}
                >
                  Close
                </button>
                <button
                  className="btn btn-dark px-4 fw-bold"
                  onClick={() => {
                    if (window.confirm("Mark as paid and clear table?")) {
                      handleCheckout(null, selectedTable?.table_id); // Reuses your existing checkout logic
                      setShowBillModal(false);
                    }
                  }}
                >
                  Mark Paid & Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableStatus;

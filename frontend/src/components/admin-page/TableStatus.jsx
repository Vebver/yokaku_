import React, { useState, useEffect } from "react";
import api from "../../api";
import {
  Plus,
  Armchair,
  Trash2,
  RefreshCw,
  Clock,
  Users,
  User,
  X,
  Info,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TableStatus = () => {
  const [tables, setTables] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [showBillModal, setShowBillModal] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [loadingBill, setLoadingBill] = useState(false);
  const [activeTableLabel, setActiveTableLabel] = useState("");

  const [newTableData, setNewTableData] = useState({
    table_number: "",
    capacity: 4,
  });

  // --- API FETCH: BOTH FLOOR PLAN AND SCHEDULE ---
   const fetchTables = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    // 1. Fetch Table Status (The Cards)
    try {
      const resTables = await api.get("/admin/table-status", { headers });
      setTables(resTables.data);
    } catch (err) {
      console.error("❌ Floor Plan Error:", err.response?.data || err.message);
    }

    // 2. Fetch Today Schedule (The Top Bar) - Independent
    try {
      const resSchedule = await api.get("/admin/today-schedule", { headers });
      setTodaySchedule(resSchedule.data);
    } catch (err) {
      // If this fails (404), it won't stop the cards from showing
      console.error("❌ Schedule Bar Error:", err.response?.data || err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 15000); // Auto-refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // --- ACTIONS ---
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
      fetchTables();
    } catch (err) {
      alert("Failed to add table.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm("Delete this table permanently?")) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      await api.delete(`/admin/tables/${tableId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTables();
    } catch (err) {
      alert("Cannot delete table with active reservations.");
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsSeated = async (tableId, reservationId) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      await api.put(
        `${API_BASE}/reservations/${reservationId}/status`,
        { status: "Seated" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchTables();
    } catch (err) {
      alert("Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
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

  const handleCheckout = async (tableId) => {
    if (!tableId) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem("token");
      await api.put(`/admin/checkout/${tableId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTables();
    } catch (err) {
      alert("Checkout failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleViewBill = async (reservationId, tableLabel) => {
    if (!reservationId) return;
    setActiveTableLabel(tableLabel);
    setShowBillModal(true);
    setLoadingBill(true);
    try {
      const res = await api.get(`${API_BASE}/reservations/${reservationId}/items`);
      setBillItems(res.data);
    } catch (err) {
      console.error("Error fetching bill", err);
    } finally {
      setLoadingBill(false);
    }
  };

  return (
    <div className="container-fluid px-5 py-4 bg-light min-vh-100">
      
      {/* --- TOP SCHEDULE BAR: Show all bookings for today --- */}
      <div className="mb-4">
        <div className="bg-white p-3 rounded-4 shadow-sm border-start border-4 border-warning">
          <div className="d-flex align-items-center mb-2">
            <Info size={18} className="text-warning me-2" />
            <h6 className="fw-bold mb-0">Today's Reservations Timeline</h6>
          </div>
          <div className="d-flex gap-3 overflow-auto pb-2" style={{ whiteSpace: "nowrap" }}>
            {todaySchedule.length > 0 ? (
              todaySchedule.map((res, i) => (
                <div key={i} className="bg-light px-3 py-2 rounded-3 border small d-inline-block shadow-sm">
                  <span className="fw-bold text-primary">
                    {/* Safe substring check */}
                    {res.reservation_time ? res.reservation_time.substring(0, 5) : "00:00"}
                  </span>
                  :
                  <span className="mx-2 fw-semibold">
                    {res.first_name} {res.last_name}
                  </span>
                  {/* table_names comes from the GROUP_CONCAT in the new SQL query */}
                  <span className="badge bg-dark">Table {res.table_names}</span>
                </div>
              ))
            ) : (
              <span className="text-muted small">No arrivals scheduled for today.</span>
            )}
          </div>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="fw-bold mb-0 text-dark" style={{ fontSize: "2.5rem" }}>Table Management</h1>
          <p className="text-muted small">Live floor occupancy and reservation queuing</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-white border shadow-sm px-3" onClick={fetchTables} disabled={loading}>
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            className={`btn ${deleteMode ? "btn-danger" : "btn-outline-danger"} px-4 fw-bold shadow-sm`}
            onClick={() => setDeleteMode(!deleteMode)}
          >
            <Trash2 size={18} className="me-1" /> {deleteMode ? "Exit Delete" : "Remove Table"}
          </button>
          <button className="btn btn-dark px-4 fw-bold shadow-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={18} className="me-1" /> Add Table
          </button>
        </div>
      </div>

      {/* TABLES GRID */}
      <div className="row g-4">
        {tables.map((table) => {
          const status = table.bridge_status?.toLowerCase() || "available";
          const isSeated = status === "seated";
          const isReserved = status === "confirmed";

          let statusColor = "#10b981"; // Green
          if (isSeated) statusColor = "#ef4444"; // Red
          else if (isReserved) statusColor = "#f59e0b"; // Orange

          return (
            <div key={table.table_id} className="col-12 col-md-4 col-lg-3">
              <div className={`card border-0 shadow-sm h-100 hover-card ${deleteMode ? "shake border border-danger" : ""}`}>
                {deleteMode && (
                  <div className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 5, borderRadius: "inherit" }}>
                    <button className="btn btn-danger btn-lg rounded-circle p-3 shadow" onClick={() => handleDeleteTable(table.table_id)}>
                      <Trash2 size={24} />
                    </button>
                  </div>
                )}
                <div style={{ height: "6px", backgroundColor: statusColor }}></div>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between mb-2">
                    <h3 className="fw-bold mb-0">Table {table.table_number}</h3>
                    <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: `${statusColor}15`, color: statusColor, fontSize: "0.65rem" }}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mb-3 text-muted small"><Users size={14} /> {table.capacity} Pax</div>

                  {/* OCCUPANT BOX */}
                  <div className="bg-light rounded-3 p-3 mb-2 border" style={{ minHeight: "80px" }}>
                    {isSeated || isReserved ? (
                      <div>
                        <div className="fw-bold small text-primary mb-1 text-truncate">
                          <User size={12} /> {(table.first_name || table.customer_name) ? `${table.first_name || ""} ${table.last_name || ""}`.trim() || table.customer_name : "Registered Guest"}
                        </div>
                        <div className="text-muted smaller" style={{ fontSize: "0.7rem" }}>
                          <Clock size={12} /> {table.reservation_time ? `${table.reservation_time.substring(0, 5)} - ${table.end_time?.substring(0, 5) || ""}` : "Active Session"}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted py-2 small italic">Available</div>
                    )}
                  </div>

                  {/* NEXT GUEST WARNING */}
                  <div style={{ height: "35px" }}>
                    {table.queue_count > 1 && (
                      <div className="alert alert-info py-1 px-2 border-0 d-flex align-items-center" style={{ fontSize: "0.7rem" }}>
                        <RefreshCw size={12} className="me-2 animate-spin-slow" />
                        Next: {table.next_reservation_time ? table.next_reservation_time.substring(0, 5) : "Later today"}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    {isSeated ? (
                      <button className="btn btn-sm btn-primary w-100 fw-bold" onClick={() => { setSelectedTable(table); handleViewBill(table.reservation_id, table.table_number); }}>Manage Bill</button>
                    ) : isReserved ? (
                      <button className="btn btn-sm btn-warning w-100 fw-bold text-white" onClick={() => handleMarkAsSeated(table.table_id, table.reservation_id)}>Mark Seated</button>
                    ) : (
                      <button className="btn btn-sm btn-outline-dark w-100 fw-bold" onClick={() => { setSelectedTable(table); setShowModal(true); }}>Walk-in</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD TABLE */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">New Table</h5>
                <X className="cursor-pointer" onClick={() => setShowAddModal(false)} />
              </div>
              <form onSubmit={handleAddTableSubmit}>
                <div className="modal-body py-4">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Table Label</label>
                    <input type="text" className="form-control" value={newTableData.table_number} onChange={(e) => setNewTableData({...newTableData, table_number: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Capacity</label>
                    <input type="number" className="form-control" value={newTableData.capacity} onChange={(e) => setNewTableData({...newTableData, capacity: e.target.value})} required />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="submit" className="btn btn-dark w-100 py-2 fw-bold" disabled={updating}>Create Table</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WALK-IN */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Walk-in: Table {selectedTable?.table_number}</h5>
                <X className="cursor-pointer" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleWalkInSubmit}>
                <div className="modal-body py-4">
                  <label className="form-label small fw-bold">Customer Name</label>
                  <input type="text" className="form-control py-2" value={guestName} onChange={(e) => setGuestName(e.target.value)} required placeholder="Enter guest name..." />
                </div>
                <div className="modal-footer border-0">
                  <button type="submit" className="btn btn-dark w-100 py-2 fw-bold" disabled={updating}>Confirm Entry</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BILLING */}
      {showBillModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pt-4 px-4">
                <h5 className="modal-title fw-bold fs-4">Table {activeTableLabel} Bill</h5>
                <X className="cursor-pointer" onClick={() => setShowBillModal(false)} />
              </div>
              <div className="modal-body px-4">
                {loadingBill ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> :
                billItems.length > 0 ? (
                  <div>
                    <table className="table table-borderless">
                      <thead><tr className="text-muted small"><th>ITEM</th><th className="text-center">QTY</th><th className="text-end">TOTAL</th></tr></thead>
                      <tbody>
                        {billItems.map((item, i) => (
                          <tr key={i}><td className="fw-bold">{item.name || item.item_name}</td><td className="text-center">x{item.quantity}</td><td className="text-end fw-bold">₱{(item.price * item.quantity).toFixed(2)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-light p-3 rounded-3 mt-3">
                      <div className="d-flex justify-content-between fs-4 fw-bold text-success">
                        <span>Total Due</span>
                        <span>₱{billItems.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>
                ) : <div className="text-center py-5 text-muted"><Armchair size={48} className="mb-2 opacity-25"/><p>No orders yet.</p></div>}
              </div>
              <div className="modal-footer border-0 pb-4 px-4">
                <button className="btn btn-danger w-100 py-2 fw-bold" onClick={() => { 
                    if(window.confirm("Complete Payment & Clear Table?")) {
                      handleCheckout(selectedTable?.table_id); 
                      setShowBillModal(false); 
                    }
                }}>Complete Payment & Checkout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .hover-card:hover { transform: translateY(-5px); transition: 0.3s; }
        .shake { animation: shake 0.5s infinite; }
        @keyframes shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(0.5deg); } 75% { transform: rotate(-0.5deg); } 100% { transform: rotate(0deg); } }
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  );
};

export default TableStatus;
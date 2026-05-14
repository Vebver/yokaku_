import React, { useState, useEffect, useCallback } from "react";
import api from "../../api";
import { Plus, Armchair, Trash2, RefreshCw, Clock, Users, User, X, Info } from "lucide-react";

const TableStatus = ({ compact = false }) => {
  const [data, setData] = useState({ tables: [], schedule: [] });
  const [ui, setUi] = useState({ loading: true, updating: false, deleteMode: false, modal: null });
  const [form, setForm] = useState({ guestName: "", tableNum: "", capacity: 4 });
  const [bill, setBill] = useState({ items: [], loading: false, label: "" });
  const [selectedTable, setSelectedTable] = useState(null);

  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const fetchData = useCallback(async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.get("/admin/table-status"),
        api.get("/admin/today-schedule", authHeader())
      ]);
      setData({ tables: tRes.data, schedule: sRes.data });
    } catch (err) { console.error("Fetch Error", err); }
    setUi(prev => ({ ...prev, loading: false }));
  }, []);

  useEffect(() => {
    fetchData();
    const inv = setInterval(fetchData, 15000);
    return () => clearInterval(inv);
  }, [fetchData]);

  const handleAction = async (method, url, body = null, callback = () => {}) => {
    try {
      setUi(p => ({ ...p, updating: true }));
      await api[method](url, body, authHeader());
      fetchData(); callback();
    } catch (err) { alert(err.response?.data?.error || "Action failed"); }
    finally { setUi(p => ({ ...p, updating: false })); }
  };

  const openBill = async (table) => {
    setSelectedTable(table); 
    setBill({ items: [], loading: true, label: table.table_number });
    setUi(p => ({ ...p, modal: 'bill' }));
    try {
      const res = await api.get(`/reservations/${table.reservation_id}/items`, authHeader());
      setBill(p => ({ ...p, items: res.data, loading: false }));
    } catch { setBill(p => ({ ...p, loading: false })); }
  };

  const getStatusCfg = (status) => {
    const cfg = { seated: "#ef4444", confirmed: "#f59e0b", available: "#10b981" };
    const s = status?.toLowerCase() || "available";
    return { color: cfg[s] || cfg.available, label: s.toUpperCase() };
  };

  return (
    <div className={compact ? "p-0" : "container-fluid px-3 px-md-5 py-3 bg-light min-vh-100"}>

      {/* ONLY SHOW HEADER IF NOT COMPACT */}
      {!compact && (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2">
          <div>
            <h1 className="fw-bold mb-0" style={{ fontSize: "2rem" }}>Table Management</h1>
            <p className="text-muted small mb-0">Live Floor occupancy</p>
          </div>
          <div className="d-flex gap-1">
            <button className="btn btn-sm btn-white border shadow-sm" onClick={fetchData}>
              <RefreshCw size={16} className={ui.loading ? "animate-spin" : ""} />
            </button>
            <button className={`btn btn-sm ${ui.deleteMode ? "btn-danger" : "btn-outline-danger"} fw-bold`} onClick={() => setUi(p => ({ ...p, deleteMode: !p.deleteMode }))}>
              <Trash2 size={16} /> <span className="d-none d-sm-inline">{ui.deleteMode ? "Exit" : "Remove"}</span>
            </button>
            <button className="btn btn-sm btn-dark fw-bold" onClick={() => setUi(p => ({ ...p, modal: 'add' }))}>
              <Plus size={16} /> Add Table
            </button>
          </div>
        </div>
      )}

      {/* Responsive Grid */}
      <div className="row g-2 row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5">
  {data.tables.map((t) => {
    const cfg = getStatusCfg(t.bridge_status);
    return (
      <div key={t.table_id} className="col">
        <div className="card border-0 shadow-sm h-100">
          <div style={{ height: "3px", backgroundColor: cfg.color }}></div>
          {/* Change p-2 p-md-3 to just p-2 to remove empty space */}
          <div className="card-body p-2">
            <div className="d-flex justify-content-between align-items-start mb-0">
              <h6 className="fw-bold mb-0 text-truncate" style={{fontSize: '0.85rem'}}>T{t.table_number}</h6>
              <span className="badge rounded-pill" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, fontSize: "0.55rem" }}>{cfg.label}</span>
            </div>
            
            <div className="text-muted mb-1" style={{ fontSize: "0.65rem" }}><Users size={10} /> {t.capacity} Pax</div>
            
            {/* Height reduced from 60px to 45px */}
            <div className="bg-light rounded-2 p-1 mb-2 border text-center d-flex align-items-center justify-content-center" style={{ minHeight: "45px" }}>
              <span className="text-muted fw-medium" style={{fontSize: '0.7rem'}}>
                {t.bridge_status?.toLowerCase() === 'available' ? 'Available' : (t.first_name || t.customer_name)}
              </span>
            </div>
<div className="mt-auto">
  {t.bridge_status?.toLowerCase() === "seated" ? (
    <button className="btn btn-sm btn-primary w-100 py-0 fw-bold" style={{ fontSize: "0.7rem", height: '24px' }} 
            onClick={() => openBill(t)}>Bill</button>
  ) : t.bridge_status?.toLowerCase() === "confirmed" ? (
    <button className="btn btn-sm btn-warning w-100 py-0 fw-bold text-white" style={{ fontSize: "0.7rem", height: '24px' }} 
            onClick={() => handleAction('put', `/reservations/${t.reservation_id}/status`, { status: "Seated" })}>Seat</button>
  ) : (
    <button className="btn btn-sm btn-outline-dark w-100 py-0 fw-bold" style={{ fontSize: "0.7rem", height: '24px' }} 
            onClick={() => { setSelectedTable(t); setUi(p => ({ ...p, modal: 'walkin' })); }}>Walk-in</button>
  )}
</div>
          </div>
        </div>
      </div>
    );
  })}
</div>

      {/* MODALS */}
      {ui.modal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: ui.modal === 'bill' ? "blur(4px)" : "none", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pt-4 px-4">
                <h5 className="modal-title fw-bold">
                  {ui.modal === 'add' ? 'New Table' : ui.modal === 'walkin' ? `Walk-in: Table ${selectedTable?.table_number}` : `Table ${bill.label} Bill`}
                </h5>
                <X className="cursor-pointer" onClick={() => setUi(p => ({ ...p, modal: null }))} />
              </div>
              <div className="modal-body px-4 pb-4">
                {ui.modal === 'add' && (
                  <form onSubmit={(e) => { e.preventDefault(); handleAction('post', '/admin/add-table', { table_number: form.tableNum, capacity: form.capacity }, () => setUi(p => ({ ...p, modal: null }))); }}>
                    <div className="mb-3"><label className="form-label small fw-bold">Table Label</label><input type="text" className="form-control" onChange={e => setForm({...form, tableNum: e.target.value})} required /></div>
                    <div className="mb-3"><label className="form-label small fw-bold">Capacity</label><input type="number" className="form-control" onChange={e => setForm({...form, capacity: e.target.value})} required /></div>
                    <button className="btn btn-dark w-100 py-2 fw-bold" disabled={ui.updating}>Create Table</button>
                  </form>
                )}
                {ui.modal === 'walkin' && (
                  <form onSubmit={(e) => { e.preventDefault(); handleAction('post', `/admin/walk-in/${selectedTable.table_id}`, { customerName: form.guestName }, () => setUi(p => ({ ...p, modal: null }))); }}>
                    <label className="form-label small fw-bold">Customer Name</label><input type="text" className="form-control py-2 mb-3" onChange={e => setForm({...form, guestName: e.target.value})} required placeholder="Guest name..." />
                    <button className="btn btn-dark w-100 py-2 fw-bold" disabled={ui.updating}>Confirm Entry</button>
                  </form>
                )}
                {ui.modal === 'bill' && (
                  bill.loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> :
                  bill.items.length ? (
                    <>
                      <table className="table table-borderless table-sm">
                        <thead><tr className="text-muted small"><th>ITEM</th><th className="text-center">QTY</th><th className="text-end">TOTAL</th></tr></thead>
                        <tbody>{bill.items.map((item, i) => (<tr key={i}><td className="fw-bold small">{item.name || item.item_name}</td><td className="text-center small">x{item.quantity}</td><td className="text-end fw-bold small">₱{(item.price * item.quantity).toFixed(2)}</td></tr>))}</tbody>
                      </table>
                      <div className="bg-light p-3 rounded-3 mt-2 d-flex justify-content-between fs-5 fw-bold text-success">
                        <span>Total Due</span><span>₱{bill.items.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      <button className="btn btn-danger w-100 py-2 fw-bold mt-3" onClick={() => { if(window.confirm("Complete Payment?")) handleAction('put', `/admin/checkout/${selectedTable.table_id}`, {}, () => setUi(p => ({ ...p, modal: null }))); }}>Checkout</button>
                    </>
                  ) : <div className="text-center py-5 text-muted"><Armchair size={48} className="mb-2 opacity-25"/><p>No orders yet.</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.animate-spin { animation: spin 1s linear infinite; } .hover-card:hover { transform: translateY(-3px); transition: 0.3s; } .shake { animation: shake 0.5s infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(0.5deg); } 75% { transform: rotate(-0.5deg); } } .cursor-pointer { cursor: pointer; }`}</style>
    </div>
  );
};

export default TableStatus;
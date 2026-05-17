import React, { useState, useEffect, useCallback } from "react";
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

const TableStatus = ({ compact = false }) => {
  const [data, setData] = useState({ tables: [], schedule: [] });
  const [ui, setUi] = useState({
    loading: true,
    updating: false,
    deleteMode: false,
    modal: null,
  });
  const [form, setForm] = useState({
    guestName: "",
    tableNum: "",
    capacity: 4,
  });
  const [bill, setBill] = useState({ items: [], loading: false, label: "" });
  const [selectedTable, setSelectedTable] = useState(null);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchData = useCallback(async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.get("/admin/table-status"),
        api.get("/admin/today-schedule", authHeader()),
      ]);
      setData({ tables: tRes.data, schedule: sRes.data });
    } catch (err) {
      console.error("Fetch Error", err);
    }
    setUi((prev) => ({ ...prev, loading: false }));
  }, []);

  useEffect(() => {
    fetchData();
    const inv = setInterval(fetchData, 15000);
    return () => clearInterval(inv);
  }, [fetchData]);

  const handleAction = async (
    method,
    url,
    body = null,
    callback = () => {},
  ) => {
    try {
      setUi((p) => ({ ...p, updating: true }));
      await api[method](url, body, authHeader());
      fetchData();
      callback();
    } catch (err) {
      alert(err.response?.data?.error || "Action failed");
    } finally {
      setUi((p) => ({ ...p, updating: false }));
    }
  };

  const openBill = async (table) => {
    setSelectedTable(table);
    setBill({ items: [], loading: true, label: table.table_number });
    setUi((p) => ({ ...p, modal: "bill" }));
    try {
      const res = await api.get(
        `/reservations/${table.reservation_id}/items`,
        authHeader(),
      );
      setBill((p) => ({ ...p, items: res.data, loading: false }));
    } catch {
      setBill((p) => ({ ...p, loading: false }));
    }
  };

  const getStatusCfg = (status) => {
    const cfg = {
      seated: "#ef4444",
      confirmed: "#f59e0b",
      available: "#10b981",
    };
    const s = status?.toLowerCase() || "available";
    return { color: cfg[s] || cfg.available, label: s.toUpperCase() };
  };

  const stats = data.tables.reduce(
    (acc, t) => {
      const s = t.bridge_status?.toLowerCase() || "available";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { available: 0, seated: 0, confirmed: 0 },
  );

  return (
    <div
      className={
        compact
          ? "p-0"
          : "container-fluid px-3 px-md-2 py-2 bg-light min-vh-100"
      }
    >
      {!compact && (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-2 gap-2">
          <div>
            <h1 className="fw-bold mb-0" style={{ fontSize: "2rem" }}>
              Table Management
            </h1>
            <p className="text-muted small mb-0">Live Floor occupancy</p>
          </div>
          <div className="d-flex align-items-center gap-2 border-start ps-3 ms-1">
            <div className="d-flex align-items-center gap-1">
              <span
                className="rounded-circle"
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#10b981",
                }}
              ></span>
              <span
                className="text-muted fw-medium"
                style={{ fontSize: "0.95rem" }}
              >
                {stats.available} Available
              </span>
            </div>
            <div className="d-flex align-items-center gap-1 ms-2">
              <span
                className="rounded-circle"
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#ef4444",
                }}
              ></span>
              <span
                className="text-muted fw-medium"
                style={{ fontSize: "0.95rem" }}
              >
                {stats.seated} Seated
              </span>
            </div>
            <div className="d-flex align-items-center gap-1 ms-2">
              <span
                className="rounded-circle"
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#f59e0b",
                }}
              ></span>
              <span
                className="text-muted fw-medium"
                style={{ fontSize: "0.95rem" }}
              >
                {stats.confirmed} Confirmed
              </span>
            </div>
          </div>
          <div className="d-flex gap-1">
            <button
              className="btn btn-sm btn-white border shadow-sm"
              onClick={fetchData}
            >
              <RefreshCw
                size={16}
                className={ui.loading ? "animate-spin" : ""}
              />
            </button>
            <button
              className={`btn btn-sm ${ui.deleteMode ? "btn-danger" : "btn-outline-danger"} fw-bold`}
              onClick={() =>
                setUi((p) => ({ ...p, deleteMode: !p.deleteMode }))
              }
            >
              <Trash2 size={16} />{" "}
              <span className="d-none d-sm-inline">
                {ui.deleteMode ? "Exit" : "Remove"}
              </span>
            </button>
            <button
              className="btn btn-sm btn-dark fw-bold"
              onClick={() => setUi((p) => ({ ...p, modal: "add" }))}
            >
              <Plus size={16} /> Add Table
            </button>
          </div>
        </div>
      )}

      {/* Responsive Grid */}
      <div className="row g-2 row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-8">
        {data.tables.map((t) => {
          const cfg = getStatusCfg(t.bridge_status);
          return (
            <div key={t.table_id} className="col">
              <div className="card border-0 shadow-sm h-100">
                <div
                  style={{ height: "3px", backgroundColor: cfg.color }}
                ></div>
                <div className="card-body p-2">
                  <div className="d-flex justify-content-between align-items-start mb-0">
                    {/* UPDATED: Changed from T{t.table_number} to Table {t.table_number} */}
                    <h6
                      className="fw-bold mb-0 text-truncate"
                      style={{ fontSize: "0.75rem" }}
                    >
                      Table {t.table_number}
                    </h6>
                    <span
                      className="badge rounded-pill"
                      style={{
                        backgroundColor: `${cfg.color}15`,
                        color: cfg.color,
                        fontSize: "0.5rem",
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div
                    className="text-muted mb-1"
                    style={{ fontSize: "0.6rem" }}
                  >
                    <Users size={9} /> {t.capacity} Pax
                  </div>

                  <div
                    className="bg-light rounded-2 p-1 mb-2 border text-center d-flex align-items-center justify-content-center"
                    style={{ minHeight: "40px" }}
                  >
                    <span
                      className="text-dark fw-bold"
                      style={{ fontSize: "0.65rem" }}
                    >
                      {t.bridge_status?.toLowerCase() === "available"
                        ? "Available"
                        : t.first_name || t.customer_name}
                    </span>
                  </div>

                  <div className="mt-auto">
                    {t.bridge_status?.toLowerCase() === "seated" ? (
                      <button
                        className="btn btn-sm btn-primary w-100 py-0 fw-bold"
                        style={{ fontSize: "0.65rem", height: "22px" }}
                        onClick={() => openBill(t)}
                      >
                        Bill
                      </button>
                    ) : t.bridge_status?.toLowerCase() === "confirmed" ? (
                      <button
                        className="btn btn-sm btn-warning w-100 py-0 fw-bold text-white"
                        style={{ fontSize: "0.65rem", height: "22px" }}
                        onClick={() =>
                          handleAction(
                            "put",
                            `/reservations/${t.reservation_id}/status`,
                            { status: "Seated" },
                          )
                        }
                      >
                        Seat
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-dark w-100 py-0 fw-bold"
                        style={{ fontSize: "0.65rem", height: "22px" }}
                        onClick={() => {
                          setSelectedTable(t);
                          setUi((p) => ({ ...p, modal: "walkin" }));
                        }}
                      >
                        Walk-in
                      </button>
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
        <div
          className="modal show d-block"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: ui.modal === "bill" ? "blur(4px)" : "none",
            zIndex: 2000,
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pt-4 px-4">
                <h5 className="modal-title fw-bold">
                  {ui.modal === "add"
                    ? "New Table"
                    : ui.modal === "walkin"
                      ? `Walk-in: Table ${selectedTable?.table_number}`
                      : `Table ${bill.label} Bill`}
                </h5>
                <X
                  className="cursor-pointer"
                  onClick={() => setUi((p) => ({ ...p, modal: null }))}
                />
              </div>
              <div className="modal-body px-4 pb-4">
                {ui.modal === "add" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAction(
                        "post",
                        "/admin/add-table",
                        {
                          table_number: form.tableNum,
                          capacity: form.capacity,
                        },
                        () => setUi((p) => ({ ...p, modal: null })),
                      );
                    }}
                  >
                    <div className="mb-3">
                      <label className="form-label small fw-bold">
                        Table Label (Number)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        onChange={(e) =>
                          setForm({ ...form, tableNum: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">
                        Max Capacity
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        onChange={(e) =>
                          setForm({ ...form, capacity: e.target.value })
                        }
                        required
                      />
                    </div>
                    <button
                      className="btn btn-dark w-100 py-2 fw-bold"
                      disabled={ui.updating}
                    >
                      Create Table
                    </button>
                  </form>
                )}
                {ui.modal === "walkin" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAction(
                        "post",
                        `/admin/walk-in/${selectedTable.table_id}`,
                        { customerName: form.guestName },
                        () => setUi((p) => ({ ...p, modal: null })),
                      );
                    }}
                  >
                    <label className="form-label small fw-bold">
                      Guest Name
                    </label>
                    <input
                      type="text"
                      className="form-control py-2 mb-3"
                      onChange={(e) =>
                        setForm({ ...form, guestName: e.target.value })
                      }
                      required
                      placeholder="Enter guest name..."
                    />
                    <button
                      className="btn btn-dark w-100 py-2 fw-bold"
                      disabled={ui.updating}
                    >
                      Confirm Entry
                    </button>
                  </form>
                )}
                {ui.modal === "bill" &&
                  (bill.loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary"></div>
                    </div>
                  ) : bill.items.length ? (
                    <>
                      <table className="table table-borderless table-sm">
                        <thead>
                          <tr className="text-muted small">
                            <th>ITEM</th>
                            <th className="text-center">QTY</th>
                            <th className="text-end">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bill.items.map((item, i) => (
                            <tr key={i}>
                              <td className="fw-bold small">
                                {item.name || item.item_name}
                              </td>
                              <td className="text-center small">
                                x{item.quantity}
                              </td>
                              <td className="text-end fw-bold small">
                                ₱{(item.price * item.quantity).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-light p-3 rounded-3 mt-2 d-flex justify-content-between fs-5 fw-bold text-success">
                        <span>Total Due</span>
                        <span>
                          ₱
                          {bill.items
                            .reduce((s, i) => s + i.price * i.quantity, 0)
                            .toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                        </span>
                      </div>
                      <button
                        className="btn btn-danger w-100 py-2 fw-bold mt-3"
                        onClick={() => {
                          if (window.confirm("Complete Payment?"))
                            handleAction(
                              "put",
                              `/admin/checkout/${selectedTable.table_id}`,
                              {},
                              () => setUi((p) => ({ ...p, modal: null })),
                            );
                        }}
                      >
                        Checkout
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <Armchair size={48} className="mb-2 opacity-25" />
                      <p>No orders yet.</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .cursor-pointer { cursor: pointer; }`}</style>
    </div>
  );
};

export default TableStatus;

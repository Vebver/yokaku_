import React, { useState, useEffect, useCallback, useMemo } from "react";
import io from "socket.io-client";
import api, { SOCKET_URL } from "../../api";
import {
  Plus,
  Armchair,
  Trash2,
  Users,
  X,
  Square,
  Monitor,
  UserCheck,
} from "lucide-react";
import { useToast } from "../ToastContext";
import KioskControl from "../shared/KioskControl";
import { useSectionRefresh } from "../shared/sectionRefresh";

// Helpers to extract and compare dates (YYYY-MM-DD format)
const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getTableReservationDateString = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TableStatus = ({ compact = false }) => {
  const { showToast } = useToast();
  const [data, setData] = useState({ tables: [], schedule: [] });
  const [ui, setUi] = useState({
    loading: true,
    updating: false,
    deleteMode: false,
    modal: null,
  });
  const [form, setForm] = useState({
    tableNum: "",
    capacity: 4,
  });
  const [bill, setBill] = useState({ items: [], loading: false, label: "" });
  const [selectedTable, setSelectedTable] = useState(null);
  // Tick every second to refresh the event countdown timers
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.get("/admin/table-status"),
        api.get("/admin/today-schedule"),
      ]);

      setData({
        tables: tRes.data || [],
        schedule: sRes.data || [],
      });
    } catch (err) {
      console.error("Fetch Error", err);
    } finally {
      setUi((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("table_updated", () => {
      console.log("🔄 Real-time Update: Table status changed via Kiosk");
      fetchData();
    });

    socket.on("new_notification", (notif) => {
      if (notif.title?.toLowerCase().includes("payment")) {
        fetchData();
      }
    });

    return () => {
      socket.off("table_updated");
      socket.off("new_notification");
      socket.disconnect();
    };
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    const inv = setInterval(fetchData, 15000);
    return () => clearInterval(inv);
  }, []);

  // Reload on the shared admin refresh button in the top bar.
  useSectionRefresh(() => {
    fetchData();
  });

  const handleAction = async (
    method,
    url,
    body = null,
    callback = () => {},
  ) => {
    try {
      setUi((p) => ({ ...p, updating: true }));
      await api[method](url, body);
      fetchData();
      callback();
    } catch (err) {
      showToast(err.response?.data?.error || "Action failed");
    } finally {
      setUi((p) => ({ ...p, updating: false }));
    }
  };

  // Only admins and cashiers/staff are allowed to interrupt or stop a kiosk
  // (e.g. when it is stuck on a bugged screen) or to open a new one.
  // The API enforces the same rule.
  const canControlKiosk = useMemo(() => {
    const role =
      localStorage.getItem("role") || localStorage.getItem("userRole") || "";
    return ["admin", "cashier", "staff"].includes(role.toLowerCase());
  }, []);

  const openBill = async (table) => {
    setSelectedTable(table);
    setBill({ items: [], loading: true, label: table.table_number });
    setUi((p) => ({ ...p, modal: "bill" }));
    try {
      const res = await api.get(`/reservations/${table.reservation_id}/items`);
      setBill((p) => ({ ...p, items: res.data, loading: false }));
    } catch {
      setBill((p) => ({ ...p, loading: false }));
    }
  };

  // Open the kiosk for the reservation sitting on this table so the guest's
  // screen jumps straight into the menu. The kiosk type must match the
  // reservation type or the backend rejects the request.
  const openKiosk = async (t) => {
    if (!canControlKiosk) {
      showToast("Only admins or cashiers can open a kiosk.");
      return;
    }
    if (!t.reservation_id) {
      showToast("No reservation linked to this table.");
      return;
    }
    const kioskType =
      String(t.reservation_type || "").toLowerCase() === "event"
        ? "event"
        : "single";
    if (
      !window.confirm(
        `Open the kiosk for reservation ${t.reservation_id} (Table ${t.table_number})? The guest's screen will go straight to the menu.`,
      )
    ) {
      return;
    }
    try {
      setUi((p) => ({ ...p, updating: true }));
      await api.post("/admin/set-kiosk-reservation", {
        reservationId: t.reservation_id,
        kioskType,
      });
      showToast("Kiosk opened for this reservation.", "success");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to open the kiosk.");
    } finally {
      setUi((p) => ({ ...p, updating: false }));
    }
  };

  // Manually flag the physical table as taken (walk-in seated by hand, or an
  // event that has already started) without needing a linked reservation.
  const makeOccupied = async (t) => {
    if (
      !window.confirm(
        `Mark Table ${t.table_number} as occupied?`,
      )
    ) {
      return;
    }
    try {
      setUi((p) => ({ ...p, updating: true }));
      await api.put(`/admin/table-status/${t.table_id}`, {
        status: "occupied",
      });
      showToast(`Table ${t.table_number} marked as occupied.`, "success");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update the table.");
    } finally {
      setUi((p) => ({ ...p, updating: false }));
    }
  };

  const getStatusCfg = (status) => {
    const cfg = {
      seated: "#ef4444",
      confirmed: "#f59e0b",
      available: "#10b981",
      // tables.status is set to 'occupied' by the backend; without this the
      // card fell through to the green "AVAILABLE" styling.
      occupied: "#ef4444",
    };
    const s = status?.toLowerCase() || "available";
    return { color: cfg[s] || cfg.available, label: s.toUpperCase() };
  };

  // Stop the kiosk session. When a tableId is supplied only THAT table is
  // released, so stopping a kiosk during an event does not free every table
  // the event has reserved (a walk-in may still be seated on one of them).
  const stopKiosk = async (reservationId, tableId, e) => {
    if (e) e.stopPropagation();
    if (!canControlKiosk) {
      showToast("Only admins or cashiers can stop the kiosk.");
      return;
    }
    if (!reservationId) {
      showToast("No reservation linked to this kiosk.");
      return;
    }
    if (
      !window.confirm(
        `Interrupt this kiosk? The customer session will be returned to the kiosk home screen. Use this if the kiosk is stuck or showing an error.${
          tableId ? " Only this table will be released." : ""
        }`,
      )
    ) {
      return;
    }
    try {
      setUi((p) => ({ ...p, updating: true }));
      await api.post("/admin/stop-kiosk", {
        reservationId,
        tableId: tableId || null,
      });
      showToast(
        tableId
          ? "Kiosk stopped. This table is now available."
          : "Kiosk stopped. Returning to home screen.",
        "success",
      );
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to stop kiosk.");
    } finally {
      setUi((p) => ({ ...p, updating: false }));
    }
  };

  const todayStr = getTodayDateString();

  // Stats calculation matches visual grid (ignoring future reservations)
  const stats = data.tables.reduce(
    (acc, t) => {
      let s = t.bridge_status?.toLowerCase() || "available";
      const resDate = getTableReservationDateString(
        t.reservation_date || t.date || t.resDate,
      );

      if (s === "available" && (t.table_status || "").toLowerCase() === "occupied") {
        s = "occupied";
      }

      if (s === "confirmed" && resDate !== todayStr) {
        s = "available";
      }
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { available: 0, seated: 0, confirmed: 0, occupied: 0 },
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
            <p className="text-muted small mb-0">Check Floor occupancy</p>
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
          let activeStatus = t.bridge_status?.toLowerCase() || "available";
          // A table physically marked occupied but with no live binding still
          // counts as taken, otherwise it renders as an empty green card.
          if (activeStatus === "available" && (t.table_status || "").toLowerCase() === "occupied") {
            activeStatus = "occupied";
          }
          const resDate = getTableReservationDateString(
            t.reservation_date || t.date || t.resDate,
          );

          // Force status to "available" if reservation is for a future date
          if (activeStatus === "confirmed" && resDate !== todayStr) {
            activeStatus = "available";
          }

          const cfg = getStatusCfg(activeStatus);
          const isAvailable = activeStatus === "available";

          // Determine if this table has an active kiosk reservation
          const isKioskActive =
            String(t.is_kiosk_active) === "1" || t.is_kiosk_active === 1;

          return (
            <div key={t.table_id} className="col">
              <div className="card border-0 shadow-sm h-100">
                <div
                  style={{ height: "3px", backgroundColor: cfg.color }}
                ></div>
                <div className="card-body p-2 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-0">
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
                       {ui.deleteMode && (
                        <button
                          className="btn btn-sm btn-link text-danger p-0 ms-2 border-0"
                          style={{ lineHeight: 1 }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents triggering openBill or actions below
                            if (
                              window.confirm(
                                `Are you sure you want to permanently delete Table ${t.table_number}?`,
                              )
                            ) {
                              handleAction(
                                "delete",
                                `/admin/tables/${t.table_id}`,
                              );
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div
                      className="text-muted mb-1"
                      style={{ fontSize: "0.6rem" }}
                    >
                      <Users size={9} /> {t.capacity} Pax
                    </div>

                    {/* OCCUPANT */}
                    <div
                      className="bg-light rounded-2 p-1 mb-2 border text-center d-flex align-items-center justify-content-center overflow-hidden"
                      style={{ minHeight: "40px" }}
                    >
                      <span
                        className="text-dark fw-bold text-truncate"
                        style={{ fontSize: "0.65rem" }}
                      >
                        {isAvailable
                          ? "Vacant"
                          : t.first_name || t.customer_name}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    {isKioskActive && canControlKiosk && (
                      <button
                        className="btn btn-sm btn-danger w-100 py-0 fw-bold mb-1"
                        style={{ fontSize: "0.65rem", height: "22px" }}
                        onClick={(e) =>
                          stopKiosk(t.reservation_id, t.table_id, e)
                        }
                        title="Stop the kiosk on this table only"
                      >
                        <Square size={10} className="me-1" /> Stop Kiosk
                      </button>
                    )}
                    {isKioskActive && !canControlKiosk && (
                      <div
                        className="text-muted text-center fw-bold mb-1 py-1 border border-dashed rounded"
                        style={{ fontSize: "0.6rem" }}
                        title="Only admins and cashiers can stop the kiosk"
                      >
                        Kiosk Active
                      </div>
                    )}
                    {activeStatus === "occupied" ? (
                      // A table with no live reservation binding: staff marked it
                      // taken by hand, so offer the kiosk shortcut only when a
                      // reservation is actually linked.
                      <div className="d-flex gap-1">
                        {!isKioskActive && canControlKiosk && t.reservation_id && (
                          <button
                            className="btn btn-sm btn-primary w-100 py-0 fw-bold"
                            style={{ fontSize: "0.65rem", height: "22px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openKiosk(t);
                            }}
                            title="Open the kiosk for the guest on this table"
                          >
                            <Monitor size={10} className="me-1" /> Open Kiosk
                          </button>
                        )}
                        {canControlKiosk && (
                          <button
                            className="btn btn-sm btn-outline-secondary py-0 fw-bold flex-shrink-0"
                            style={{ fontSize: "0.65rem", height: "22px" }}
                            onClick={() =>
                              handleAction(
                                "put",
                                `/admin/table-status/${t.table_id}`,
                                { status: "available" },
                              )
                            }
                            title="Release this table"
                          >
                            Free
                          </button>
                        )}
                      </div>
                    ) : activeStatus === "seated" ? (
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-primary w-100 py-0 fw-bold"
                          style={{ fontSize: "0.65rem", height: "22px" }}
                          onClick={() => openBill(t)}
                        >
                          View Orders
                        </button>
                        {!isKioskActive && canControlKiosk && t.reservation_id && (
                          <button
                            className="btn btn-sm btn-dark py-0 fw-bold flex-shrink-0"
                            style={{ fontSize: "0.65rem", height: "22px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openKiosk(t);
                            }}
                            title="Open the kiosk for the guest on this table"
                          >
                            <Monitor size={10} className="me-1" /> Kiosk
                          </button>
                        )}
                      </div>
                    ) : activeStatus === "confirmed" ? (
                      <div className="d-flex gap-1">
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
                          Seat Guest
                        </button>
                        {!isKioskActive && canControlKiosk && t.reservation_id && (
                          <button
                            className="btn btn-sm btn-dark py-0 fw-bold flex-shrink-0"
                            style={{ fontSize: "0.65rem", height: "22px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openKiosk(t);
                            }}
                            title="Open the kiosk for this reservation"
                          >
                            <Monitor size={10} className="me-1" /> Kiosk
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary flex-grow-1 py-0 fw-bold border-dashed text-muted bg-white"
                          style={{ fontSize: "0.65rem", height: "22px" }}
                          disabled
                        >
                          Vacant
                        </button>
                        <button
                          className="btn btn-sm btn-danger py-0 fw-bold flex-shrink-0"
                          style={{ fontSize: "0.65rem", height: "22px" }}
                          onClick={() => makeOccupied(t)}
                          title="Mark this table as occupied"
                        >
                          <UserCheck size={10} className="me-1" /> Occupied
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!compact && <KioskControl />}

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
                    : `Table ${bill.label} - Read-Only Bill Preview`}
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

                      const parsedCapacity = Number(form.capacity);
                      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 7) {
                        window.alert("Capacity must be between 1 and 7.");
                        return;
                      }

                      handleAction(
                        "post",
                        "/admin/add-table",
                        {
                          table_number: form.tableNum,
                          capacity: parsedCapacity,
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
                        min="1"
                        max="7"
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
                            <th className="text-center">QUANTITY</th>
                            <th className="text-end">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bill.items.map((item, i) => (
                            <tr key={i}>
                              <td className="fw-bold small">
                                {item.item_name ||
                                  item.menu_name ||
                                  item.package_name}
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
                        <span>Current Bill Sum</span>
                        <span>
                          ₱
                          {bill.items
                            .reduce((s, i) => s + i.price * i.quantity, 0)
                            .toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                        </span>
                      </div>
                      <div className="alert alert-info border-0 mt-3 small py-2 text-center text-info bg-info bg-opacity-10">
                        Please settle payment and checkout under the{" "}
                        <strong>Billing & Transactions</strong> panel.
                      </div>
                      <button
                        className="btn btn-outline-dark w-100 py-2 fw-bold"
                        onClick={() => setUi((p) => ({ ...p, modal: null }))}
                      >
                        Close Preview
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

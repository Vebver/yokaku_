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
  Link,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "../ToastContext";
import { useConfirmation } from "../ConfirmationContext";
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

// "18:00:00" / "6:00 PM" -> "6:00 PM". Times already carrying a meridiem are
// returned untouched.
const formatTimeDisplay = (timeStr) => {
  const value = String(timeStr || "").trim();
  if (!value) return "";
  if (value.includes("AM") || value.includes("PM")) return value;

  const [hours, minutes] = value.split(":");
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return value;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes || "00"} ${ampm}`;
};

const TableStatus = ({ compact = false }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [data, setData] = useState({
    tables: [],
    schedule: [],
    reservations: [],
  });
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
  // Live reservations offered in the "link this table" picker.
  const [linkCandidates, setLinkCandidates] = useState([]);
  // Tick every second to refresh the event countdown timers
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, sRes, rRes] = await Promise.all([
        api.get("/admin/table-status"),
        api.get("/admin/today-schedule"),
        api.get("/admin/incoming-reservations"),
      ]);

      setData({
        tables: tRes.data || [],
        schedule: sRes.data || [],
        reservations: rRes.data || [],
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

  // Link a free table to a party's existing reservation so both cards read as
  // one session. Picking the party is a modal listing every live reservation,
  // so staff never type an id and never join the wrong table.
  const linkTable = async (table) => {
    try {
      setUi((p) => ({ ...p, updating: true, modal: "link", linkTable: table }));
      const res = await api.get("/admin/kiosk-reservations");
      const rows = res.data?.reservations || [];
      setLinkCandidates(rows);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to load reservations.");
    } finally {
      setUi((p) => ({ ...p, updating: false }));
    }
  };

  const confirmLink = async (candidate) => {
    const table = ui.linkTable;
    if (!table) return;
    try {
      setUi((p) => ({ ...p, updating: true }));
      await api.post(`/admin/table-status/${table.table_id}/link`, {
        reservationId: candidate.reservation_id,
      });
      showToast(
        `Table ${table.table_number} linked to ${candidate.first_name || candidate.reservation_id}.`,
        "success",
      );
      setUi((p) => ({ ...p, modal: null, linkTable: null }));
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to link the table.");
    } finally {
      setUi((p) => ({ ...p, updating: false }));
    }
  };

  // Open the kiosk for the session sitting on this table. A kiosk belongs to
  // the reservation, not the table, so linked tables arm together.
  const openKioskForSession = async (reservationId) => {
    if (!canControlKiosk) {
      showToast("Only admins or cashiers can open a kiosk.");
      return;
    }
    if (!(await confirm({
      title: "Open kiosk session",
      message: `Open the kiosk for reservation ${reservationId}? The guest's screen will go straight to the menu.`,
      confirmLabel: "Open kiosk",
      variant: "primary",
    }))) {
      return;
    }
    try {
      setUi((p) => ({ ...p, updating: true }));
      await api.post("/admin/set-kiosk-reservation", {
        reservationId,
        kioskType: "single",
      });
      showToast("Kiosk opened for this session.", "success");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to open the kiosk.");
    } finally {
      setUi((p) => ({ ...p, updating: false }));
    }
  };

  // Manually flag the physical table as taken (a walk-in seated by hand)
  // without needing a linked reservation.
  const makeOccupied = async (t) => {
    if (!(await confirm({
      title: "Mark table occupied",
      message: `Mark Table ${t.table_number} as occupied?`,
      confirmLabel: "Mark occupied",
      variant: "primary",
    }))) {
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
  // released, so stopping one seat does not free the whole party.
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
    if (!(await confirm({
      title: "Stop kiosk session",
      message: `Interrupt this kiosk? The customer session will be returned to the kiosk home screen. Use this if the kiosk is stuck or showing an error.${
        tableId ? " Only this table will be released." : ""
      }`,
      confirmLabel: "Stop kiosk",
    }))) {
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

  // Group tables by reservation so a party spanning several tables stays
  // visually together. The grouping is presentational only: every control
  // lives on the individual table card.
  const sessions = useMemo(() => {
    const groups = new Map();
    data.tables.forEach((t) => {
      const key = t.reservation_id ? String(t.reservation_id).trim() : "__free__";
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          reservationId: t.reservation_id || null,
          firstName: t.first_name || t.customer_name || null,
          endTime: t.end_time || null,
          isKioskActive: false,
          tables: [],
        });
      }
      const g = groups.get(key);
      g.tables.push(t);
      if (String(t.is_kiosk_active) === "1" || t.is_kiosk_active === 1) {
        g.isKioskActive = true;
      }
    });

    // Sessions with a kiosk or a real reservation first, unassigned last.
    return [...groups.values()].sort((a, b) => {
      if (a.reservationId && !b.reservationId) return -1;
      if (!a.reservationId && b.reservationId) return 1;
      if (a.isKioskActive !== b.isKioskActive) return a.isKioskActive ? -1 : 1;
      return 0;
    });
  }, [data.tables]);

  // The items endpoint UNIONs the down payment in as a synthetic "Reservation
  // Fee" line. That is payment information, not food, so it is excluded from
  // this read-only bill preview — same rule the Billing drawer applies.
  const billItems = bill.items.filter((item) => {
    const lineType = String(item?.line_type ?? "").toLowerCase();
    if (lineType === "downpayment" || lineType === "payment") return false;
    const name = String(item?.name || item?.item_name || "")
      .trim()
      .toLowerCase();
    return name !== "reservation fee";
  });

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

      {!compact && (
        <section className="card border-0 shadow-sm mb-3">
          <div className="card-body p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <h2 className="h6 fw-bold mb-1">Incoming Reservations</h2>
                <p className="text-muted small mb-0">Upcoming bookings, sorted by date and time</p>
              </div>
            </div>
            <div className="table-responsive">
                            <table className="table table-sm table-hover align-middle mb-0">
                              <thead className="text-muted small">
                                <tr><th>Customer</th><th>Guests</th><th>Date</th><th>Time</th><th>Status</th><th>Allergy</th></tr>
                              </thead>
                              <tbody>
                                {data.reservations.length === 0 ? (
                                  <tr><td colSpan="6" className="text-center text-muted py-3">No upcoming reservations.</td></tr>
                                ) : data.reservations.map((reservation) => (
                                  <tr key={reservation.reservation_id}>
                                    <td className="fw-semibold">{reservation.customer_name || "Guest"}</td>
                                    <td>{reservation.num_guests || "—"}</td>
                                    <td>{reservation.reservation_date || "—"}</td>
                                    <td className="fw-semibold text-nowrap">
                                      {/* Both the real start and end times, e.g.
                                          "6:00 PM – 8:00 PM". The duration is never
                                          computed from a hardcoded value. */}
                                      {formatTimeDisplay(reservation.reservation_time)}
                                      {reservation.end_time
                                        ? ` – ${formatTimeDisplay(reservation.end_time)}`
                                        : ""}
                                    </td>
                                    <td><span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">{reservation.status}</span></td>
                                    {/* Exact customer-entered allergy text; empty means the
                                        customer gave none, so we say so rather than implying
                                        an allergy exists. */}
                                    <td className="text-truncate" style={{ maxWidth: "200px" }}>
                                      {reservation.allergy ? (
                                        <span
                                          className="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold"
                                          title={reservation.allergy}
                                        >
                                          {reservation.allergy}
                                        </span>
                                      ) : (
                                        <span className="text-muted small">None provided</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
          </div>
        </section>
      )}

      {/* Floor. Tables that share a reservation are grouped so a party that
          spans several tables stays visually together, but each card keeps its
          own controls: the kiosk, orders, and linking all live on the card. */}
      {/* The former per-session group banner ("RESERVATION / Guest / ID /
          N tables") sat directly above the cards and repeated information each
          card already shows, which read as a second, duplicate header. Every
          card carries its own occupant name and times, so the banner was
          removed rather than restyled. */}
      {sessions.map((s) => (
        <div key={s.key} className="mb-3">
          <div className="row g-2 row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-8">
            {s.tables.map((t) => {
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

          // The card shows kiosk state as a marker only; the switch itself is on
          // the session header.
          const isKioskActive =
            String(t.is_kiosk_active) === "1" || t.is_kiosk_active === 1;

          // Exact customer-provided allergy text for the current occupant.
          // Empty / "None" is normalised to "" so the card shows nothing.
          const occupantAllergy = (() => {
            const raw = t.allergy ?? t.allergies ?? t.allergy_note ?? "";
            const value = String(raw).trim();
            if (!value || value.toLowerCase() === "none") return "";
            return value;
          })();

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
                      {isKioskActive && (
                        <Monitor
                          size={11}
                          className="ms-1 flex-shrink-0"
                          style={{ color: "#dc2626" }}
                          title="Kiosk is live on this table"
                        />
                      )}
                       {ui.deleteMode && (
                        <button
                          className="btn btn-sm btn-link text-danger p-0 ms-2 border-0"
                          style={{ lineHeight: 1 }}
                          onClick={async (e) => {
                            e.stopPropagation(); // Prevents triggering openBill or actions below
                            if (!(await confirm({
                              title: "Delete table",
                              message: `Permanently delete Table ${t.table_number}?`,
                              confirmLabel: "Delete table",
                            }))) return;
                            handleAction("delete", `/admin/tables/${t.table_id}`);
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

                    {/* ALLERGY — shows the exact text the customer entered on the
                        reservation, not a generic "has allergy" flag. Blank or
                        "None" renders nothing so nothing misleading is implied. */}
                    {!isAvailable && occupantAllergy && (
                      <div
                        className="rounded-2 border border-danger-subtle bg-danger-subtle text-danger px-1 py-1 mb-2 d-flex align-items-start gap-1"
                        title={`Customer allergy: ${occupantAllergy}`}
                      >
                        <AlertTriangle
                          size={10}
                          className="flex-shrink-0 mt-1"
                        />
                        <span
                          className="fw-bold"
                          style={{ fontSize: "0.55rem", lineHeight: "1.3" }}
                        >
                          {occupantAllergy}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions stack vertically so Activate/Stop Kiosk always
                      sits directly above the table's own action. */}
                  <div className="mt-auto d-flex flex-column gap-1">
                    {/* Kiosk switch for this card's session. Stop is scoped to
                        this table so closing one seat of a party leaves the rest
                        of the session armed. */}
                    {canControlKiosk && t.reservation_id && (
                      isKioskActive ? (
                        <button
                          className="btn btn-sm btn-danger w-100 py-0 fw-bold table-card-action"
                          onClick={(e) =>
                            stopKiosk(t.reservation_id, t.table_id, e)
                          }
                          title="Stop the kiosk on this table only"
                        >
                          <Square size={10} className="me-1" /> Stop Kiosk
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-dark w-100 py-0 fw-bold table-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            openKioskForSession(t.reservation_id);
                          }}
                          title="Activate the kiosk for this reservation"
                        >
                          <Monitor size={10} className="me-1" /> Activate Kiosk
                        </button>
                      )
                    )}
                    {isKioskActive && !canControlKiosk && (
                      <div
                        className="text-muted text-center fw-bold py-1 border border-dashed rounded"
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
                        {canControlKiosk && (
                          <button
                            className="btn btn-sm btn-outline-secondary py-0 fw-bold flex-grow-1 table-card-action table-card-primary-action"
                            onClick={() =>
                              handleAction(
                                "put",
                                `/admin/table-status/${t.table_id}`,
                                { status: "available" },
                              )
                            }
                            title="Release this table"
                          >
                            Free Table
                          </button>
                        )}
                      </div>
                    ) : activeStatus === "seated" ? (
                      <div className="d-flex flex-wrap gap-1 table-card-actions">
                        <button
                          className="btn btn-sm btn-primary w-100 py-0 fw-bold table-card-action table-card-primary-action"
                          onClick={() => openBill(t)}
                        >
                          View Orders
                        </button>
                      </div>
                    ) : activeStatus === "confirmed" ? (
                      <div className="d-flex flex-wrap gap-1 table-card-actions">
                        <button
                          className="btn btn-sm btn-warning w-100 py-0 fw-bold text-white table-card-action table-card-primary-action"
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
                      </div>
                    ) : (
                      // Free table: only the two real actions. The former
                      // disabled "Vacant" placeholder was removed because it was
                      // dead UI that squeezed the buttons on narrow cards.
                      <div className="table-card-actions">
                        <button
                          className="btn btn-sm btn-dark py-0 fw-bold table-card-action table-card-primary-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            linkTable(t);
                          }}
                          title="Add this table to an existing party's reservation"
                        >
                          <Link size={11} className="me-1" /> Link
                        </button>
                        <button
                          className="btn btn-sm btn-danger py-0 fw-bold table-card-action table-card-primary-action"
                          onClick={() => makeOccupied(t)}
                          title="Mark this table as occupied"
                        >
                          Mark as Occupied
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
        </div>
      ))}

      {/* The Kiosk Control panel was removed: every session now shows its own
          Activate/Stop button on its table card, so the panel was duplicate. */}

      {/* MODALS */}
      {ui.modal && (
        <div
          className="admin-confirm-backdrop"
          style={{ zIndex: 2000 }}
        >
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-content">
              <div className="admin-confirm-header">
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <h5 className="modal-title admin-confirm-title">
                    {ui.modal === "add"
                      ? "New Table"
                      : ui.modal === "link"
                      ? `Link Table ${ui.linkTable?.table_number} to a Party`
                      : `Table ${bill.label} - Read-Only Bill Preview`}
                  </h5>
                </div>
                <X
                  className="cursor-pointer flex-shrink-0 ms-auto"
                  onClick={() => setUi((p) => ({ ...p, modal: null }))}
                />
              </div>
              <div className="admin-confirm-body text-start">
                {ui.modal === "add" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();

                      const parsedCapacity = Number(form.capacity);
                      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 7) {
                        showToast("Capacity must be between 1 and 7.", "error");
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
                {/* LINK: pick who is at the other table. Clicking a row moves
                    the table into that party's session. */}
                {ui.modal === "link" && (
                  <div>
                    <p className="text-muted small">
                      Which party is using Table {ui.linkTable?.table_number}?
                      The table joins their reservation so it shares one kiosk
                      and one bill.
                    </p>
                    <div
                      className="d-flex flex-column gap-2"
                      style={{ maxHeight: "320px", overflowY: "auto" }}
                    >
                      {linkCandidates.length === 0 && (
                        <div className="text-center text-muted small py-4">
                          No reservations found.
                        </div>
                      )}
                      {linkCandidates.map((c) => (
                        <button
                          key={c.reservation_id}
                          className="btn btn-light border text-start d-flex align-items-center gap-2 py-2"
                          disabled={ui.updating}
                          onClick={() => confirmLink(c)}
                        >
                          <Users size={16} className="flex-shrink-0" />
                          <span className="flex-grow-1">
                            <span className="d-block fw-bold small">
                              {c.first_name || "Guest"}{" "}
                              {c.last_name || ""}
                            </span>
                            <span className="d-block text-muted" style={{ fontSize: "0.65rem" }}>
                              {c.reservation_id}
                              {c.table_names ? ` • Tables ${c.table_names}` : ""}
                              {c.reservation_date ? ` • ${c.reservation_date}` : ""}
                            </span>
                          </span>
                          <Link size={14} className="text-muted flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                    <button
                      className="btn btn-outline-dark w-100 py-2 fw-bold mt-3"
                      onClick={() =>
                        setUi((p) => ({ ...p, modal: null, linkTable: null }))
                      }
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {ui.modal === "bill" &&
                  (bill.loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary"></div>
                    </div>
                  ) : billItems.length ? (
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
                          {billItems.map((item, i) => (
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
                          {billItems
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

    </div>
  );
};

export default TableStatus;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Monitor, RefreshCw } from "lucide-react";
import io from "socket.io-client";
import api, { SOCKET_URL } from "../../api";
import { useToast } from "../ToastContext";
import { useConfirmation } from "../ConfirmationContext";

const KioskControl = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [activeKiosks, setActiveKiosks] = useState([]);
  const [loadingKiosks, setLoadingKiosks] = useState(false);
  // Admin-entered event / reservation ID for arming a kiosk by hand.
  const [manualId, setManualId] = useState("");
  const [arming, setArming] = useState(false);
  // Scheduled events seen today, shown as reference info for staff.
  const [events, setEvents] = useState([]);
  // Collapsed by default so the panel stays compact.
  const [showReservations, setShowReservations] = useState(false);
  // Only admins and cashiers/staff may interrupt or stop a kiosk.
  const canControlKiosk = useMemo(() => {
    const role =
      localStorage.getItem("role") || localStorage.getItem("userRole") || "";
    return ["admin", "cashier", "staff"].includes(role.toLowerCase());
  }, []);

  // Active bookings (any date) so staff can look up the ID they need to arm a
  // kiosk. Read-only info — no controls here.
  const [tick, setTick] = useState(0);
  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get("/admin/kiosk-reservations");
      const rows = res.data?.reservations || res.data || [];
      setEvents(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const armById = async () => {
    const id = manualId.trim();
    if (!id) return;
    if (!(await confirm({
      title: "Start kiosk screen",
      message: `Arm the kiosk for ${id}? It will open straight into the menu when the guest arrives.`,
      confirmLabel: "Start screen",
      variant: "primary",
    }))) {
      return;
    }
    setArming(true);
    try {
      await api.post("/admin/set-kiosk-reservation", {
        reservationId: id,
        kioskType: "event",
      });
      showToast("Kiosk armed.", "success");
      setManualId("");
      await fetchEvents();
    } catch (err) {
      showToast(
        err.response?.data?.error || "Failed to arm the kiosk. Check the ID.",
      );
    } finally {
      setArming(false);
    }
  };

  // Live kiosk sessions, detected automatically. Kiosks register themselves
  // when a customer places an order, so staff never pick a session by hand —
  // a reserved guest types their ID on the kiosk, and events are started by
  // seating the group on the dashboard.
  const fetchActiveKiosks = useCallback(async () => {
    setLoadingKiosks(true);
    try {
      const response = await api.get("/admin/active-kiosks");
      setActiveKiosks(response.data?.kiosks || []);
    } catch (error) {
      console.error("Failed to fetch active kiosks:", error);
    } finally {
      setLoadingKiosks(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveKiosks();
    // A kiosk appearing/being stopped should show up without waiting a full poll.
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socket.on("table_updated", fetchActiveKiosks);
    socket.on("kiosk_stopped", fetchActiveKiosks);
    const poll = setInterval(fetchActiveKiosks, 5000);
    return () => {
      clearInterval(poll);
      socket.off("table_updated", fetchActiveKiosks);
      socket.off("kiosk_stopped", fetchActiveKiosks);
      socket.disconnect();
    };
  }, [fetchActiveKiosks]);

  const stopKioskById = async (id) => {
    if (!id) return;
    if (!(await confirm({
      title: "Stop kiosk session",
      message: "Interrupt and close this kiosk session? The customer will be returned to the kiosk home screen.",
      confirmLabel: "Stop kiosk",
    })))
      return;
    try {
      await api.post("/admin/stop-kiosk", { reservationId: id });
      showToast("Kiosk stopped. Returning to home screen.", "success");
      await fetchActiveKiosks();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to stop kiosk.");
    }
  };

  const describeKiosk = (k) => {
    const name = [k.first_name, k.last_name].filter(Boolean).join(" ").trim();
    const kind = k.is_event ? "Event" : k.is_walkin ? "Walk-in" : "Reservation";
    return {
      kind,
      name: name || "(no name)",
      table: k.table_names || null,
      id: k.reservation_id,
    };
  };

  // Re-render every second so the "ends in" column counts down live.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Seconds left until a booking's scheduled end time. Falls back to 0 when
  // no end time was set, so the column is hidden rather than showing 00:00:00.
  const secondsUntilEnd = (endTime) => {
    if (!endTime) return null;
    const [h, m, s] = String(endTime).split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const target = new Date();
    target.setHours(h, m, s || 0, 0);
    return Math.floor((target - new Date()) / 1000);
  };

  const formatCountdown = (secs) => {
    if (secs === null || secs <= 0) return "Ended";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Role gate sits after every hook so the hook order never changes.
  if (!canControlKiosk) {
    return (
      <section className="card shadow-sm border-0 p-4 mb-4">
        <div className="d-flex align-items-center text-muted">
          <Monitor className="me-2" size={24} />
          <p className="mb-0 small fw-bold">
            Kiosk Control is restricted to admins and cashiers.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card shadow-sm border-0 p-3 mb-4">
      <div className="d-flex align-items-center gap-2 mb-2">
        <Monitor className="text-primary" size={18} />
        <h6 className="fw-bold mb-0">Kiosk Control</h6>
        <span className="text-muted small">
          &mdash; nothing to do normally, screens appear here on their own.
        </span>
      </div>

      {loadingKiosks && activeKiosks.length === 0 ? (
        <span className="small text-muted">Checking...</span>
      ) : activeKiosks.length === 0 ? (
        <span className="small text-muted">
          No screens running. If one gets stuck, it will show here.
        </span>
      ) : (
        <div className="d-flex flex-column gap-1">
          {activeKiosks.map((k) => {
            const info = describeKiosk(k);
            return (
              <div
                className="d-flex align-items-center justify-content-between border rounded-2 px-2 py-1"
                key={k.reservation_id}
              >
                <span className="small text-truncate">
                  <strong>{info.name}</strong>
                  <span className="text-muted">
                    {info.table ? ` \u00b7 Table ${info.table}` : ""}
                    {` \u00b7 ${info.kind}`}
                  </span>
                </span>
                <button
                  className="btn btn-sm btn-danger fw-bold flex-shrink-0 ms-2"
                  style={{ fontSize: "0.7rem" }}
                  onClick={() => stopKioskById(k.reservation_id)}
                  title="Return this screen to the start page"
                >
                  Stop
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ARM A KIOSK BY ID — for events and groups that have not started yet */}
      <div className="border-top pt-2">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="small text-muted">
            <strong>Event only</strong> &mdash; code:
          </span>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: "150px" }}
            placeholder="RES-0412"
            value={manualId}
            onChange={(e) => setManualId(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") armById();
            }}
            disabled={arming}
          />
          <button
            className="btn btn-primary btn-sm fw-bold"
            onClick={armById}
            disabled={!manualId.trim() || arming}
          >
            {arming ? "Starting..." : "Start screen"}
          </button>
          <button
            className="btn btn-sm btn-link p-0 text-decoration-none small"
            onClick={() => setShowReservations((v) => !v)}
          >
            {showReservations ? "Hide" : "Find"} codes
          </button>
        </div>

        {showReservations && (
        <div className="mt-2">
        {events.length === 0 ? (
          <p className="small text-muted mb-0">No active reservations.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 small">
              <thead className="text-muted">
                <tr style={{ fontSize: "0.65rem" }}>
                  <th className="fw-bold p-1">Code</th>
                  <th className="fw-bold p-1">Guest</th>
                  <th className="fw-bold p-1">Date</th>
                  <th className="fw-bold p-1">Time</th>
                  <th className="fw-bold p-1">Tables</th>
                  <th className="fw-bold p-1">Ends in</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.reservation_id}>
                    <td className="p-1" style={{ fontFamily: "monospace" }}>
                      <button
                        className="btn btn-link btn-sm p-0 border-0 text-decoration-none"
                        onClick={() => {
                          setManualId(String(ev.reservation_id || "").toUpperCase());
                          showToast("Code filled in above. Now press Start their screen.");
                        }}
                        title="Use this code"
                      >
                        {ev.reservation_id}
                      </button>
                    </td>
                    <td className="p-1">
                      {[ev.first_name, ev.last_name]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || "—"}
                    </td>
                    <td className="p-1">{ev.reservation_date || "—"}</td>
                    <td className="p-1">
                      {ev.formatted_time || ev.reservation_time || "—"}
                    </td>
                    <td className="p-1">{ev.table_names || "—"}</td>
                    <td className="p-1">
                      {(() => {
                        const secs = secondsUntilEnd(ev.end_time);
                        if (secs === null) return "—";
                        return (
                          <span
                            className="badge fw-bold"
                            style={{
                              fontSize: "0.6rem",
                              backgroundColor:
                                secs > 0 ? "#fff3cd" : "#f8d7da",
                              color: secs > 0 ? "#b8860b" : "#dc3545",
                            }}
                            title={
                              ev.formatted_end_time
                                ? `Scheduled to end at ${ev.formatted_end_time}`
                                : undefined
                            }
                          >
                            {formatCountdown(secs)}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
        )}
      </div>
    </section>
  );
};

export default KioskControl;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Monitor, Users } from "lucide-react";
import io from "socket.io-client";
import api, { SOCKET_URL } from "../../api";
import { useToast } from "../ToastContext";

const KioskControl = () => {
  const { showToast } = useToast();
  const [reservationId, setReservationId] = useState("");
  const [kioskType, setKioskType] = useState("single");
  const [activeKiosk, setActiveKiosk] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const response = await api.get("/admin/kiosk-candidates");
      setCandidates(response.data?.candidates || []);
    } catch (error) {
      console.error("Failed to fetch kiosk candidates:", error);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const fetchKioskStatus = useCallback(async () => {
    try {
      const response = await api.get("/reservations/active-kiosk");
      const isOpen = ["event_active", "single_active"].includes(response.data?.mode);
      setActiveKiosk(isOpen ? response.data.reservation : null);
    } catch (error) {
      console.error("Failed to fetch kiosk status:", error);
    }
  }, []);

  useEffect(() => {
    fetchKioskStatus();
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socket.on("table_updated", fetchKioskStatus);
    return () => {
      socket.off("table_updated", fetchKioskStatus);
      socket.disconnect();
    };
  }, [fetchKioskStatus]);

  // Selecting a session auto-syncs the type so the admin never sends a
  // mismatched pairing that the backend would reject.
  const handleSelect = (event) => {
    const value = event.target.value;
    setReservationId(value);
    const chosen = candidates.find((c) => c.reservation_id === value);
    if (chosen) setKioskType(chosen.is_event ? "event" : "single");
  };

  const grouped = useMemo(() => {
    const events = candidates.filter((c) => c.is_event);
    const walkins = candidates.filter((c) => !c.is_event && c.is_walkin);
    const reservations = candidates.filter((c) => !c.is_event && !c.is_walkin);
    return [
      { label: "Events", items: events },
      { label: "Walk-ins", items: walkins },
      { label: "Reservations", items: reservations },
    ].filter((g) => g.items.length > 0);
  }, [candidates]);

  const renderOption = (c) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    const parts = [
      c.is_event ? "Event" : c.is_walkin ? "Walk-in" : "Reservation",
      name || "(no name)",
      c.table_names ? `Table ${c.table_names}` : null,
      c.reservation_id,
    ].filter(Boolean);
    return `${parts.join(" - ")}${String(c.is_kiosk_active) === "1" ? " [KIOSK OPEN]" : ""}`;
  };

  const openKiosk = async () => {
    if (!reservationId.trim()) return;
    try {
      await api.post("/admin/set-kiosk-reservation", {
        reservationId: reservationId.trim(),
        kioskType,
      });
      showToast(
        `Kiosk opened for ${kioskType === "event" ? "event" : "single customer"} session.`,
        "success",
      );
      setReservationId("");
      await fetchKioskStatus();
      await fetchCandidates();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to open kiosk.");
    }
  };

  const closeKiosk = async () => {
    if (!activeKiosk?.reservation_id) {
      showToast("No kiosk session is currently open.");
      return;
    }
    if (!window.confirm("Close the current kiosk session?")) return;
    try {
      await api.post("/admin/stop-kiosk", {
        reservationId: activeKiosk.reservation_id,
      });
      showToast("Kiosk closed successfully.", "success");
      await fetchKioskStatus();
      await fetchCandidates();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to close kiosk.");
    }
  };

  return (
    <section className="card shadow-sm border-0 p-4 mb-4">
      <div className="d-flex align-items-center mb-3">
        <Monitor className="text-primary me-2" size={24} />
        <div>
          <h5 className="fw-bold mb-0">Kiosk Control</h5>
          <p className="small text-muted mb-0">Open an event, walk-in, or single-customer kiosk session.</p>
        </div>
      </div>
      <div className="row g-3 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label small fw-bold">Session type</label>
          <select className="form-select" value={kioskType} onChange={(event) => setKioskType(event.target.value)}>
            <option value="single">Single customer</option>
            <option value="event">Event</option>
          </select>
        </div>
        <div className="col-12 col-md-5">
          <label className="form-label small fw-bold">Session</label>
          <select
            className="form-select"
            value={reservationId}
            onChange={handleSelect}
          >
            <option value="">
              {loadingCandidates
                ? "Loading sessions..."
                : candidates.length === 0
                  ? "No active events, walk-ins, or reservations"
                  : "Select a session (event, walk-in, or reservation)"}
            </option>
            {grouped.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((c) => (
                  <option key={c.reservation_id} value={c.reservation_id}>
                    {renderOption(c)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="form-text">
            The session type updates automatically to match your selection.{" "}
            {candidates.length} active session(s) available.
          </div>
        </div>
        <div className="col-12 col-md-3">
          <button className="btn btn-primary w-100 fw-bold" onClick={openKiosk} disabled={!reservationId.trim()}>
            Open Kiosk
          </button>
        </div>
      </div>
      <div className="mt-3 pt-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span className="small text-muted">
          {activeKiosk
            ? `Open: ${activeKiosk.reservation_id} (${activeKiosk.reservation_type === "event" ? "Event" : "Single customer"})`
            : "No kiosk session is open."}
        </span>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary btn-sm fw-bold"
            onClick={fetchCandidates}
            disabled={loadingCandidates}
          >
            <Users size={14} className="me-1" /> Refresh
          </button>
          <button className="btn btn-outline-danger btn-sm fw-bold" onClick={closeKiosk} disabled={!activeKiosk}>
            Close Kiosk
          </button>
        </div>
      </div>
    </section>
  );
};

export default KioskControl;

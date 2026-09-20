import React, { useCallback, useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import api from "../../api";
import { useToast } from "../ToastContext";

const KioskControl = () => {
  const { showToast } = useToast();
  const [reservationId, setReservationId] = useState("");
  const [kioskType, setKioskType] = useState("single");
  const [activeKiosk, setActiveKiosk] = useState(null);

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
  }, [fetchKioskStatus]);

  const openKiosk = async () => {
    if (!reservationId.trim()) return;
    try {
      await api.post("/admin/set-kiosk-reservation", {
        reservationId: reservationId.trim(),
        kioskType,
      });
      showToast(`Kiosk opened for ${kioskType} reservation.`, "success");
      setReservationId("");
      await fetchKioskStatus();
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
          <p className="small text-muted mb-0">Open an event or single-customer kiosk session.</p>
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
          <label className="form-label small fw-bold">Reservation ID</label>
          <input
            className="form-control"
            placeholder="Enter reservation ID"
            value={reservationId}
            onChange={(event) => setReservationId(event.target.value)}
          />
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
        <button className="btn btn-outline-danger btn-sm fw-bold" onClick={closeKiosk} disabled={!activeKiosk}>
          Close Kiosk
        </button>
      </div>
    </section>
  );
};

export default KioskControl;

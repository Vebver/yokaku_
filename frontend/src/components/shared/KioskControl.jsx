import React, { useCallback, useEffect, useState } from "react";
import { Monitor, Armchair, CircleCheck } from "lucide-react";
import io from "socket.io-client";
import api, { SOCKET_URL } from "../../api";
import { useToast } from "../ToastContext";

const KioskControl = () => {
  const { showToast } = useToast();
  const [reservationId, setReservationId] = useState("");
  const [kioskType, setKioskType] = useState("single");
  const [activeKiosk, setActiveKiosk] = useState(null);
  const [occupiedTables, setOccupiedTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);

  // Tables marked as occupied from the Table Status page. These are floor
  // state only - a manual occupancy is not a kiosk session, so the two are
  // tracked separately.
  const fetchOccupiedTables = useCallback(async () => {
    try {
      const response = await api.get("/admin/table-status");
      const tables = response.data?.tables || [];
      setOccupiedTables(
        tables.filter((table) => {
          const status = (table.bridge_status || table.status || "available")
            .toString()
            .toLowerCase();
          return status !== "available" && status !== "maintenance";
        }),
      );
    } catch (error) {
      console.error("Failed to fetch table occupancy:", error);
    } finally {
      setTablesLoading(false);
    }
  }, []);

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
    fetchOccupiedTables();
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socket.on("table_updated", fetchKioskStatus);
    socket.on("table_updated", fetchOccupiedTables);
    return () => {
      socket.off("table_updated", fetchKioskStatus);
      socket.off("table_updated", fetchOccupiedTables);
      socket.disconnect();
    };
  }, [fetchKioskStatus, fetchOccupiedTables]);

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
      await fetchOccupiedTables();
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
      await fetchOccupiedTables();
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

      {/* READ-ONLY: tables currently marked as occupied on the floor */}
      <div className="mt-3 pt-3 border-top">
        <div className="d-flex align-items-center gap-2 mb-2">
          <Armchair className="text-secondary" size={18} />
          <h6 className="fw-bold mb-0">Occupied Tables</h6>
          <span className="badge rounded-pill bg-secondary-subtle text-secondary border ms-auto">
            {occupiedTables.length}
          </span>
        </div>
        <p className="small text-muted mb-2">
          Read-only view. Marking a table as occupied does not open a kiosk session.
        </p>
        {tablesLoading ? (
          <div className="text-center py-2">
            <div className="spinner-border spinner-border-sm text-secondary" role="status">
              <span className="visually-hidden">Loading tables...</span>
            </div>
          </div>
        ) : occupiedTables.length === 0 ? (
          <div className="d-flex align-items-center gap-2 small text-muted bg-light rounded px-3 py-2">
            <CircleCheck size={16} className="text-success flex-shrink-0" />
            All tables are available.
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-2">
            {occupiedTables.map((table) => (
              <span
                key={table.table_id}
                className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 fw-normal"
              >
                Table {table.table_number}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default KioskControl;

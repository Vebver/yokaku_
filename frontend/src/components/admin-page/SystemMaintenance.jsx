import React, {useState, useEffect} from "react";
import axios from "axios";
import {
  FileSpreadsheet,
  Archive,
  RefreshCcw,
  AlertTriangle,
  Settings,
  FileText,
  Monitor,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SystemMaintenance = () => {
  const [kioskReservationId, setKioskReservationId] = useState("");
  const runTask = async (endpoint, taskName, warningText) => {
    const confirmed = window.confirm(
      `Action: ${taskName}\n\n${warningText}\n\nAre you sure?`,
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/admin/${endpoint}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("Success: " + res.data.message);

      if (endpoint === "reset") {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.error || "Action failed"));
    }
  };

  const handleSetKioskReservation = async () => {
  if (!kioskReservationId.trim()) return;

  const confirmed = window.confirm(`Assign reservation ID ${kioskReservationId} to the kiosk?`);
  if (!confirmed) return;

  try {
    const token = localStorage.getItem("token");
    const res = await axios.post(
      `${API_BASE}/admin/set-kiosk-reservation`, 
      { reservationId: kioskReservationId }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    alert("Success: " + res.data.message);
    setKioskReservationId(""); // Reset input on success
  } catch (err) {
    console.error(err);
    alert("Error: " + (err.response?.data?.error || "Action failed"));
  }
};

  const downloadFinancialPdf = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/admin/export-financial-pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Financial_Report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Financial PDF download failed", err);
      alert("Failed to download financial PDF. Please check your connection.");
    }
  };

  const downloadReport = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/admin/export-csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Business_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download report. Please check your connection.");
    }
  };

  return (
    <div
      className="card shadow-sm border-0 p-3 p-md-4 mt-4"
      style={{ borderRadius: "12px" }}
    >
      <div className="d-flex align-items-center mb-4">
        <Settings className="text-secondary me-2" size={24} />
        <h5 className="mb-0 fw-bold text-dark">System Maintenance</h5>
      </div>

      {/* Grid: 2 columns on tablets/desktops, 1 column on mobile */}
      <div className="row g-4">
        {/* 1. EXPORT DATA */}
        <div className="col-12 col-md-6">
          <div
            className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between"
            style={{ borderRadius: "8px" }}
          >
            <div>
              <FileSpreadsheet className="text-success mb-3" size={40} />
              <h5 className="fw-bold">Export Records</h5>
              <p className="small text-muted mb-4">
                Download all reservation history as an Excel-friendly CSV file.
              </p>
            </div>
            <button
              onClick={downloadReport}
              className="btn btn-success btn-lg w-100 py-3 fw-bold shadow-sm"
              style={{ borderRadius: "8px" }}
            >
              Download Report
            </button>
          </div>
        </div>

        {/* 2. ASSIGNING KIOSK ID*/}
        <div className="col-12 col-md-6">
          <div
            className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between"
            style={{ borderRadius: "8px" }}
          >
            <div>
              <Monitor className="text-primary mb-3" size={40} />
              <h5 className="fw-bold">Set Kiosk Reservation</h5>
              <p className="small text-muted mb-4">
                Input the reservation ID to route this specific record directly
                to the active kiosk.
              </p>
              <input
                type="text"
                className="form-control mb-3 text-center"
                placeholder="Enter Reservation ID"
                value={kioskReservationId}
                onChange={(e) => setKioskReservationId(e.target.value)}
                style={{
                  borderRadius: "8px",
                  maxWidth: "250px",
                  margin: "0 auto",
                }}
              />
            </div>
            <button
              onClick={handleSetKioskReservation}
              className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-sm"
              style={{ borderRadius: "8px" }}
              disabled={!kioskReservationId.trim()}
            >
              Assign to Kiosk
            </button>
          </div>
        </div>

        {/* 3. FINANCIAL PDF */}
        <div className="col-12 col-md-6">
          <div
            className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between"
            style={{ borderRadius: "8px" }}
          >
            <div>
              <FileText className="text-danger mb-3" size={40} />
              <h5 className="fw-bold">Export Financial PDF</h5>
              <p className="small text-muted mb-4">
                Download revenue trend (weekly/monthly/yearly).
              </p>
            </div>
            <button
              onClick={downloadFinancialPdf}
              className="btn btn-danger btn-lg w-100 py-3 fw-bold shadow-sm"
              style={{ borderRadius: "8px" }}
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* 4. SHIFT RESET */}
        <div className="col-12 col-md-6">
          <div
            className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between"
            style={{ borderRadius: "8px" }}
          >
            <div>
              <RefreshCcw className="text-warning mb-3" size={40} />
              <h5 className="fw-bold">Table Reset</h5>
              <p className="small text-muted mb-4">
                Prepares the floor for a new shift by resetting all table
                statuses.
              </p>
            </div>
            <button
              onClick={() =>
                runTask(
                  "reset",
                  "Table Reset",
                  "Warning: This will set all tables to 'Available'.",
                )
              }
              className="btn btn-warning btn-lg w-100 py-3 fw-bold shadow-sm text-dark"
              style={{ borderRadius: "8px" }}
            >
              Start New Shift
            </button>
          </div>
        </div>
      </div>

      {/* Warning Footer */}
      <div className="mt-4 p-3 bg-light rounded border-start border-warning border-4 d-flex align-items-center">
        <AlertTriangle size={20} className="text-warning me-3 flex-shrink-0" />
        <span className="small text-muted">
          <b>Manager Note:</b> System actions are permanent. We recommend{" "}
          <b>Exporting Records</b> regularly for your physical archives.
        </span>
      </div>
    </div>
  );
};

export default SystemMaintenance;

import React, { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  Archive,
  RefreshCcw,
  AlertTriangle,
  Settings,
  FileText,
  Monitor,
  Database,
  Download,
  Upload,
  Trash2,
  RotateCcw,
} from "lucide-react";
import api from "../../api";
import { useToast } from "../ToastContext";

const SystemMaintenance = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { showToast } = useToast();
  const [kioskReservationId, setKioskReservationId] = useState("");
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // ──────────────────────────────────────────────
  // BACKUP & RESTORE FUNCTIONS
  // ──────────────────────────────────────────────

  const fetchBackups = useCallback(async () => {
    setBackupsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/admin/backups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBackups(res.data.backups || []);
    } catch (err) {
      console.error("Failed to fetch backups:", err);
    } finally {
      setBackupsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    const confirmed = window.confirm(
      `Create Database Backup?\n\nThis will dump the entire database into a .sql file.\n\nProceed?`,
    );
    if (!confirmed) return;

    setCreatingBackup(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        `/admin/backup`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast("Success: " + res.data.message, "success");
      await fetchBackups(); // Refresh the list
    } catch (err) {
      console.error(err);
      showToast(
        "Error: " + (err.response?.data?.error || "Failed to create backup"),
      );
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename) => {
    const confirmed = window.confirm(
      `⚠️ DANGER: Restore Database from Backup\n\n` +
        `File: ${filename}\n\n` +
        `This will OVERWRITE all current data with the data from this backup.\n` +
        `This action CANNOT be undone!\n\n` +
        `Are you absolutely sure you want to proceed?`,
    );
    if (!confirmed) return;

    // Second confirmation for safety
    const doubleConfirmed = window.confirm(
      `FINAL WARNING: Restore ${filename}?\n\n` +
        `All current data will be replaced. Type "OK" to confirm.`,
    );
    if (!doubleConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        `/admin/backup/restore/${filename}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast("Success: " + res.data.message, "success");
    } catch (err) {
      console.error(err);
      showToast(
        "Error: " + (err.response?.data?.error || "Failed to restore backup"),
      );
    }
  };

  const handleDeleteBackup = async (filename) => {
    const confirmed = window.confirm(
      `Delete Backup: ${filename}?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await api.delete(`/admin/backup/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Success: " + res.data.message, "success");
      await fetchBackups(); // Refresh the list
    } catch (err) {
      console.error(err);
      showToast(
        "Error: " + (err.response?.data?.error || "Failed to delete backup"),
      );
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/admin/backup/download/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download backup failed", err);
      showToast("Failed to download backup file.");
    }
  };

  const runTask = async (endpoint, taskName, warningText) => {
    const confirmed = window.confirm(
      `Action: ${taskName}\n\n${warningText}\n\nAre you sure?`,
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        `/admin/${endpoint}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast("Success: " + res.data.message, "success");

      if (endpoint === "reset") {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      showToast("Error: " + (err.response?.data?.error || "Action failed"));
    }
  };

  const handleSetKioskReservation = async () => {
    if (!kioskReservationId.trim()) return;

    const confirmed = window.confirm(
      `Assign reservation ID ${kioskReservationId} to the kiosk?`,
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        `/admin/set-kiosk-reservation`,
        { reservationId: kioskReservationId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast("Success: " + res.data.message);
      setKioskReservationId(""); // Reset input on success
    } catch (err) {
      console.error(err);
      showToast("Error: " + (err.response?.data?.error || "Action failed"));
    }
  };

  const downloadFinancialPdf = async () => {
    if (!startDate || !endDate) {
      showToast("Please select both start and end dates.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/admin/export-financial-pdf`, {
        params: { startDate, endDate }, // Send dates as query parameters
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Financial_Report_${startDate}_to_${endDate}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Financial PDF download failed", err);
      showToast("Failed to download financial PDF.");
    }
  };

  const downloadReport = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/admin/export-csv`, {
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
      showToast("Failed to download report. Please check your connection.");
    }
  };

  // ──────────────────────────────────────────────
  // FORMAT SIZE HELPER
  // ──────────────────────────────────────────────
  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
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
  {/* 1. EXPORT DATA (CSV) */}
  <div className="col-12 col-md-6">
    <div
      className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between"
      style={{ borderRadius: "8px" }}
    >
      <div>
        <FileSpreadsheet className="text-success mb-3" size={40} />
        <h5 className="fw-bold">Export Records</h5>
        <p className="small text-muted mb-4">
          Download all reservation history as a CSV file for spreadsheet analysis.
        </p>
      </div>
      <button
        onClick={downloadReport}
        className="btn btn-success btn-lg w-100 py-3 fw-bold shadow-sm"
        style={{ borderRadius: "8px" }}
      >
        Download CSV
      </button>
    </div>
  </div>

  {/* 2. ASSIGNING KIOSK ID */}
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

  {/* 3. FINANCIAL PDF (With Date Range Design) */}
  <div className="col-12 col-md-6">
    <div
      className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between"
      style={{ borderRadius: "8px" }}
    >
      <div>
        <FileText className="text-danger mb-3" size={40} />
        <h5 className="fw-bold">Financial Performance Report</h5>
        <p className="small text-muted mb-3">
          Select a date range to generate a professional revenue analysis.
        </p>
        
        {/* Date Selection Area */}
        <div className="row g-2 mb-4">
          <div className="col-6">
            <label className="text-start d-block small fw-bold text-muted mb-1">START DATE</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ borderRadius: "8px", fontSize: "0.9rem" }}
            />
          </div>
          <div className="col-6">
            <label className="text-start d-block small fw-bold text-muted mb-1">END DATE</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ borderRadius: "8px", fontSize: "0.9rem" }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={downloadFinancialPdf}
        className="btn btn-danger btn-lg w-100 py-3 fw-bold shadow-sm"
        style={{ borderRadius: "8px" }}
        disabled={!startDate || !endDate}
      >
        Generate PDF Report
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

      {/* ─── SECTION 2: DATABASE BACKUP & RESTORE ─── */}
      <div className="mt-5">
        <div className="d-flex align-items-center mb-3">
          <Database className="text-secondary me-2" size={24} />
          <h5 className="mb-0 fw-bold text-dark">Database Backup & Restore</h5>
        </div>

        <div className="card bg-white shadow-sm border-0" style={{ borderRadius: "12px" }}>
          <div className="card-body p-4">
            {/* Create Backup Button */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <p className="text-muted small mb-0">
                Create a full SQL dump of the database or restore from a previous backup.
              </p>
              <button
                onClick={handleCreateBackup}
                className="btn btn-secondary btn-lg fw-bold shadow-sm px-4"
                style={{ borderRadius: "8px" }}
                disabled={creatingBackup}
              >
                {creatingBackup ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Database className="me-2" size={20} />
                    Create Backup
                  </>
                )}
              </button>
            </div>

            {/* Backup List */}
            {backupsLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-secondary" role="status">
                  <span className="visually-hidden">Loading backups...</span>
                </div>
                <p className="text-muted mt-2 mb-0">Loading backups...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-4 bg-light rounded" style={{ borderRadius: "8px" }}>
                <Archive className="text-muted mb-2" size={40} />
                <p className="text-muted mb-0">No backups found. Create your first backup above.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="fw-bold">Filename</th>
                      <th className="fw-bold">Size</th>
                      <th className="fw-bold">Created</th>
                      <th className="fw-bold text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.filename}>
                        <td className="small text-break" style={{ maxWidth: "300px" }}>
                          <Archive className="text-secondary me-2" size={16} />
                          {backup.filename}
                        </td>
                        <td className="small text-muted">{formatSize(backup.size_bytes)}</td>
                        <td className="small text-muted">{formatDate(backup.created_at)}</td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            {/* Download */}
                            <button
                              onClick={() => handleDownloadBackup(backup.filename)}
                              className="btn btn-outline-primary btn-sm"
                              title="Download Backup"
                              style={{ borderRadius: "6px" }}
                            >
                              <Download size={16} />
                            </button>
                            {/* Restore */}
                            <button
                              onClick={() => handleRestoreBackup(backup.filename)}
                              className="btn btn-outline-warning btn-sm"
                              title="Restore from this backup"
                              style={{ borderRadius: "6px" }}
                            >
                              <RotateCcw size={16} />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteBackup(backup.filename)}
                              className="btn btn-outline-danger btn-sm"
                              title="Delete Backup"
                              style={{ borderRadius: "6px" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning Footer */}
      <div className="mt-4 p-3 bg-light rounded border-start border-warning border-4 d-flex align-items-center">
        <AlertTriangle size={20} className="text-warning me-3 flex-shrink-0" />
        <span className="small text-muted">
          <b>Note:</b> System actions are permanent. We recommend{" "}
          <b>creating database backups</b> regularly and <b>Exporting Records</b> for your physical archives.
        </span>
      </div>
    </div>
  );
};

export default SystemMaintenance;

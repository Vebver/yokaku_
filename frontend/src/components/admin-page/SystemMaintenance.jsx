import React, { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  RefreshCcw,
  FileText,
  Download,
  Trash2,
  RotateCcw,
} from "lucide-react";
import api from "../../api";
import "../../Style/SystemMaintenance.css";
import { useToast } from "../ToastContext";
import { useConfirmation } from "../ConfirmationContext";

const SystemMaintenance = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportPeriod, setReportPeriod] = useState("");
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [creatingLocalBackup, setCreatingLocalBackup] = useState(false);
  const [localBackupFile, setLocalBackupFile] = useState(null);
  const [restoringLocalBackup, setRestoringLocalBackup] = useState(false);

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
    if (!(await confirm({
      title: "Create database backup",
      message: "This will dump the entire database into a .sql file.",
      confirmLabel: "Create backup",
      variant: "primary",
    }))) return;

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
    if (!(await confirm({
      title: "Restore database backup",
      message: `Restore ${filename}? This will overwrite all current data and cannot be undone.`,
      confirmLabel: "Restore database",
      requireText: "RESTORE",
    }))) return;

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

  const handleRestoreLocalBackup = async () => {
    if (!localBackupFile) return;
    if (!(await confirm({
      title: "Restore database backup",
      message: `Restore ${localBackupFile.name}? This will overwrite all current data and cannot be undone.`,
      confirmLabel: "Restore database",
      requireText: "RESTORE",
    }))) return;

    const formData = new FormData();
    formData.append("backup", localBackupFile);
    setRestoringLocalBackup(true);
    try {
      const response = await api.post("/admin/backup/restore-local", formData);
      showToast(response.data.message, "success");
      setLocalBackupFile(null);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to restore local backup.");
    } finally {
      setRestoringLocalBackup(false);
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!(await confirm({
      title: "Delete backup",
      message: `Delete ${filename}? This action cannot be undone.`,
      confirmLabel: "Delete backup",
    }))) return;

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
      return true;
    } catch (err) {
      console.error("Download backup failed", err);
      showToast("Failed to download backup file.");
      return false;
    }
  };

  const handleCreateAndDownloadBackup = async () => {
    setCreatingLocalBackup(true);
    try {
      const response = await api.post("/admin/backup", {});
      const downloaded = await handleDownloadBackup(response.data.filename);
      await fetchBackups();
      if (downloaded) showToast("Backup created and downloaded to this device.", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to create backup.");
    } finally {
      setCreatingLocalBackup(false);
    }
  };

  const runTask = async (endpoint, taskName, warningText) => {
    if (!(await confirm({
      title: taskName,
      message: warningText,
      confirmLabel: "Proceed",
    }))) return;

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

  const selectReportPeriod = (period) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

    setReportPeriod(period);
    if (period === "monthly") {
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-${String(lastDay).padStart(2, "0")}`);
    } else {
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
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
      className="system-maintenance-container card shadow-sm border-0 p-3 p-md-4 mt-4"
      style={{ borderRadius: "12px" }}
    >
      <div className="d-flex align-items-center mb-4">
        <h5 className="mb-0 fw-bold text-dark">System Maintenance</h5>
      </div>

      {/* Grid: 3 columns on desktops, 2 on tablets, 1 on mobile */}
      <div className="row g-4">
  {/* 1. EXPORT DATA (CSV) */}
  <div className="col-12 col-md-6 col-lg-4">
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

  {/* 2. FINANCIAL PDF (With Date Range Design) */}
  <div className="col-12 col-md-6 col-lg-4">
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

  {/* 3. SHIFT RESET */}
  <div className="col-12 col-md-6 col-lg-4">
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
        <div className="card bg-white shadow-sm border-0" style={{ borderRadius: "12px" }}>
          <div className="card-body p-4">
            {/* Create Backup Button */}
            <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
              <div className="d-flex align-items-start">
                <div>
                  <h5 className="mb-1 fw-bold text-dark">Database Backup &amp; Restore</h5>
                  <p className="text-muted small mb-0">
                    Create a full SQL dump of the database or restore from a previous backup.
                  </p>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  onClick={handleCreateBackup}
                  className="btn btn-secondary btn-lg fw-bold shadow-sm px-4"
                  style={{ borderRadius: "8px" }}
                  disabled={creatingBackup || creatingLocalBackup}
                >
                  {creatingBackup ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      Create Backup
                    </>
                  )}
                </button>
                <button
                  onClick={handleCreateAndDownloadBackup}
                  className="btn btn-outline-primary btn-lg fw-bold px-4"
                  style={{ borderRadius: "8px" }}
                  disabled={creatingBackup || creatingLocalBackup}
                >
                  {creatingLocalBackup ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Preparing Download...
                    </>
                  ) : (
                    <>
                      Create &amp; Download
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="row g-2 align-items-end mb-4">
              <div className="col-12 col-md-8">
                <label className="form-label small fw-bold" htmlFor="local-backup-file">Restore from device</label>
                <input
                  id="local-backup-file"
                  className="form-control"
                  type="file"
                  accept=".sql,application/sql"
                  onChange={(event) => setLocalBackupFile(event.target.files?.[0] || null)}
                />
              </div>
              <div className="col-12 col-md-4">
                <button
                  className="btn btn-outline-danger w-100 fw-bold"
                  type="button"
                  onClick={handleRestoreLocalBackup}
                  disabled={!localBackupFile || restoringLocalBackup}
                >
                  {restoringLocalBackup ? "Restoring..." : "Restore Local Backup"}
                </button>
              </div>
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
                        <td className="small text-break" style={{ maxWidth: "300px" }} data-label="Filename">
                          {backup.filename}
                        </td>
                        <td className="small text-muted" data-label="Size">{formatSize(backup.size_bytes)}</td>
                        <td className="small text-muted" data-label="Created">{formatDate(backup.created_at)}</td>
                        <td className="text-end" data-label="Actions">
                          <div className="d-flex gap-2 justify-content-end">
                            {/* Download */}
                            <button
                              onClick={() => handleDownloadBackup(backup.filename)}
                              className="btn btn-outline-primary btn-sm"
                              title="Download backup to device"
                              aria-label={`Download ${backup.filename} to device`}
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
        <span className="small text-muted">
          <b>Note:</b> System actions are permanent. We recommend{" "}
          <b>creating database backups</b> regularly and <b>Exporting Records</b> for your physical archives.
        </span>
      </div>
    </div>
  );
};

export default SystemMaintenance;

import React from "react";
import axios from "axios";
import {
  FileSpreadsheet,
  Archive,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SystemMaintenance = () => {
  /**
   * runTask: Handles destructive actions with clear business-focused warnings
   */
  const runTask = async (endpoint, taskName, warningText) => {
    const confirmed = window.confirm(
      `Action: ${taskName}\n\n${warningText}\n\nAre you sure you want to proceed?`,
    );

    if (!confirmed) return;

    try {
      // Note: Endpoint names now match business logic (archive, optimize)
      const res = await axios.post(`${API_BASE}/admin/${endpoint}`);
      alert("Success: " + res.data.message);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again or contact support.");
    }
  };

  const downloadReport = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_BASE}/admin/export-csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob", // Important for downloading files
      });

      // Create a hidden link and click it to trigger the download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Business_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download report. Please check if you are logged in.");
    }
  };

  return (
    <div className="card shadow-sm border-0 p-4 mt-4">
      <div className="d-flex align-items-center mb-4">
        <h5 className="mb-0 fw-bold text-dark">System Housekeeping</h5>
      </div>

      <div className="row g-3">
        {/* 1. EXPORT DATA (CSV) */}
        <div className="col-md-4">
          <div className="p-3 border rounded text-center h-100 bg-white">
            <FileSpreadsheet className="text-success mb-2" size={32} />
            <h6 className="fw-bold">Export Records</h6>
            <p className="small text-muted">
              Download all reservation and payment history as an Excel-friendly
              CSV file.
            </p>
            <button
              onClick={downloadReport}
              className="btn btn-outline-success btn-sm w-100 mt-2"
            >
              Download CSV Report
            </button>
          </div>
        </div>

        {/* 2. ARCHIVE DATA */}
        <div className="col-md-4">
          <div className="p-3 border rounded text-center h-100 bg-white">
            <Archive className="text-primary mb-2" size={32} />
            <h6 className="fw-bold">Archive History</h6>
            <p className="small text-muted">
              Clean up your dashboard by moving completed records older than 1
              month to history.
            </p>
            <button
              onClick={() =>
                runTask(
                  "archive",
                  "System Archive",
                  "This will remove old finished reservations from your active lists to keep the system running fast.",
                )
              }
              className="btn btn-outline-primary btn-sm w-100 mt-2"
            >
              Run Archiving
            </button>
          </div>
        </div>

        {/* 3. SHIFT RESET (Replaces Optimize) */}
        <div className="col-md-4">
          <div className="p-4 border rounded text-center h-100 bg-white shadow-sm">
            <h5 className="fw-bold">Reset Table</h5>
            <p className="small text-muted mb-4">
              Prepares the floor for a new shift.
            </p>
            <button
              onClick={() =>
                runTask(
                  "reset",
                  "Table Reset",
                  "Warning: This will set all tables to 'Available'.",
                )
              }
              className="btn btn-outline-warning btn-lg w-100 py-3 fw-bold shadow-sm"
            >
              Start New Shift
            </button>
          </div>
        </div>
      </div>

      {/* Warning Footer */}
      <div className="mt-4 p-3 bg-light rounded border-start border-warning border-4 d-flex align-items-center">
        <AlertTriangle size={20} className="text-warning me-3" />
        <span className="small text-muted">
          <b>Manager Note:</b> Cleanup actions are permanent. We recommend{" "}
          <b>Exporting Records</b> once a month for your own physical files.
        </span>
      </div>
    </div>
  );
};

export default SystemMaintenance;

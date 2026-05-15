import React from "react";
import axios from "axios";
import { FileSpreadsheet, Archive, Sparkles, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SystemMaintenance = () => {
  /**
   * runTask: Handles destructive actions with clear business-focused warnings
   */
  const runTask = async (endpoint, taskName, warningText) => {
    const confirmed = window.confirm(
      `Action: ${taskName}\n\n${warningText}\n\nAre you sure you want to proceed?`
    );
    
    if (!confirmed) return;

    try {
      // Note: Endpoint names now match business logic (archive, optimize)
      const res = await axios.post(`${API_BASE}/admin/maintenance/${endpoint}`);
      alert("Success: " + res.data.message);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again or contact support.");
    }
  };
  const downloadReport = () => {
    // Points to the new CSV export route
    window.open(`${API_BASE}/admin/maintenance/export-csv`, "_blank");
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
              Download all reservation and payment history as an Excel-friendly CSV file.
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
              Clean up your dashboard by moving completed records older than 1 month to history.
            </p>
            <button
              onClick={() => runTask(
                "archive", 
                "System Archive", 
                "This will remove old finished reservations from your active lists to keep the system running fast."
              )}
              className="btn btn-outline-primary btn-sm w-100 mt-2"
            >
              Run Archiving
            </button>
          </div>
        </div>

        {/* 3. OPTIMIZE STORAGE */}
        <div className="col-md-4">
          <div className="p-3 border rounded text-center h-100 bg-light">
            <Sparkles className="text-warning mb-2" size={32} />
            <h6 className="fw-bold">Optimize Storage</h6>
            <p className="small text-muted">
              Delete receipt photos older than 3 months to free up space and boost speed.
            </p>
            <button
              onClick={() => runTask(
                "optimize", 
                "Storage Optimization", 
                "Caution: This permanently deletes receipt images older than 90 days. Please ensure you have exported your reports first."
              )}
              className="btn btn-outline-secondary btn-sm w-100 mt-2"
            >
              Optimize Now
            </button>
          </div>
        </div>
      </div>

      {/* Warning Footer */}
      <div className="mt-4 p-3 bg-light rounded border-start border-warning border-4 d-flex align-items-center">
        <AlertTriangle size={20} className="text-warning me-3" />
        <span className="small text-muted">
            <b>Manager Note:</b> Cleanup actions are permanent. We recommend <b>Exporting Records</b> once a month for your own physical files.
        </span>
      </div>
    </div>
  );
};

export default SystemMaintenance;
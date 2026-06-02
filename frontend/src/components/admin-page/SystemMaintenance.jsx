import React from "react";
import axios from "axios";
import {
  FileSpreadsheet,
  Archive,
  RefreshCcw, // Added for the Reset card
  AlertTriangle,
  Settings,
  FileText
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SystemMaintenance = () => {
  const runTask = async (endpoint, taskName, warningText) => {
    const confirmed = window.confirm(`Action: ${taskName}\n\n${warningText}\n\nAre you sure?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/admin/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Success: " + res.data.message);
      
      // FIX: Force the dashboard to re-fetch the data from the database
      // This will update the "1 Seated" count to "0 Seated"
      if (endpoint === 'reset') {
        window.location.reload(); 
      }

    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.error || "Action failed"));
    }
  };

  const downloadFinancialPdf = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/admin/export-financial-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

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
    <div className="card shadow-sm border-0 p-3 p-md-4 mt-4">
      <div className="d-flex align-items-center mb-4">
        <Settings className="text-secondary me-2" size={24} />
        <h5 className="mb-0 fw-bold text-dark">Maintenance</h5>
      </div>

      {/* Grid: 1 column on mobile, 2 on tablet, 3 on desktop */}
      <div className="row g-3">
        
        {/* 1. EXPORT DATA */}
        <div className="col-12 col-md-6 col-lg-4">
          <div className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between">
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
            >
              Download Report
            </button>
          </div>
        </div>

        {/* 2. ARCHIVE DATA */}
        <div className="col-12 col-md-6 col-lg-4">
          <div className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between">
            <div>
              <Archive className="text-primary mb-3" size={40} />
              <h5 className="fw-bold">Archive History</h5>
              <p className="small text-muted mb-4">
                Clean your dashboard by moving records older than 1 month to history.
              </p>
            </div>
            <button
              onClick={() =>
                runTask(
                  "archive",
                  "System Archive",
                  "This will remove old finished reservations from your active lists.",
                )
              }
              className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-sm"
            >
              Run Archiving
            </button>
          </div>
        </div>

        {/* 3. FINANCIAL PDF */}
        <div className="col-12 col-md-6 col-lg-4">
          <div className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between">
            <div>
              <FileText className="text-danger mb-3" size={40} />
              <h5 className="fw-bold">Export Financial PDF</h5>
              <p className="small text-muted mb-4">
                Includes profit (weekly/monthly/yearly) and revenue trend (weekly/monthly/yearly).
              </p>
            </div>
            <button
              onClick={downloadFinancialPdf}
             className="btn btn-danger btn-lg w-100 py-3 fw-bold shadow-sm"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* 4. SHIFT RESET */}
        <div className="col-12 col-md-12 col-lg-4">
          <div className="p-4 border rounded text-center h-100 bg-white shadow-sm d-flex flex-column justify-content-between">
            <div>
              <RefreshCcw className="text-warning mb-3" size={40} />
              <h5 className="fw-bold">Table Reset</h5>
              <p className="small text-muted mb-4">
                Prepares the floor for a new shift by resetting all table statuses.
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
              className="btn btn-warning btn-lg w-100 py-3 fw-bold shadow-sm"
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
          <b>Manager Note:</b> System actions are permanent. We recommend <b>Exporting Records</b> regularly for your physical archives.
        </span>
      </div>
    </div>
  );
};

export default SystemMaintenance;
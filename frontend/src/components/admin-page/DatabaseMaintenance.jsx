import React from "react";
import axios from "axios";
import { Trash2, Download, ShieldAlert } from "lucide-react";

const DatabaseMaintenance = () => {
  const runTask = async (endpoint, taskName) => {
    if (!window.confirm(`Are you sure you want to run: ${taskName}?`)) return;
    try {
      const res = await axios.post(
        `http://localhost:5000/api/admin/maintenance/${endpoint}`,
      );
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert("Task failed. Ensure the backend routes are set up correctly.");
    }
  };

  const downloadBackup = () => {
    // This opens the backend backup route in a new tab to trigger the download
    window.open("http://localhost:5000/api/admin/maintenance/backup", "_blank");
  };

  return (
    <div className="card shadow-sm border-0 p-4 mt-4">
      <h5 className="mb-4 text-danger fw-bold">
        Database & Server Maintenance
      </h5>
      <div className="row g-3">
        {/* Backup Database */}
        <div className="col-md-4">
          <div className="p-3 border rounded text-center h-100 bg-light">
            <Download className="text-primary mb-2" size={32} />
            <h6 className="fw-bold">Database Backup</h6>
            <p className="small text-muted">
              Download a full .sql backup of all your data.
            </p>
            <button
              onClick={downloadBackup}
              className="btn btn-outline-primary btn-sm w-100 mt-2"
            >
              Download SQL
            </button>
          </div>
        </div>

        {/* Clean Pending */}
        <div className="col-md-4">
          <div className="p-3 border rounded text-center h-100 bg-light">
            <ShieldAlert className="text-warning mb-2" size={32} />
            <h6 className="fw-bold">Clear Completed Reservation</h6>
            <p className="small text-muted">
              Delete Completed Reservation.
            </p>
            <button
              onClick={() => runTask("clean-reserve", "Clear Reserve")}
              className="btn btn-outline-warning btn-sm w-100 mt-2"
            >
              Run Cleanup
            </button>
          </div>
        </div>

        {/* Clean Storage */}
        <div className="col-md-4">
          <div className="p-3 border rounded text-center h-100 bg-light">
            <Trash2 className="text-danger mb-2" size={32} />
            <h6 className="fw-bold">Image Cleanup</h6>
            <p className="small text-muted">
              Delete receipt photos older than 3 months.
            </p>
            <button
              onClick={() => runTask("clean-storage", "Image Cleanup")}
              className="btn btn-outline-danger btn-sm w-100 mt-2"
            >
              Delete Old Media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseMaintenance;

// src/components/AuditLogs.jsx
import React, { useState, useEffect } from "react";
import api from "../../api";
import { Shield, Clock, User, Info } from "lucide-react";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get("/audit-logs"); // Ensure you define this GET route on your backend
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch audit trails:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container-fluid py-4 bg-light">
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-dark d-flex align-items-center">
          <Shield className="me-2 text-primary" size={24} /> System Audit Trail
        </h2>
        <p className="text-muted small">Accountability log tracking all critical administrative updates and actions.</p>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="text-muted small text-uppercase" style={{ fontSize: "0.75rem" }}>
                <th className="ps-4">Timestamp</th>
                <th>User (Actor)</th>
                <th>Action</th>
                <th>Target ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="ps-4 small text-muted">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="fw-bold">{log.first_name || "System"}</span>
                      <small className="d-block text-muted" style={{ fontSize: "0.7rem" }}>ID: {log.user_id || "N/A"}</small>
                    </td>
                    <td>
                      <span className={`badge px-2 py-1 ${log.action.includes("REJECT") || log.action.includes("DELETE") ? "bg-danger-subtle text-danger" : "bg-primary-subtle text-primary"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="font-monospace small">{log.target_id || "N/A"}</td>
                    <td className="small text-muted">{log.details || "N/A"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">No logs recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
import React, { useState, useEffect } from "react";
import api from "../../api";
import {Clock, User, Info, ChevronLeft, ChevronRight } from "lucide-react";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(15);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get("/audit-logs"); 
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch audit trails:", err);
    } finally {
      setLoading(false);
    }
  };

  // Pagination Logic
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="audit-logs-container container-fluid py-4 bg-light">
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-dark d-flex align-items-center">
          <div className="me-2 text-primary" size={24} /> System Audit Trail
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
                <th>Target User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.length > 0 ? (
                currentLogs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="ps-4 small text-muted" data-label="Timestamp">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td data-label="User (Actor)">
                      <span className="fw-bold">{log.first_name || "System"}</span>
                    </td>
                    <td data-label="Action">
                      <span className={`badge px-2 py-1 ${log.action.includes("REJECT") || log.action.includes("DELETE") ? "bg-danger-subtle text-danger" : "bg-primary-subtle text-primary"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="small text-muted" data-label="Target User">
                      {log.target_name ? (
                        <span>
                          <strong className="text-dark">{log.target_name}</strong>{" "}
                          <span className="text-secondary font-monospace" style={{ fontSize: "0.8rem" }}>
                            (ID: {log.target_id})
                          </span>
                        </span>
                      ) : log.target_id ? (
                        <span className="font-monospace text-secondary">ID: {log.target_id}</span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="small text-muted" data-label="Details">{log.details || "N/A"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">No logs recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <div className="text-muted small">
            Showing <strong>{indexOfFirstLog + 1}</strong> to <strong>{Math.min(indexOfLastLog, logs.length)}</strong> of <strong>{logs.length}</strong>
          </div>
          <nav>
            <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white overflow-hidden" style={{ listStyle: "none", padding: 0 }}>
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button 
                  className="page-link border-0 px-3 py-2 bg-transparent" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ cursor: currentPage === 1 ? "default" : "pointer" }}
                >
                  <ChevronLeft size={16} />
                </button>
              </li>
              <li className="page-item disabled">
                <span className="page-link border-0 text-dark fw-bold px-3 py-2 bg-white">
                  Page {currentPage} of {totalPages || 1}
                </span>
              </li>
              <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? "disabled" : ""}`}>
                <button 
                  className="page-link border-0 px-3 py-2 bg-transparent" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ cursor: currentPage >= totalPages ? "default" : "pointer" }}
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .audit-logs-container .table-responsive { overflow: visible; }
          .audit-logs-container thead { display: none; }
          .audit-logs-container .table,
          .audit-logs-container .table tbody,
          .audit-logs-container .table tr,
          .audit-logs-container .table td { display: block; width: 100%; min-width: 0; }
          .audit-logs-container .table tbody tr {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 12px;
            padding: 12px 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }
          .audit-logs-container .table td {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: none;
            padding: 8px 0;
            text-align: right !important;
            min-width: 0;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .audit-logs-container .table td[data-label]::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            text-align: left;
            flex-shrink: 0;
          }
          .audit-logs-container .table td[data-label="Timestamp"] {
            display: block;
            text-align: left !important;
            border-bottom: 1px dashed #e2e8f0;
            margin-bottom: 6px;
            padding-bottom: 10px;
          }
          .audit-logs-container .table td[data-label="Timestamp"]::before { display: none; }
          .audit-logs-container .table td[data-label="Details"] {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
};

export default AuditLogs;
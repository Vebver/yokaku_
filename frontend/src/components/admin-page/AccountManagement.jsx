import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  UserCircle, 
  ShieldCheck, 
  Loader2 
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AccountManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(8);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      setStatus({ type: "danger", msg: "Failed to load users." });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this user's role to ${newRole.toUpperCase()}?`)) return;
    try {
      setUpdatingUserId(userId);
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/admin/users/${userId}/update-role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
      setStatus({ type: "success", msg: "User role updated successfully!" });
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    } catch (err) {
      setStatus({ type: "danger", msg: "Failed to update user role." });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const email = (user.email || "").toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading && users.length === 0) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <Loader2 className="spinner-border text-primary" />
    </div>
  );

  return (
    <div className="container-fluid py-3 py-md-4 text-dark bg-light" style={{ minHeight: '100vh' }}>
      
      {/* RESPONSIVE HEADER */}
      <div className="row align-items-center g-3 mb-4 px-2">
        <div className="col-12 col-lg-6">
          <h2 className="fw-bold mb-1">Account Management</h2>
          <p className="text-muted small mb-0">Control system access and user permissions</p>
        </div>
        
        <div className="col-12 col-lg-6">
          <div className="d-flex align-items-center bg-white rounded-3 border shadow-sm px-3" style={{ height: '45px' }}>
            <Search size={18} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      {status.msg && (
        <div className={`alert alert-${status.type} border-0 shadow-sm rounded-3 mx-2 mb-4`} role="alert">
          {status.msg}
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ minWidth: '850px' }}>
            <thead className="bg-light border-bottom">
              <tr className="text-muted small text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: '0.8px' }}>
                <th className="ps-4 py-3">Profile</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Current Role</th>
                <th className="text-end pe-4">Manage Permissions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user) => (
                <tr key={user.user_id}>
                  <td className="ps-4">
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random&color=fff`}
                      alt="Avatar"
                      className="rounded-circle shadow-sm border"
                      width="40"
                      height="40"
                    />
                  </td>
                  <td>
                    <div className="fw-bold text-dark">{user.first_name} {user.last_name}</div>
                    <code className="text-muted" style={{ fontSize: '0.6rem' }}></code>
                  </td>
                  <td className="text-muted small">{user.email || "No Email"}</td>
                  <td>
                    <span className={`badge rounded-pill px-3 py-1 small fw-normal ${
                      user.role === 'admin' ? 'bg-primary text-white' : 
                      user.role === 'cashier' ? 'bg-info-subtle text-info border border-info-subtle' : 
                      'bg-light text-dark border'
                    }`}>
                      {user.role?.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end align-items-center gap-2">
                      {updatingUserId === user.user_id ? (
                        <Loader2 className="animate-spin text-muted" size={16} />
                      ) : (
                        <select
                          className="form-select form-select-sm border shadow-sm fw-bold bg-white"
                          style={{ width: '130px', fontSize: '0.75rem' }}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                        >
                          <option value="customer">Customer</option>
                          <option value="cashier">Cashier</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-5 text-center text-muted">No users found matching your search.</div>
          )}
        </div>
      </div>

      {/* PAGINATION SECTION */}
      <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="text-muted small">
          Showing <strong>{indexOfLastUser - usersPerPage + 1}</strong> to <strong>{Math.min(indexOfLastUser, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong>
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white overflow-hidden">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button 
                className="page-link border-0 px-3 py-2" 
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={currentPage === 1}
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
                className="page-link border-0 px-3 py-2" 
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .page-link:focus { box-shadow: none; }
        .form-select:focus { border-color: #10b981; box-shadow: 0 0 0 0.25rem rgba(16, 185, 129, 0.1); }
      `}</style>

    </div>
  );
};

export default AccountManagement;
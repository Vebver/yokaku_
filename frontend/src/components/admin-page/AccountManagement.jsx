import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AccountManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(5);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setStatus({ type: "danger", msg: "Failed to load users." });
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
    const email = user.email ? user.email.toLowerCase() : "";
    return fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading && users.length === 0)
    return (
      <div className="d-flex justify-content-center mt-5">
        <div className="spinner-border text-dark" role="status"></div>
      </div>
    );

  return (
    <div className="container-fluid px-5 py-4" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h2 className="fw-bold">User Management</h2>
        <input
          type="text"
          className="form-control w-25"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {status.msg && (
        <div className={`alert alert-${status.type} alert-dismissible fade show`} role="alert">
          {status.msg}
        </div>
      )}

      <div className="card shadow-sm border-0 overflow-hidden" style={{ borderRadius: "12px" }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="bg-light border-bottom">
              <tr style={{ height: "60px" }}>
                <th className="ps-4 small fw-bold text-uppercase">Avatar</th>
                <th className="small fw-bold text-uppercase">User Name</th>
                <th className="small fw-bold text-uppercase">Email Address</th>
                <th className="small fw-bold text-uppercase">Current Role</th>
                <th className="text-end pe-4 small fw-bold text-uppercase">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user) => (
                <tr key={user.user_id} style={{ height: "80px" }}>
                  <td className="ps-4">
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`}
                      alt="Avatar"
                      className="rounded-circle shadow-sm border"
                      width="45"
                      height="45"
                    />
                  </td>
                  <td>
                    <div className="fw-bold text-dark">
                      {user.first_name} {user.last_name}
                    </div>
                    <small className="text-muted">ID: #{user.user_id}</small>
                  </td>
                  <td className="text-muted fw-medium">{user.email}</td>
                  <td>
                    <span
                      className="badge rounded-pill px-3 py-2"
                      style={{
                        backgroundColor:
                          user.role === "admin" ? "#d1ecf1" : user.role === "cashier" ? "#d4edda" : "#e9ecef",
                        color: user.role === "admin" ? "#0c5460" : user.role === "cashier" ? "#155724" : "#495057",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <select
                      className="form-select form-select-sm d-inline-block w-auto border-0 bg-light fw-bold"
                      value={user.role}
                      disabled={updatingUserId === user.user_id}
                      onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                    >
                      <option value="customer">Customer</option>
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION SECTION */}
      {filteredUsers.length > usersPerPage && (
        <div className="d-flex justify-content-between align-items-center mt-4 px-2">
          <span className="text-muted small">
            Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of{" "}
            {filteredUsers.length}
          </span>
          <nav>
            <ul className="pagination mb-0">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button className="page-link border-0 text-dark" onClick={() => setCurrentPage((p) => p - 1)}>
                  Previous
                </button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button className="page-link border-0 text-dark" onClick={() => setCurrentPage((p) => p + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
import React, { useState, useEffect } from "react";
import axios from "axios";

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
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchUsers();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setStatus({ type: "danger", msg: "Failed to load users." });
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId, currentRole) => {
    const actionText =
      currentRole === "admin"
        ? "REMOVE admin privileges from"
        : "GRANT admin privileges to";
    if (!window.confirm(`Are you sure you want to ${actionText} this user?`))
      return;

    try {
      setUpdatingUserId(userId);
      const token = localStorage.getItem("token");
      const newRole = currentRole === "admin" ? "customer" : "admin";

      await axios.put(
        `/api/admin/users/${userId}/update-role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setUsers(
        users.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)),
      );
      setStatus({ type: "success", msg: "User updated successfully!" });
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    } catch (err) {
      setStatus({ type: "danger", msg: "Failed to update user." });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const email = user.email ? user.email.toLowerCase() : "";
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase())
    );
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
    <div
      className="container-fluid px-5 py-4"
      style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}
    >
      {/* HEADER SECTION - Outside the card */}
      <div className="d-flex justify-content-between align-items-start mb-5">
        <div>
          <h1 className="fw-bold mb-0 text-dark" style={{ fontSize: "2.5rem" }}>
            Account Management
          </h1>
          <p className="text-muted small">
            Verify user privileges and manage administrative access
          </p>
        </div>
        <div className="d-flex gap-3">
          <input
            type="text"
            className="form-control form-control-sm border-0 shadow-sm"
            placeholder="Search users..."
            style={{ width: "250px" }}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="btn btn-dark px-4 fw-bold"
            style={{ backgroundColor: "#212529", borderRadius: "8px" }}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {status.msg && (
        <div className={`alert alert-${status.type} shadow-sm border-0 mb-4`}>
          {status.msg}
        </div>
      )}

      {/* DATA SECTION */}
      <div
        className="card shadow-sm border-0 overflow-hidden"
        style={{ borderRadius: "0px" }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="border-bottom">
              <tr style={{ height: "60px" }}>
                <th
                  className="ps-4 small fw-bold text-uppercase"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Avatar
                </th>
                <th
                  className="small fw-bold text-uppercase"
                  style={{ letterSpacing: "0.5px" }}
                >
                  User & ID
                </th>
                <th
                  className="small fw-bold text-uppercase"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Email Address
                </th>
                <th
                  className="small fw-bold text-uppercase"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Status
                </th>
                <th
                  className="text-end pe-4 small fw-bold text-uppercase"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user) => (
                <tr key={user.user_id} style={{ height: "80px" }}>
                  <td className="ps-4">
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=f8f9fa&color=333`}
                      alt="Avatar"
                      className="rounded shadow-sm border"
                      width="45"
                      height="45"
                    />
                  </td>
                  <td>
                    <div className="fw-bold text-dark">
                      {user.first_name} {user.last_name}
                    </div>
                    <div
                      className="text-muted x-small"
                      style={{ fontSize: "0.75rem" }}
                    ></div>
                  </td>
                  <td className="text-muted fw-medium">{user.email}</td>
                  <td>
                    <span
                      className="badge rounded-pill px-3 py-2"
                      style={{
                        backgroundColor:
                          user.role === "admin" ? "#fff3cd" : "#e9ecef",
                        color: user.role === "admin" ? "#856404" : "#495057",
                        fontSize: "0.7rem",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {user.role === "admin" ? "ADMIN" : "USER"}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      onClick={() => toggleAdmin(user.user_id, user.role)}
                      disabled={updatingUserId === user.user_id}
                      className="btn btn-outline-dark btn-sm fw-bold px-3 py-2"
                      style={{ borderRadius: "6px", fontSize: "0.85rem" }}
                    >
                      {updatingUserId === user.user_id
                        ? "..."
                        : user.role === "admin"
                          ? "Remove Admin"
                          : "Make Admin"}
                    </button>
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
            Showing {indexOfFirstUser + 1} to{" "}
            {Math.min(indexOfLastUser, filteredUsers.length)} of{" "}
            {filteredUsers.length}
          </span>
          <ul className="pagination mb-0">
            <button
              className="page-link border-0 link-dark link-offset-2 link-underline-opacity-0 link-underline-opacity-100-hover bg-transparent"
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Previous
            </button>
            <li
              className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
            >
              <button
                className="page-link border-0 text-dark bg-transparent"
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;

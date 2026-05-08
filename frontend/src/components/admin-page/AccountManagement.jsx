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
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchUsers();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
  // NO SHOWS
  const resetNoShows = async (userId) => {
    if (!window.confirm("Reset no-show strikes for this user?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/admin/users/${userId}/reset-no-shows`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUsers(
        users.map((u) =>
          u.user_id === userId ? { ...u, no_show_count: 0 } : u,
        ),
      );
      setStatus({ type: "success", msg: "No-show strikes cleared." });
    } catch (err) {
      setStatus({ type: "danger", msg: "Failed to reset strikes." });
    }
  };
  // RESET STRIKES
  const resetStrikes = async (userId) => {
    if (!window.confirm("Reset strikes for this user?")) return;
    try {
      const token = localStorage.getItem("token");
      // This calls a route we need to make sure exists in your backend
      await axios.put(
        `${API_BASE}/admin/users/${userId}/reset-strikes`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchUsers(); // Refresh the list
      alert("User has been unblocked!");
    } catch (err) {
      alert("Failed to reset strikes.");
    }
  };
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
        `${API_BASE}/admin/users/${userId}/update-role`,
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
      <div
        className="card shadow-sm border-0 overflow-hidden"
        style={{ borderRadius: "0px" }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="border-bottom">
              <tr style={{ height: "60px" }}>
                <th className="ps-4 small fw-bold text-uppercase">Avatar</th>
                <th className="small fw-bold text-uppercase">User & ID</th>
                <th className="small fw-bold text-uppercase">Email Address</th>
                <th className="small fw-bold text-uppercase">
                  Strikes (No-Shows)
                </th>{" "}
                {/* NEW COLUMN */}
                <th className="small fw-bold text-uppercase">Status</th>
                <th className="text-end pe-4 small fw-bold text-uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user) => (
                <tr key={user.user_id} style={{ height: "80px" }}>
                  <td className="ps-4">
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=${user.no_show_count >= 3 ? "ff0000" : "f8f9fa"}&color=${user.no_show_count >= 3 ? "fff" : "333"}`}
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
                    {user.no_show_count >= 3 && (
                      <small className="text-danger fw-bold">BLACKLISTED</small>
                    )}
                  </td>
                  <td className="text-muted fw-medium">{user.email}</td>

                  {/* NO SHOW COUNT COLUMN */}
                  <td>
                    <span
                      className={`fw-bold ${user.no_show_count >= 3 ? "text-danger" : "text-dark"}`}
                    >
                      {user.no_show_count || 0} / 3
                    </span>
                    <div
                      className="progress mt-1"
                      style={{ height: "4px", width: "60px" }}
                    >
                      <div
                        className={`progress-bar ${user.no_show_count >= 3 ? "bg-danger" : "bg-warning"}`}
                        role="progressbar"
                        style={{ width: `${(user.no_show_count / 3) * 100}%` }}
                      ></div>
                    </div>
                  </td>

                  <td>
                    <span
                      className="badge rounded-pill px-3 py-2"
                      style={{
                        backgroundColor:
                          user.role === "admin" ? "#fff3cd" : "#e9ecef",
                        color: user.role === "admin" ? "#856404" : "#495057",
                        fontSize: "0.7rem",
                      }}
                    >
                      {user.role === "admin" ? "ADMIN" : "USER"}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex gap-2 justify-content-end">
                      {/* REMOVE the "user.no_show_count > 0" check here */}
                      <button
                        onClick={() => resetNoShows(user.user_id)}
                        className="btn btn-outline-danger btn-sm px-2"
                      >
                        Reset Strikes
                      </button>

                      <button
                        onClick={() => toggleAdmin(user.user_id, user.role)}
                        disabled={updatingUserId === user.user_id}
                        className="btn btn-dark btn-sm fw-bold px-3"
                      >
                        {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                      </button>
                    </div>
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

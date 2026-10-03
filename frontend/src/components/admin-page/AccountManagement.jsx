import React, { useState, useEffect } from "react";
import api from "../../api";
import { 
  Search, 
  UserCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react"
import AdminPagination from "../shared/AdminPagination";
import { useConfirmation } from "../ConfirmationContext";

const AccountManagement = () => {
  const { confirm } = useConfirmation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(15);

  const resetPage = () => setCurrentPage(1);

  const clearFilters = () => {
    setRoleFilter("all");
    resetPage();
  };

  const hasActiveFilters = roleFilter !== "all";

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Removed unused token variable for clarity, assuming api instance handles headers
      const res = await api.get(`/admin/users`);
      setUsers(res.data);
    } catch (err) {
      setStatus({ type: "danger", msg: "Failed to load users." });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!(await confirm({
      title: "Change user role",
      message: `Change this user's role to ${newRole.toUpperCase()}?`,
      confirmLabel: "Change role",
      variant: "primary",
    }))) return;
    try {
      setUpdatingUserId(userId);
      await api.put(
        `/admin/users/${userId}/update-role`,
        { role: newRole }
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

  // Alphabetical by name so staff can find a person without hunting.
  const filteredUsers = users
    .filter((user) => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = (user.email || "").toLowerCase();
      const term = searchTerm.toLowerCase();
      if (term && !(fullName.includes(term) || email.includes(term))) {
        return false;
      }
      if (roleFilter !== "all") {
        if ((user.role || "").toLowerCase() !== roleFilter) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const an = `${a.first_name || ""} ${a.last_name || ""}`.trim();
      const bn = `${b.first_name || ""} ${b.last_name || ""}`.trim();
      return an.localeCompare(bn, undefined, { sensitivity: "base" });
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
    <div className="account-mgmt-container container-fluid py-3 py-md-4 text-dark bg-light" style={{ minHeight: '100vh' }}>

      {/* RESPONSIVE HEADER */}
      <div className="admin-page-header px-2 mb-3">
        <h2 className="fw-bold mb-1">Account Management</h2>
        <p className="text-muted small mb-0">Control system access and user permissions</p>
      </div>

      <div className="admin-toolbar row g-2 align-items-center mb-4 px-2">
        <div className="col-12 col-lg-8">
          <div className="d-flex flex-wrap gap-2">
            <div className="admin-search d-flex align-items-center bg-white rounded-3 border shadow-sm px-3 flex-grow-1">
              <Search size={18} className="text-muted flex-shrink-0" />
              <input
                type="text"
                className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <select
              className="form-select"
              style={{ width: "auto", minWidth: "150px", height: "45px" }}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                resetPage();
              }}
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
            {hasActiveFilters && (
              <button
                className="btn btn-sm btn-link text-decoration-none px-0 align-self-center"
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
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
          <table className="table table-hover align-middle mb-0" style={{ minWidth: '980px' }}>
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
                  <td className="ps-4" data-label="Profile">
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random&color=fff`}
                      alt="Avatar"
                      className="rounded-circle shadow-sm border"
                      width="40"
                      height="40"
                    />
                  </td>
                  <td data-label="Full Name">
                    <div className="fw-bold text-dark">{user.first_name} {user.last_name}</div>
                  </td>
                  <td className="text-muted small" data-label="Email Address">{user.email || "No Email"}</td>
                  <td data-label="Current Role">
                    {/* UPDATED ROLE BADGES */}
                    <span className={`badge rounded-pill px-3 py-1 small fw-normal ${
                      user.role === 'admin' ? 'bg-primary text-white' :
                      user.role === 'cashier' ? 'bg-info-subtle text-info border border-info-subtle' :
                      user.role === 'cook' ? 'bg-success-subtle text-success border border-success-subtle' :
                      'bg-light text-dark border'
                    }`}>
                      {user.role?.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-end pe-4" data-label="Manage Permissions">
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
                          <option value="cook">Cook</option>
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

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredUsers.length}
        itemsPerPage={usersPerPage}
        onPageChange={setCurrentPage}
      />

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .page-link:focus { box-shadow: none; }
        .form-select:focus { border-color: #10b981; box-shadow: 0 0 0 0.25rem rgba(16, 185, 129, 0.1); }

        @media (max-width: 768px) {
          .account-mgmt-container .table-responsive { overflow: visible; }
          .account-mgmt-container thead { display: none; }
          .account-mgmt-container .table,
          .account-mgmt-container .table tbody,
          .account-mgmt-container .table tr,
          .account-mgmt-container .table td { display: block; width: 100%; min-width: 0; }
          .account-mgmt-container .table { min-width: 0 !important; }
          .account-mgmt-container .table tbody tr {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 12px;
            padding: 12px 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }
          .account-mgmt-container .table td {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: none;
            padding: 8px 0;
            text-align: right !important;
          }
          .account-mgmt-container .table td[data-label]::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            text-align: left;
            flex-shrink: 0;
          }
          .account-mgmt-container .table td[data-label="Full Name"] {
            display: block;
            text-align: left !important;
            border-bottom: 1px dashed #e2e8f0;
            margin-bottom: 6px;
            padding-bottom: 10px;
          }
          .account-mgmt-container .table td[data-label="Full Name"]::before { display: none; }
          .account-mgmt-container .table td[data-label="Profile"] {
            justify-content: flex-start;
          }
          .account-mgmt-container .table td[data-label="Manage Permissions"] .d-flex {
            justify-content: flex-end;
          }
          .account-mgmt-container .table td[data-label="Manage Permissions"] .form-select {
            width: 100% !important;
            max-width: 140px;
          }
        }
      `}</style>

    </div>
  );
};

export default AccountManagement;
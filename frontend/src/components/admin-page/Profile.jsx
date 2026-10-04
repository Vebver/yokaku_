import React, { useState, useEffect } from "react";
import api from "../../api";
import { useToast } from "../ToastContext";
import "../../Style/Profile.css";
function Profile() {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    status: "",
    memberSince: "",
    customerId: null,
  });
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Password change state
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = (field) => (e) => {
    setPasswordError("");
    setPasswords((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // 3. HANDLE PASSWORD UPDATE
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!passwords.currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(passwords.newPassword)) {
      setPasswordError("New password must contain at least one uppercase letter.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwords.newPassword)) {
      setPasswordError(
        'New password must contain at least one special character (!@#$%^&*)',
      );
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email: profile.email,
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      showToast(res.data?.message || "Password updated successfully!", "success");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to update password.";
      setPasswordError(msg);
      showToast(msg, "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 1. FETCH PROFILE ON LOAD
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // 2. HANDLE UPDATE
  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.put(`/profile`, profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      localStorage.setItem("firstName", res.data.firstName || "");
      localStorage.setItem("lastName", res.data.lastName || "");
      localStorage.setItem("email", res.data.email || "");
      window.dispatchEvent(new Event("profile-updated"));
      showToast("Profile updated successfully!","success");
    } catch (err) {
      showToast(
        "Error updating profile: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-dark" role="status"></div>
      </div>
    );

  return (
    <div
      className="container-fluid px-2 py-5"
      style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}
    >
      {/* PAGE HEADER - Title on the Left */}
      <div className="profile-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="fw-bold mb-0 text-dark profile-title" style={{ fontSize: "2.5rem" }}>
            Profile & Settings
          </h1>
          <p className="text-muted small">
            Manage your account information and security preferences
          </p>
        </div>
<button
          onClick={() => window.location.reload()}
          className="btn btn-dark px-4 fw-bold shadow-sm profile-refresh-btn"
          style={{ borderRadius: "8px" }}
        >
          Refresh Data
        </button>
      </div>

      <div className="row g-3">
        {/* LEFT COLUMN: Profile Summary Card */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm text-center p-4 h-100">
            <div className="mb-3 mt-3">
              <img
                src={`https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=10b981&color=fff&size=128`}
                alt="Avatar"
                className="rounded-circle shadow-sm border border-4 border-white"
                width="100"
              />
            </div>
            <h3 className="fw-bold mb-1">
              {profile.firstName} {profile.lastName}
            </h3>
            <p
              className="text-muted small mb-3 text-uppercase fw-bold"
              style={{ letterSpacing: "1px" }}
            >
              {profile.role || "User"}
            </p>

            {profile.customerId && (
              <div className="mb-4">
                <span className="badge bg-light text-dark border px-3 py-2">
                  ID: {profile.customerId}
                </span>
              </div>
            )}

            <hr className="my-4 text-muted opacity-25" />

            <div className="text-start px-2">
              <h6
                className="fw-bold small text-uppercase text-muted mb-3"
                style={{ letterSpacing: "0.5px" }}
              >
                Account Details
              </h6>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="small text-muted">Current Role</span>
                <span className="text-dark small fw-bold">{profile.role}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="small text-muted">Account Status</span>
                <span className="badge bg-success-subtle text-success small">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Forms */}
        <div className="col-lg-8">
          {/* PERSONAL INFO CARD */}
          <div className="card border-0 shadow-sm p-4 mb-4">
            <div className="mb-4">
              <h5 className="fw-bold mb-1">Personal Information</h5>
              <p className="text-muted small">
                Update your name, email and phone contact details.
              </p>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="row g-4">
                <div className="col-md-6">
                  <label
                    className="form-label small fw-bold text-uppercase text-muted"
                    style={{ fontSize: "0.7rem" }}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    className="form-control bg-light border-0 py-2"
                    value={profile.firstName || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label
                    className="form-label small fw-bold text-uppercase text-muted"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="form-control bg-light border-0 py-2"
                    value={profile.lastName || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, lastName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label
                    className="form-label small fw-bold text-uppercase text-muted"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control bg-light border-0 py-2"
                    value={profile.email || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="mt-5">
                <button
                  type="submit"
                  className="btn btn-dark px-5 py-2 fw-bold profile-submit-btn"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving Changes..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>

          {/* SECURITY CARD */}
          <div className="card border-0 shadow-sm p-4">
            <div className="d-flex align-items-center mb-4">
              <div
                className="bg-dark text-white p-2 rounded me-3 d-flex align-items-center justify-content-center"
                style={{ width: "40px", height: "40px" }}
              >
                <i className="bi bi-shield-lock"></i>
              </div>
              <div>
                <h5 className="fw-bold mb-0">Security Settings</h5>
                <p className="text-muted small mb-0">
                  Manage your password and authentication
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label
                    className="form-label small fw-bold text-uppercase text-muted"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="form-control bg-light border-0 py-2"
                    placeholder="Enter current password"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange("currentPassword")}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="col-md-4">
                  <label
                    className="form-label small fw-bold text-uppercase text-muted"
                    style={{ fontSize: "0.7rem" }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    className="form-control bg-light border-0 py-2"
                    placeholder="Min 8 chars, 1 capital, 1 special"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange("newPassword")}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="col-md-4">
                  <label
                    className="form-label small fw-bold text-uppercase text-muted"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="form-control bg-light border-0 py-2"
                    placeholder="Re-enter new password"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange("confirmPassword")}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {passwordError && (
                <div className="alert alert-danger py-2 small mt-3 mb-0">
                  {passwordError}
                </div>
              )}

              <div className="mt-4 text-md-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="btn btn-outline-dark fw-bold px-4 profile-password-btn"
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

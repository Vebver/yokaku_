import React, { useState, useEffect } from "react";
import axios from "axios";
const API_BASE = "https://yokaku-backend.onrender.com/api";
function Profile() {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    status: "",
    memberSince: "",
    customerId: null,
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. FETCH PROFILE ON LOAD
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/profile`, {
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
      const res = await axios.put(`${API_BASE}/profile`, profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      alert("Profile updated successfully!");
    } catch (err) {
      alert(
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
      <div className="d-flex justify-content-between align-items-start mb-1">
        <div>
          <h1 className="fw-bold mb-0 text-dark" style={{ fontSize: "2.5rem" }}>
            Profile & Settings
          </h1>
          <p className="text-muted small">
            Manage your account information and security preferences
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-dark px-4 fw-bold shadow-sm"
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
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted">Member Since</span>
                <span className="text-dark small fw-bold">
                  {profile.memberSince
                    ? new Date(profile.memberSince).toLocaleDateString(
                        "en-US",
                        { month: "short", year: "numeric" },
                      )
                    : "N/A"}
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
                <div className="col-md-6">
                  <label
                    className="form-label small fw-bold text-uppercase text-muted"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="form-control bg-light border-0 py-2"
                    value={profile.phone || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-5">
                <button
                  type="submit"
                  className="btn btn-dark px-5 py-2 fw-bold"
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

            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label
                  className="form-label small fw-bold text-uppercase text-muted"
                  style={{ fontSize: "0.7rem" }}
                >
                  New Password
                </label>
                <input
                  type="password"
                  fix="1"
                  className="form-control bg-light border-0 py-2"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="col-md-6 text-md-end">
                <button
                  type="button"
                  className="btn btn-outline-dark fw-bold px-4"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

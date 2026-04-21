import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../Style/CustomerProfile.css";
import CustomerProfileEdit from "./CustomerProfileEdit";

const CustomerProfile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        // 1. Get the token from localStorage (saved during login)
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please log in to view your profile.");
          setLoading(false);
          return;
        }

        // 2. Send the request to /api/profile

        const response = await axios.get(`api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`, // 3. This is the key part!
          },
        });

        setUserData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load profile.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []); // Runs once when the component mounts

  // CustomerProfile.jsx

  const handleUpdateProfile = async (updatedData) => {
    try {
      const token = localStorage.getItem("token");

      // 1. Send request
      const response = await axios.put(
        "api/profile",
        updatedData,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // 2. Check what the server sent back
      console.log("Server returned fresh data:", response.data);

      // 3. Update state with the server's response
      // This MUST contain firstName, lastName, etc.
      setUserData(response.data);

      // 4. Switch UI back to view mode
      setIsEditing(false);

      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Update Error:", err);
      alert("Update failed!");
    }
  };

  if (loading)
    return <div className="text-center py-5">Loading profile...</div>;

  if (error) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger">{error}</div>
        <a href="/login" className="btn btn-primary">
          Go to Login
        </a>
      </div>
    );
  }
  if (isEditing) {
    return (
      <CustomerProfileEdit
        userData={userData}
        onSave={handleUpdateProfile}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  if (!userData) return <div className="text-center py-5">No user found.</div>;

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
            {/* Header Section */}
            <div className="bg-dark text-white text-center py-5">
              <h2 className="fw-bold mb-1">
                {userData.firstName} {userData.lastName}
              </h2>
              <p className="text-warning mb-0 small text-uppercase fw-bold">
                {userData.status}
              </p>
            </div>

            {/* Information Section */}
            <div className="card-body p-4 p-md-5">
              <h5 className="text-muted text-uppercase mb-4 small fw-bold border-bottom pb-2">
                Personal Information
              </h5>

              <div className="row mb-3">
                <div className="col-sm-4 text-muted fw-semibold">
                  Email Address
                </div>
                <div className="col-sm-8 fw-bold text-break">
                  {userData.email}
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-sm-4 text-muted fw-semibold">
                  Phone Number
                </div>
                <div className="col-sm-8 fw-bold">{userData.phone}</div>
              </div>

              <div className="d-grid gap-2">
                <button
                  className="btn btn-warning fw-bold py-2 rounded-3"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
                <button
                  className="btn btn-outline-danger fw-bold py-2 rounded-3"
                  onClick={() => {
                    localStorage.removeItem("token");
                    window.location.reload();
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;

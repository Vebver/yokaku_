import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../Style/LoginModal.css"; // Reuse your styles

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const EyeIcon = ({ visible, toggle }) => (
    <span className="password-toggle-icon" onClick={toggle}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="eye-svg"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
        {!visible && <line x1="3" y1="3" x2="21" y2="21" />}
      </svg>
    </span>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    // --- NEW RESTRICTION: Check for at least 8 characters ---
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/auth/reset-password-final", {
        token,
        newPassword,
      });
      alert("Password updated successfully!");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Link expired or invalid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f8f9fa",
      }}
    >
      <div
        className="modal-content"
        style={{
          width: "400px",
          padding: "40px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ textAlign: "center", color: "#ffd400" }}>NEW PASSWORD</h2>
        <p
          style={{
            textAlign: "center",
            fontSize: "0.9rem",
            marginBottom: "20px",
          }}
        >
          Enter your new secure password below.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="password-container" style={{ marginBottom: "15px" }}>
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New Password"
              className="login-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <EyeIcon
              visible={showNewPassword}
              toggle={() => setShowNewPassword(!showNewPassword)}
            />
          </div>

          <div className="password-container" style={{ marginBottom: "15px" }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              className="login-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <EyeIcon
              visible={showConfirmPassword}
              toggle={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>

          {/* This logic will now display either the match error or the length error */}
          {error && <p className="password-warning">{error}</p>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "UPDATING..." : "UPDATE PASSWORD"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;

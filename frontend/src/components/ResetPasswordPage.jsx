import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../Style/LoginModal.css";
import { useToast } from "./ToastContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Get token from query string
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password validation states
  const [passwordCriteria, setPasswordCriteria] = useState({
    minLength: false,
    hasCapital: false,
    hasSpecial: false,
  });

  // Validate password in real-time
  useEffect(() => {
    setPasswordCriteria({
      minLength: newPassword.length >= 8,
      hasCapital: /[A-Z]/.test(newPassword),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  // Check if all password criteria are met
  const isPasswordValid =
    passwordCriteria.minLength &&
    passwordCriteria.hasCapital &&
    passwordCriteria.hasSpecial;

  // Password criteria indicator component
  const PasswordCriteria = ({ label, isMet }) => (
    <div
      className={`password-criteria-item ${isMet ? "met" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 0",
        fontSize: "13px",
        color: isMet ? "#27ae60" : "#999",
        transition: "all 0.3s ease",
      }}
    >
      <span
        className="criteria-icon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          border: isMet ? "2px solid #27ae60" : "2px solid #ddd",
          backgroundColor: isMet ? "#27ae60" : "transparent",
          color: isMet ? "white" : "transparent",
          transition: "all 0.3s ease",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {isMet ? "✓" : ""}
      </span>
      <span>{label}</span>
    </div>
  );

  // If no token, show error
  if (!token) {
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
          <h2 style={{ textAlign: "center", color: "#e63946" }}>
            Invalid Reset Link
          </h2>
          <p style={{ textAlign: "center", color: "#666" }}>
            The password reset link is invalid or missing.
          </p>
          <button
            className="submit-btn"
            onClick={() => navigate("/")}
            style={{ marginTop: "20px" }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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
    setError("");

    // Use the password criteria validation
    if (!isPasswordValid) {
      setError("Please meet all password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/reset-password-final`, {
        token,
        newPassword,
      });
      showToast("Password updated successfully!", "success");
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

          {/* Password Criteria Display */}
          {newPassword && (
            <div
              className="password-criteria-container"
              style={{
                marginTop: "8px",
                marginBottom: "12px",
                padding: "10px 14px",
                background: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              <PasswordCriteria
                label="At least 8 characters"
                isMet={passwordCriteria.minLength}
              />
              <PasswordCriteria
                label="At least 1 capital letter"
                isMet={passwordCriteria.hasCapital}
              />
              <PasswordCriteria
                label="At least 1 special character (!@#$%^&*)"
                isMet={passwordCriteria.hasSpecial}
              />
            </div>
          )}

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

          {error && <p className="password-warning">{error}</p>}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !isPasswordValid}
          >
            {loading ? "UPDATING..." : "UPDATE PASSWORD"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;

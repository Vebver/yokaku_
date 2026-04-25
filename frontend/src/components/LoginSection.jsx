import React, { useState } from "react";
import VerifyEmail from "./VerifyEmail";
import "../Style/LoginModal.css";
import axios from "axios";

function LoginSection({ onClose }) {
  const [view, setView] = useState("login"); // 'login', 'signup', 'verify', 'forgot', 'reset'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Added for confirm field
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reuse the SVG to avoid repetition
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("userRole", res.data.user.role);
      localStorage.setItem("email", res.data.user.email);
      localStorage.setItem("firstName", res.data.user.firstName);
      localStorage.setItem("lastName", res.data.user.lastName);
      localStorage.setItem("role", res.data.user.role);
      if (res.data.user.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.reload();
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (error === "Email already in use") return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/auth/signup", {
        firstName,
        lastName,
        email,
        password,
      });
      alert("OTP sent to " + email);
      setView("verify");
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Too many OTP requests, please try again later.");
      } else {
        setError(err.response?.data?.error || "Signup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post("/api/auth/forgot-password", { email });
      alert("Reset link sent to your email!");
      setView("login");
    } catch (err) {
      setError(err.response?.data?.error || "User not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code) => {
    try {
      const res = await axios.post("/api/auth/verify-otp", {
        email,
        otp: code,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("userRole", res.data.user.role);
      localStorage.setItem("email", res.data.user.email);
      localStorage.setItem("firstName", res.data.user.firstName);
      localStorage.setItem("lastName", res.data.user.lastName);
      localStorage.setItem("role", res.data.user.role); 
      window.location.href = "/customer";
      onClose();
    } catch (err) {
      alert("Verification failed");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>

        <div key={view} className="fade-in">
          {view === "verify" ? (
            <VerifyEmail
              email={email}
              onVerify={handleVerifyOTP}
              onBack={() => setView("signup")}
              onResend={() => {}}
            />
          ) : view === "forgot" ? (
            <>
              <h2>FORGOT PASSWORD</h2>
              <form onSubmit={handleForgotPasswordSubmit}>
                <input
                  type="email"
                  placeholder="Email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {error && <p className="password-warning">{error}</p>}
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? "SENDING..." : "SEND RESET LINK"}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setView("login")}
                >
                  Back to Login
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>{view === "login" ? "LOGIN" : "SIGN UP"}</h2>
              <form
                onSubmit={
                  view === "login" ? handleLoginSubmit : handleSignUpSubmit
                }
              >
                {view === "signup" && (
                  <>
                    <input
                      type="text"
                      placeholder="First Name"
                      className="login-input"
                      value={firstName}
                      onChange={(e) =>
                        setFirstName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))
                      }
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      className="login-input"
                      value={lastName}
                      onChange={(e) =>
                        setLastName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))
                      }
                      required
                    />
                  </>
                )}

                <input
                  type="email"
                  placeholder="Email"
                  className="login-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                />

                {/* PASSWORD FIELD */}
                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <EyeIcon
                    visible={showPassword}
                    toggle={() => setShowPassword(!showPassword)}
                  />
                </div>

                {view === "login" && (
                  <div className="forgot-password-container">
                    <button
                      type="button"
                      className="forgot-password-link"
                      onClick={() => setView("forgot")}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* CONFIRM PASSWORD FIELD (Restored the Eye Icon here) */}
                {view === "signup" && (
                  <div className="password-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      className="login-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <EyeIcon
                      visible={showConfirmPassword}
                      toggle={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    />
                  </div>
                )}

                {error && <p className="password-warning">{error}</p>}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || error === "Email already in use"}
                >
                  {loading
                    ? "PROCESSING..."
                    : view === "login"
                      ? "SUBMIT"
                      : "CREATE ACCOUNT"}
                </button>

                <p className="signup-text">
                  {view === "login"
                    ? "Don't have an account? "
                    : "Already have an account? "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setView(view === "login" ? "signup" : "login");
                      setError("");
                    }}
                  >
                    {view === "login" ? "Sign up" : "Back to Sign In"}
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginSection;

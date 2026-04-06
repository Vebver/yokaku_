import React, { useState } from "react";
import VerifyEmail from "./VerifyEmail";
import "../Style/LoginModal.css";
import axios from "axios";

function LoginSection({ onClose }) {
  const [view, setView] = useState("login"); // 'login', 'signup', 'verify'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/api/auth/login", { email, password });

      console.log("User Data from Backend:", res.data.user);

      // --- 1. CLEANUP PREVIOUS SESSION DATA ---
      // Before logging in the new user, we wipe any old reservation progress
      // that might be sitting in localStorage from a previous account.
      const keysToClear = [
        "res_step", 
        "res_package", 
        "res_guests", 
        "res_personalInfo", 
        "res_formData"
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));
      // ----------------------------------------

      // --- 2. SAVE NEW USER AUTH DETAILS ---
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", res.data.user.role); 

      // Save the new user's ID
      const idToStore = res.data.user.user_id || res.data.user.id;
      localStorage.setItem("userId", idToStore); 

      // --- 3. REDIRECT / RELOAD ---
      if (res.data.user.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        // Refresh ensures all components (like HeroSection) 
        // restart with the new account's data
        window.location.reload();
      }
      onClose();
    } catch (err) {
      console.error("Login Error:", err.response?.data);
      setError(err.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
};

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError("");

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
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code) => {
    try {
      const res = await axios.post("/api/auth/verify-otp", { email, otp: code });
      localStorage.setItem("token", res.data.token);
      window.location.href = "/customer";
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Verification failed");
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
              onResend={async () => {
                try {
                  await axios.post("/api/auth/signup", {
                    firstName,
                    lastName,
                    email,
                    password,
                  });
                  alert("OTP resent to " + email);
                } catch (err) {
                  setError("Resend failed");
                }
              }}
            />
          ) : (
            <>
              <h2>{view === "login" ? "LOGIN" : "SIGN UP"}</h2>

              <form
                onSubmit={
                  view === "login" ? handleLoginSubmit : handleSignUpSubmit
                }
              >
                {/* FIELDS ONLY FOR SIGN UP */}
                {view === "signup" && (
                  <>
                    <input
                      type="text"
                      placeholder="Last Name"
                      className="login-input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="First Name"
                      className="login-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </>
                )}

                {/* FIELDS FOR BOTH LOGIN AND SIGN UP */}
                <input
                  type="email"
                  placeholder="Email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    className="password-toggle-icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
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
                      {!showPassword && <line x1="3" y1="3" x2="21" y2="21" />}
                    </svg>
                  </span>
                </div>

                {/* CONFIRM PASSWORD ONLY FOR SIGN UP */}
                {view === "signup" && (
                  <>
                    <div className="password-container">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        className="login-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <span
                        className="password-toggle-icon-confirm"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
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
                          className="eye-svg-confirm"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                          {!showConfirmPassword && (
                            <line x1="3" y1="3" x2="21" y2="21" />
                          )}
                        </svg>
                      </span>
                    </div>
                  </>
                )}

                {/* Validation messages */}
                {password.length > 0 && password.length < 8 && (
                  <p className="password-warning">
                    Password must be at least 8 characters.
                  </p>
                )}
                {view === "signup" &&
                  confirmPassword &&
                  password !== confirmPassword && (
                    <p className="password-warning">Passwords do not match.</p>
                  )}
                {error && <p className="password-warning">{error}</p>}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={
                    loading || (password.length < 8 && view === "signup")
                  }
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
                      setError(""); // Clear errors when switching views
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

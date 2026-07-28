import React, { useState, useEffect } from "react";
import VerifyEmail from "./VerifyEmail";
import { useToast } from "./ToastContext"; // Adjust path to ToastContext
import "../Style/LoginModal.css";
import api from "../api";

function LoginSection({ onClose }) {
  const { showToast } = useToast(); // Initialize context method

  const [view, setView] = useState("login"); // 'login', 'signup', 'verify', 'forgot', 'reset'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockdownTimeLeft, setLockdownTimeLeft] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(4);

  // Password validation states
  const [passwordCriteria, setPasswordCriteria] = useState({
    minLength: false,
    hasCapital: false,
    hasSpecial: false,
  });

  // Validate password in real-time
  useEffect(() => {
    setPasswordCriteria({
      minLength: password.length >= 8,
      hasCapital: /[A-Z]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  // Sync state with localStorage whenever email or view changes
  useEffect(() => {
    if (!email || view !== "login") {
      setIsAccountLocked(false);
      setAttemptsRemaining(4);
      return;
    }

    // 1. Check if there is an active lockout for this email
    const storedExpiry = localStorage.getItem(`lockout_${email}`);
    if (storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      const now = Date.now();
      
      if (expiryTime > now) {
        setIsAccountLocked(true);
        setLockdownTimeLeft(Math.ceil((expiryTime - now) / 1000));
        setAttemptsRemaining(0);
        return;
      } else {
        // Lockout expired, clean up
        localStorage.removeItem(`lockout_${email}`);
        localStorage.removeItem(`attempts_${email}`);
        setIsAccountLocked(false);
        setAttemptsRemaining(4);
      }
    } else {
      setIsAccountLocked(false);
    }

    // 2. Check remaining attempts if not locked
    const storedAttempts = localStorage.getItem(`attempts_${email}`);
    if (storedAttempts !== null) {
      setAttemptsRemaining(parseInt(storedAttempts, 10));
    } else {
      setAttemptsRemaining(4);
    }
  }, [email, view]);

  // Countdown timer for lockout
  useEffect(() => {
    if (!isAccountLocked || lockdownTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setLockdownTimeLeft((prev) => {
        if (prev <= 1) {
          setIsAccountLocked(false);
          setAttemptsRemaining(4);
          localStorage.removeItem(`lockout_${email}`);
          localStorage.removeItem(`attempts_${email}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAccountLocked, lockdownTimeLeft, email]);

  const isPasswordValid =
    passwordCriteria.minLength &&
    passwordCriteria.hasCapital &&
    passwordCriteria.hasSpecial;

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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      
      // ===== CRITICAL: Clear ALL old session data before setting new =====
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("role");
      localStorage.removeItem("firstName");
      localStorage.removeItem("lastName");
      localStorage.removeItem("email");
      localStorage.removeItem(`lockout_${email}`);
      localStorage.removeItem(`attempts_${email}`);

      // Now set the fresh session data
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("userRole", res.data.user.role);
      localStorage.setItem("email", res.data.user.email);
      localStorage.setItem("firstName", res.data.user.firstName);
      localStorage.setItem("lastName", res.data.user.lastName);
      localStorage.setItem("role", res.data.user.role);
      
      // Force a full page reload to break any stale in-memory state
      if (res.data.user.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.reload();
      }
    } catch (err) {
      if (err.response?.status === 429) {
        const errMsg = err.response?.data?.error || "Account locked";
        const remainingTime = err.response?.data?.remainingTime || 900;
        setError(errMsg);
        setIsAccountLocked(true);
        setLockdownTimeLeft(remainingTime);
        setAttemptsRemaining(0);

        // Store lockout expiration in localStorage
        const expiryTimestamp = Date.now() + remainingTime * 1000;
        localStorage.setItem(`lockout_${email}`, expiryTimestamp);
        localStorage.setItem(`attempts_${email}`, 0);
      } else {
        const errMsg = err.response?.data?.error || "Login failed.";
        const remaining = err.response?.data?.attemptsRemaining ?? 4;
        setAttemptsRemaining(remaining);
        
        // Store remaining attempts count in localStorage
        localStorage.setItem(`attempts_${email}`, remaining);

        if (remaining > 0) {
          setError(`${errMsg} (${remaining} attempt${remaining !== 1 ? "s" : ""} remaining)`);
        } else {
          setError(errMsg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (error === "Email already in use") return;

    if (!isPasswordValid) {
      const errMsg = "Please meet all password requirements.";
      setError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    if (password !== confirmPassword) {
      const errMsg = "Passwords do not match.";
      setError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/signup", {
        firstName,
        lastName,
        email,
        password,
      });
      showToast("OTP sent to " + email, "success");
      setView("verify");
    } catch (err) {
      if (err.response?.status === 429) {
        const errMsg = "Too many OTP requests, please try again later.";
        setError(errMsg);
        showToast(errMsg, "error");
      } else {
        const errMsg = err.response?.data?.error || "Signup failed";
        setError(errMsg);
        showToast(errMsg, "error");
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
      await api.post("/auth/forgot-password", { email });
      showToast("Reset link sent to your email!", "success");
      setView("login");
    } catch (err) {
      const errMsg = err.response?.data?.error || "User not found.";
      setError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", {
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
      showToast("Verification failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const LoadingSpinner = () => (
    <div className="login-loading-spinner">
      <div className="spinner"></div>
      <p>Processing...</p>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>

        {loading ? (
          <LoadingSpinner />
        ) : (
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
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
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

                {/* Account Lockout Warning */}
                {isAccountLocked && view === "login" && (
                  <div
                    style={{
                      backgroundColor: "#ffe5e5",
                      border: "1px solid #ff6b6b",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      marginBottom: "16px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        color: "#c92a2a",
                        margin: "0 0 8px 0",
                        fontSize: "17px",
                        fontWeight: "bold",
                      }}
                    >
                      Account Locked!
                    </p>
                    <p
                      style={{
                        color: "#c92a2a",
                        margin: "0 0 6px 0",
                        fontSize: "15px",
                      }}
                    >
                      {error || "Too many failed login attempts, Please try again in:"}
                    </p>
                    <p
                      style={{
                        color: "#cf3e3e",
                        margin: "0",
                        fontSize: "18px",
                        fontWeight: "bold",
                      }}
                    >
                      
                      <span style={{ color: "#000000" }}>
                        {Math.floor(lockdownTimeLeft / 60)}:
                        {(lockdownTimeLeft % 60).toString().padStart(2, "0")}
                      </span>
                    </p>
                  </div>
                )}

                {/* Generic Error Message - Always visible when error is set */}
                {error && view === "login" && !isAccountLocked && (
                  <div
                    style={{
                      backgroundColor: attemptsRemaining > 0 && attemptsRemaining < 4 ? "#e42222" : "#ff4444",
                      border: "1px solid #c92a2a96",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      marginBottom: "16px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        color: "#fffefe",
                        margin: "0",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {error}
                    </p>
                  </div>
                )}

                <form
                  onSubmit={
                    view === "login" ? handleLoginSubmit : handleSignUpSubmit
                  }
                >
                  {view === "signup" && (
                    <>
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        placeholder="Enter your first name"
                        className="login-input"
                        value={firstName}
                        onChange={(e) =>
                          setFirstName(
                            e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                          )
                        }
                        required
                      />

                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        placeholder="Enter your last name"
                        className="login-input"
                        value={lastName}
                        onChange={(e) =>
                          setLastName(
                            e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                          )
                        }
                        required
                      />
                    </>
                  )}

                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="login-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    required
                    autoComplete="email"
                  />

                  {/* PASSWORD FIELD */}
                  <label className="form-label">Password</label>
                  <div className="password-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="login-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <EyeIcon
                      visible={showPassword}
                      toggle={() => setShowPassword(!showPassword)}
                    />
                  </div>

                  {/* Password Criteria - Only show on Signup */}
                  {view === "signup" && password && (
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

                  {/* CONFIRM PASSWORD FIELD */}
                  {view === "signup" && (
                    <>
                      <label className="form-label">Confirm Password</label>
                      <div className="password-container">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="login-input"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                        />
                        <EyeIcon
                          visible={showConfirmPassword}
                          toggle={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={
                      loading ||
                      isAccountLocked ||
                      error === "Email already in use" ||
                      (view === "signup" && !isPasswordValid)
                    }
                  >
                    {isAccountLocked && view === "login"
                      ? "ACCOUNT LOCKED"
                      : loading
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
                        setPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      {view === "login" ? "Sign up" : "Back to Sign In"}
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginSection;
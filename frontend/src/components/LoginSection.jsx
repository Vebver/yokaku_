import React, { useState } from "react";
import VerifyEmail from "./VerifyEmail";
import "../Style/LoginModal.css";
import axios from 'axios';

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
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      // Shared token for admin/public
      // Check role from response
        if (res.data.user.role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/';
        }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (password.length >= 8 && password === confirmPassword) {
      try {
        await axios.post('/api/auth/signup', { firstName, lastName, email });
        alert('OTP sent to ' + email);
        setView("verify");
      } catch (err) {
        setError(err.response?.data?.error || 'Signup failed');
      }
    }
  };

  const handleVerifyOTP = async (code) => {
    try {
      const res = await axios.post('/api/auth/verifyOTP', { email, otp: code });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/';
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Verification failed');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>

        {/* 
          IMPORTANT: By putting the 'key={view}' on this div, 
          EVERY time the view changes, the entire content will 
          trigger the slideUp/fadeIn animation. 
        */}
        <div key={view} className="fade-in">
{view === "verify" ? (
            <VerifyEmail
              email={email}
              onVerify={handleVerifyOTP}
              onBack={() => setView("signup")}
              onResend={async () => {
                try {
                  await axios.post('/api/auth/signup', { firstName, lastName, email });
                  alert('OTP resent to ' + email);
                } catch (err) {
                  setError('Resend failed');
                }
              }}
            /> 
          ) : (
            <>
              <h2>{view === "login" ? "LOGIN" : "SIGN UP"}</h2>

                <form
                  onSubmit={
                    view === "login"
                      ? handleLoginSubmit
                      : handleSignUpSubmit
                  }
                >
                <input
                  type="text"
                  placeholder="Last Name"
                  className="login-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="First Name"
                  className="login-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                /> 

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
                      stroke="currentColor" /* This will use the white color from your CSS */
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="eye-svg"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>

                      {/* This line (the slash) appears only when password is HIDDEN */}
                      {!showPassword && <line x1="3" y1="3" x2="21" y2="21" />}
                    </svg>
                  </span>
                </div>

                {password.length > 0 && password.length < 8 && (
                  <p className="password-warning">
                    Password must be at least 8 characters.
                  </p>
                )}

                {
                  /*Sign up*/ view === "signup" && (
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
                      {confirmPassword && password !== confirmPassword && (
                        <p className="password-warning">
                          Passwords do not match.
                        </p>
                      )}
                    </>
                  )
                }

                {error && <p className="password-warning">{error}</p>}
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || (password.length < 8 || (view === "signup" && password !== confirmPassword))}
                >
                  {view === "login" ? "SUBMIT" : "CREATE ACCOUNT"}
                </button>

                <p className="signup-text">
                  {view === "login"
                    ? "Don't have an account? "
                    : "Already have an account? "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() =>
                      setView(view === "login" ? "signup" : "login")
                    }
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

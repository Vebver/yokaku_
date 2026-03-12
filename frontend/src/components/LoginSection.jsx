import React, { useState } from "react";
import VerifyEmail from "./VerifyEmail";
import "../Style/LoginModal.css";

function LoginSection({ onClose }) {
  const [view, setView] = useState("login"); // 'login', 'signup', 'verify'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    if (password.length >= 8 && password === confirmPassword) {
      setView("verify");
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
              onVerify={(code) => {
                alert("Success!");
                onClose();
              }}
              onBack={() => setView("signup")}
            />
          ) : (
            <>
              <h2>{view === "login" ? "LOGIN" : "SIGN UP"}</h2>

              <form
                onSubmit={
                  view === "login"
                    ? (e) => e.preventDefault()
                    : handleSignUpSubmit
                }
              >
                {view === "signup" && (
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="login-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                )}

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

                {password.length > 0 && password.length < 8 && (
                  <p className="password-warning">
                    Password must be at least 8 characters.
                  </p>
                )}

                {/*Sign up*/view === "signup" && (
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
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                )}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={
                    password.length < 8 ||
                    (view === "signup" && password !== confirmPassword)
                  }
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

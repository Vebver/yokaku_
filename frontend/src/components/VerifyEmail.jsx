import React, { useState, useRef, useEffect } from "react";
import "../Style/LoginModal.css"; // Reusing your existing CSS

function VerifyEmail({ email, onVerify, onResend, onBack }) {
  // Array of 6 strings for the 6 input boxes
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);

  // Handle typing in a box
  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input automatically
    if (element.value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCode = otp.join("");
    onVerify(finalCode);
  };

  // Inside VerifyEmail.jsx, ensure the top-level return looks like this:
  return (
    <div className="verify-wrapper">
      {" "}
      {/* A simple wrapper instead of a new modal-content */}
      <h2 className="verify-title">VERIFY EMAIL</h2>
      <p className="verify-desc">
        We sent a 6-digit code to <br />
        <span className="user-email">{email}</span>
      </p>
      <form onSubmit={handleSubmit}>
        <div className="otp-container">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              className="otp-input"
              value={data}
              ref={(el) => (inputRefs.current[index] = el)}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            />
          ))}
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={otp.join("").length < 6}
        >
          VERIFY
        </button>

        <div className="verify-footer">
          <p>Didn't receive the code?</p>
          <button type="button" className="resend-btn" onClick={onResend}>
            Resend Code
          </button>
          <button type="button" className="link-btn" onClick={onBack}>
            Back to Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}

export default VerifyEmail;

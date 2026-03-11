import React, { useState } from 'react';
import '../Style/LoginModal.css';

function LoginSection({ onClose }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <h2>LOGIN</h2>
        <form onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="Email" className="login-input" required />

          <div className="password-container">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              className="login-input" 
              required
            />
            
            {/* SVG Eye Icon */}
            <span className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
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
                {/* The main eye shape */}
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
                
                {/* The "Slash" line - only shows when showPassword is false */}
                {!showPassword && (
                  <line x1="3" y1="3" x2="21" y2="21" />
                )}
              </svg>
            </span>
          </div>

          <button type="submit" className="submit-btn">SUBMIT</button>
          <p className="signup-text">Don't have an account? <a href="#signup">Sign up</a></p>
        </form>
      </div>
    </div>
  );
}

export default LoginSection;
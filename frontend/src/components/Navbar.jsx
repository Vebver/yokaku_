import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Style/Navbar.css';

function Navbar({ onLoginClick, isLoggedIn, onLogout, onProfile }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = ['HOME', 'MENU', 'ABOUT', 'PROMOS', 'FEEDBACKS', 'CONTACT'];

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleAction = (callback) => {
    setIsMenuOpen(false);
    callback();
  };

  return (
    <header className="navbar">
      {/* Logo restored to its original form (not a link) */}
      <div className="logo">HANGOUT</div>

      {/* --- DESKTOP NAVIGATION --- */}
      {/* This nav-menu disappears on mobile via CSS */}
      <nav className="nav-menu">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              <a href={`#${item.toLowerCase()}-section`}>{item}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="auth-buttons">
        <div className="burger-container">
          
          <div className={`burger-icon ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
            <div className="bar1"></div>
            <div className="bar2"></div>
            <div className="bar3"></div>
          </div>

          {isMenuOpen && (
            <div className="burger-dropdown">
              
              {/* --- MOBILE ONLY LINKS --- */}
              {/* These appear inside the burger ONLY on small screens */}
              <div className="mobile-nav-links">
                {navItems.map((item, index) => (
                  <a key={index} href={`#${item.toLowerCase()}-section`} onClick={() => setIsMenuOpen(false)}>
                    {item}
                  </a>
                ))}
                <div className="dropdown-divider"></div>
              </div>

              {/* --- ACCOUNT LINKS --- */}
              <div className="dropdown-item" onClick={() => handleAction(onProfile || (() => navigate('/profile')))}>
                Profile
              </div>

              {!isLoggedIn ? (
                <div className="dropdown-item login-highlight" onClick={() => handleAction(onLoginClick)}>
                  Login
                </div>
              ) : (
                <div className="dropdown-item logout-text" onClick={() => handleAction(onLogout || (() => {
                  localStorage.removeItem('token');
                  window.location.href = '/';
                }))}>
                  Logout
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
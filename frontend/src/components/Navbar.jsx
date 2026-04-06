import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../Style/Navbar.css';

function Navbar({ onLoginClick, isLoggedIn, onLogout, onProfile }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = ['HOME', 'MENU', 'ABOUT', 'PROMOS', 'FEEDBACKS', 'CONTACT'];

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleAction = (callback) => {
    setIsMenuOpen(false);
    if (callback) callback();
  };

  const getNavLink = (item) => {
    if (item === 'HOME') return '/';
    const sectionId = `#${item.toLowerCase()}-section`;
    return location.pathname === '/' ? sectionId : `/${sectionId}`;
  };
  
  return (
    <header className="navbar">
      <div className="logo">HANGOUT</div>

      {/* --- DESKTOP NAVIGATION (Hidden on Mobile) --- */}
      <nav className="nav-menu">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              <a href={getNavLink(item)}>{item}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="auth-section">
        {/* DESKTOP-ONLY LOGIN BUTTON: Only shows when logged out and NOT on mobile */}
        {!isLoggedIn && (
          <button className="nav-login-btn desktop-only" onClick={onLoginClick}>
            LOGIN
          </button>
        )}

        {/* HAMBURGER: 
            - Always visible on mobile. 
            - On desktop, only visible if logged in. 
        */}
        <div className={`burger-container ${isLoggedIn ? 'force-show' : 'mobile-only'}`}>
          <div className={`burger-icon ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
            <div className="bar1"></div>
            <div className="bar2"></div>
            <div className="bar3"></div>
          </div>

          {isMenuOpen && (
            <div className="burger-dropdown">
              {/* These links only show inside burger on mobile */}
              <div className="mobile-nav-links">
                {navItems.map((item, index) => (
                  <a key={index} href={getNavLink(item)} onClick={() => setIsMenuOpen(false)}>
                    {item}
                  </a>
                ))}
                <div className="dropdown-divider"></div>
              </div>

              {/* Dynamic Auth Links inside Burger */}
              {!isLoggedIn ? (
                <div className="dropdown-item login-highlight" onClick={() => handleAction(onLoginClick)}>
                  Login
                </div>
              ) : (
                <>
                  <div className="dropdown-item" onClick={() => handleAction(onProfile || (() => navigate('/profile')))}>
                    Profile
                  </div>
                  <div className="dropdown-item logout-text" onClick={() => handleAction(onLogout || (() => {
                    localStorage.removeItem('token');
                    window.location.href = '/';
                  }))}>
                    Logout
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
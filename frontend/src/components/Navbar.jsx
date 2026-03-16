import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // 1. Added useLocation
import '../Style/Navbar.css';

function Navbar({ onLoginClick, isLoggedIn, onLogout, onProfile }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // 2. Get current path
  
  const navItems = ['HOME', 'MENU', 'ABOUT', 'PROMOS', 'FEEDBACKS', 'CONTACT'];

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleAction = (callback) => {
    setIsMenuOpen(false);
    callback();
  };

  // 3. Helper function to fix the path
  const getNavLink = (item) => {
    if (item === 'HOME') return '/';
    const sectionId = `#${item.toLowerCase()}-section`;
    
    // If we are NOT on the home page, add a "/" before the "#"
    return location.pathname === '/' ? sectionId : `/${sectionId}`;
  };

  return (
    <header className="navbar">
      <div className="logo">HANGOUT</div>

      {/* --- DESKTOP NAVIGATION --- */}
      <nav className="nav-menu">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              {/* Uses the helper function for the href */}
              <a href={getNavLink(item)}>{item}</a>
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
              {/* --- MOBILE NAV LINKS --- */}
              <div className="mobile-nav-links">
                {navItems.map((item, index) => (
                  <a 
                    key={index} 
                    href={getNavLink(item)} // Uses the helper function
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
                <div className="dropdown-divider"></div>
              </div>

              {isLoggedIn && (
                <div className="dropdown-item" onClick={() => handleAction(onProfile || (() => navigate('/profile')))}>
                  Profile
                </div>
              )}

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
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../../Style/Navbar.css';

function CustomerNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Renamed for clarity
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleProfile = () => {
    setIsMenuOpen(false);
    navigate('/profile');
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="navbar">
      <div className="logo">
        <a href="#" onClick={closeMenu} style={{ textDecoration: 'none', color: 'inherit' }}>
          HANGOUT
        </a>
      </div>

      {/* --- DESKTOP NAVIGATION (Hidden on mobile) --- */}
      <nav className="nav-menu-desktop">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              <a href={`#${item.toLowerCase()}-section`}>{item}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="auth-section">
        {/* --- BURGER ICON --- */}
        <div className={`burger-icon ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <div className="line1"></div>
          <div className="line2"></div>
          <div className="line3"></div>
        </div>

        {/* --- BURGER DROPDOWN MENU --- */}
        {isMenuOpen && (
          <div className="burger-dropdown">
            <div className="user-info">
               <img src="/customer-avatar.jpg" alt="User" className="avatar-small" />
               <span>Customer</span>
            </div>
            <hr />
            
            {/* Mobile Nav Links */}
            <div className="mobile-nav-links">
              {navItems.map((item, index) => (
                <a key={index} href={`#${item.toLowerCase()}-section`} onClick={closeMenu}>
                  {item}
                </a>
              ))}
            </div>
            
            <hr />
            <div className="dropdown-item" onClick={handleProfile}>Profile</div>
            <div className="dropdown-item logout" onClick={handleLogout}>Logout</div>
          </div>
        )}
      </div>
    </header>
  );
}

export default CustomerNavbar;
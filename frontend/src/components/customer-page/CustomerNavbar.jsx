import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../../Style/Navbar.css';

function CustomerNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Define navItems so the map function works
  const navItems = ['HOME', 'MENU', 'ABOUT', 'PROMOS', 'FEEDBACKS', 'CONTACT'];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    closeMenu();
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleProfile = () => {
    closeMenu();
    navigate('/profile'); // This matches the route in your App.js
  };

  return (
    <header className="navbar">
      <div className="logo">
        <a href="/" onClick={closeMenu} style={{ textDecoration: 'none', color: 'inherit' }}>
          HANGOUT
        </a>
      </div>

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
        <div className={`burger-icon ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <div className="line1"></div>
          <div className="line2"></div>
          <div className="line3"></div>
        </div>

        {isMenuOpen && (
          <div className="burger-dropdown shadow-lg">
            <div className="user-info p-3 d-flex align-items-center">
               <img src="/customer-avatar.jpg" alt="User" className="rounded-circle me-2" style={{width: '40px', height: '40px', objectFit: 'cover'}} />
               <span className="fw-bold">Customer</span>
            </div>
            <hr className="m-0" />
            
            <div className="mobile-nav-links d-md-none">
              {navItems.map((item, index) => (
                <a key={index} href={`#${item.toLowerCase()}-section`} onClick={closeMenu} className="dropdown-item">
                  {item}
                </a>
              ))}
              <hr className="m-0" />
            </div>
            
            <div className="dropdown-item p-3" onClick={handleProfile} style={{cursor: 'pointer'}}>Profile</div>
            <div className="dropdown-item p-3 text-danger" onClick={handleLogout} style={{cursor: 'pointer'}}>Logout</div>
          </div>
        )}
      </div>
    </header>
  );
}

export default CustomerNavbar;
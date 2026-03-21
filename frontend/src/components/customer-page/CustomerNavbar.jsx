import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../Style/Navbar.css";

function CustomerNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount] = useState(3);
  const navigate = useNavigate();

  const navItems = ["HOME", "MENU", "ABOUT", "PROMOS", "FEEDBACKS", "CONTACT"];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    closeMenu();
    localStorage.clear();
    window.location.href = "/";
  };

  const handleProfile = () => {
    closeMenu();
    navigate("/profile");
  };

  // --- ADD THIS FUNCTION ---
  const handleNotifications = () => {
    closeMenu();
    navigate("/notifications");
  };

  return (
    <header className="navbar">
      <div className="logo">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
            closeMenu();
          }}
          style={{ textDecoration: "none", color: "inherit" }}
        >
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
        {/* NOTIFICATION BELL */}
        <div
          className="notification-container"
          onClick={() => {
            navigate("/notifications");
            closeMenu();
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffcc00"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="notification-badge">3</span>
        </div>

        {/* BURGER ICON */}
        <div
          className={`burger-icon ${isMenuOpen ? "open" : ""}`}
          onClick={toggleMenu}
        >
          <div className="line1"></div>
          <div className="line2"></div>
          <div className="line3"></div>
        </div>

        {/* DROPDOWN MENU */}
        {isMenuOpen && (
          <div className="burger-dropdown shadow-lg">
            <div className="user-info p-3 d-flex align-items-center">
              <img
                src="/customer-avatar.jpg"
                alt="User"
                className="rounded-circle me-2"
                style={{ width: "40px", height: "40px", objectFit: "cover" }}
              />
              <span className="fw-bold" style={{ color: "#fff" }}>
                Customer
              </span>
            </div>
            <hr className="m-0" />

            {/* 1. Notifications Link */}
            <div
              className="dropdown-item p-3"
              onClick={() => {
                navigate("/notifications");
                closeMenu();
              }}
              style={{ cursor: "pointer", color: "white" }}
            >
              Notifications
            </div>

            {/* 2. Profile Link */}
            <div
              className="dropdown-item p-3"
              onClick={handleProfile}
              style={{ cursor: "pointer", color: "white" }}
            >
              Profile
            </div>

            {/* 3. Logout Link */}
            <div
              className="dropdown-item p-3 text-danger"
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              Logout
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default CustomerNavbar;

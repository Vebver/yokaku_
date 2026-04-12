import React, { useState, useEffect, use } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../../Style/Navbar.css";

function CustomerNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return; // No token, user not logged in

        const res = await axios.get("http://localhost:5000/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const unread = res.data.some((n) => !n.is_read);
        setHasUnread(unread);
      } catch (error) {
        console.error("Error checking notifications:", error);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [location.pathname]); // Re-run when route changes to update notification status

  const navItems = ["HOME", "MENU", "ABOUT", "PROMOS", "FEEDBACKS", "CONTACT"];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    closeMenu();
    localStorage.clear(); // Clears token so user is logged out
    window.location.href = "/"; // Force refresh to landing page
  };

  // --- NAVIGATION LOGIC ---
  const handleLogoClick = (e) => {
    e.preventDefault();
    closeMenu();
    // If already on customer page, just scroll to top
    if (location.pathname === "/customer") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/customer");
    }
  };

  const handleNavClick = (e, item) => {
    if(e) e.preventDefault();
    closeMenu();

    // 1. HOME logic: Just go to /customer top
    if (item === "HOME") {
      if (location.pathname === "/customer") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        navigate("/customer");
      }
      return;
    }

    // 2. SCROLL logic for other sections
    const sectionId = `${item.toLowerCase()}-section`;

    if (location.pathname === "/customer") {
      // If already on /customer, scroll immediately
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // If on /notifications or /profile, go home first, then scroll
      navigate("/customer");
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100); // Small delay to allow the page to load
    }
  };

  return (
    <header className="navbar">
      <div className="logo">
        <div
          onClick={handleLogoClick}
          style={{ cursor: "pointer", fontWeight: "900" }}
        >
          HANGOUT
        </div>
      </div>

      <nav className="nav-menu">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              <a
                href={`#${item.toLowerCase()}-section`}
                onClick={(e) => handleNavClick(e, item)}
              >
                {item}
              </a>
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
          {/* RED DOT */}
          {hasUnread && <span className="notification-dot"></span>}
        </div>

        {/* BURGER MENU */}
        <div className="burger-container">
          <div
            className={`burger-icon ${isMenuOpen ? "open" : ""}`}
            onClick={toggleMenu}
          >
            <div className="bar1"></div>
            <div className="bar2"></div>
            <div className="bar3"></div>
          </div>

          {/* DROPDOWN MENU */}
          {isMenuOpen && (
            <div className="burger-dropdown shadow-lg">
              {/* --- ADD THIS WRAPPER CLASS --- */}
              <div className="mobile-nav-links">
                {navItems.map((item, index) => (
                  <div
                    key={index}
                    className="dropdown-item"
                    onClick={(e) => handleNavClick(e, item)}
                  >
                    {item}
                  </div>
                ))}
                <div className="dropdown-divider"></div>
              </div>
              {/* These remain visible on both Desktop and Mobile */}
              <div
                className="dropdown-item"
                onClick={() => {
                  navigate("/notifications");
                  closeMenu();
                }}
              >
                Notifications
              </div>
              <div
                className="dropdown-item"
                onClick={() => {
                  navigate("/profile");
                  closeMenu();
                }}
              >
                Profile
              </div>
              <div className="dropdown-item logout-text" onClick={handleLogout}>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default CustomerNavbar;

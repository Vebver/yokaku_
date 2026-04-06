import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

// Imports
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturedMenu from "./components/FeaturedMenu";
import AboutSection from "./components/AboutSection";
import PromoSection from "./components/PromoSection";
import ReviewsSection from "./components/ReviewsSection";
import Footer from "./components/Footer";
import LoginSection from "./components/LoginSection";
import AdminDashboard from "./components/admin-page/AdminDashboard.jsx";
import Reservation from "./components/Reservation";
import CustomerPage from "./components/customer-page/CustomerPage";
import CustomerProfile from "./components/customer-page/CustomerProfile";
import CustomerNavbar from "./components/customer-page/CustomerNavbar.jsx";
import Notifications from "./components/customer-page/Notifications";
import KioskSelection from "./components/kiosk-page/KioskSelection.jsx";
import KioskMenu from "./components/kiosk-page/KioskMenu.jsx";
import KioskReservation from "./components/kiosk-page/KioskReservation.jsx";
import KioskReservationMenu from "./components/kiosk-page/KioskReservationMenu.jsx";
import "./Style/App.css";

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  const handleReservationSuccess = () => {
    // 1. Close the first modal
    setIsReservationOpen(false);

    // 2. Wait for the DOM to clean up the first modal before injecting the new one
    setTimeout(() => {
      setShowSuccessMessage(true);
    }, 200);
  };

  return (
    <Router>
      <div id="app">
        {/* NavbarWrapper decides which navbar to show */}
        <NavbarWrapper
          onLoginClick={() => setIsLoginOpen(true)}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
        />

        <Routes>
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Navigate to="/customer" replace />
              ) : (
                <>
                  <HeroSection
                    isLoggedIn={isLoggedIn}
                    onLoginClick={() => setIsLoginOpen(true)}
                    onReserveClick={() => setIsReservationOpen(true)}
                  />
                  <div id="menu-section">
                    <FeaturedMenu />
                  </div>
                  <div id="about-section">
                    <AboutSection />
                  </div>
                  <div id="promos-section">
                    <PromoSection />
                  </div>
                  <ReviewsSection />
                  <Footer />
                </>
              )
            }
          />

          {/* PROTECTED ROUTES */}
          {/* Inside App.jsx Routes */}
          <Route
            path="/customer"
            element={
              isLoggedIn ? (
                <CustomerPage
                  onReserveClick={() => setIsReservationOpen(true)}
                  onSuccess={handleReservationSuccess} // <--- Make sure this is added in App.jsx
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/profile"
            element={
              isLoggedIn ? <CustomerProfile /> : <Navigate to="/" replace />
            }
          />

          <Route
            path="/notifications"
            element={
              isLoggedIn ? <Notifications /> : <Navigate to="/" replace />
            }
          />

          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/kiosk-selection" element={<KioskSelection />} />
          <Route path="/kiosk-selection/kiosk-menu" element={<KioskMenu />} />
          <Route
            path="/kiosk-selection/kiosk-reservation"
            element={<KioskReservation />}
          />
          <Route
            path="/kiosk-selection/kiosk-reservation-menu"
            element={<KioskReservationMenu />}
          />
        </Routes>

        {/* MODALS */}
        {isLoginOpen && <LoginSection onClose={() => setIsLoginOpen(false)} />}

        {isReservationOpen && (
          <Reservation
            onClose={() => setIsReservationOpen(false)}
            onSuccess={handleReservationSuccess} // Triggers the transition
            testProp="I AM WORKING"
          />
        )}

        {/* SUCCESS MESSAGE MODAL */}
        {showSuccessMessage && (
          <ReservationSuccess onClose={() => setShowSuccessMessage(false)} />
        )}
      </div>
    </Router>
  );
}

/**
 * SUCCESS MESSAGE COMPONENT
 * Styled using your existing Reservation.css classes
 */
const ReservationSuccess = ({ onClose }) => {
  return (
    /* Add 'display: flex' here to be 100% sure it shows */
    <div
      className="res-modal-overlay"
      style={{ display: "flex", zIndex: 9999999 }}
    >
      <div
        className="res-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ textAlign: "center" }}
      >
        <div
          style={{ fontSize: "60px", color: "#ffcc00", marginBottom: "20px" }}
        >
          ✔
        </div>
        <h2 className="res-title">SUBMITTED SUCCESSFULLY</h2>
        <p style={{ color: "#333", margin: "20px 0", fontSize: "16px" }}>
          Your reservation request has been received. <br />
          <strong>
            Please wait for an email regarding your reservation status.
          </strong>
        </p>
        <button className="res-btn-continue" onClick={onClose}>
          OKAY
        </button>
      </div>
    </div>
  );
};

const NavbarWrapper = ({ onLoginClick, isLoggedIn, onLogout }) => {
  const location = useLocation();

  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/cashier-selection") ||
    location.pathname.startsWith("/kiosk-selection")
  ) {
    return null;
  }

  if (isLoggedIn) {
    return <CustomerNavbar onLogout={onLogout} />;
  }

  return (
    <Navbar
      onLoginClick={onLoginClick}
      isLoggedIn={isLoggedIn}
      onLogout={onLogout}
    />
  );
};

export default App;

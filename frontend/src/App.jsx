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
import KitchenPage from "./components/kitchen-page/KitchenPage.jsx";
import TableReservation from "./components/TableReservation.jsx";
import TermsModal from "./components/TermsModal"; // Import TermsModal

import "./Style/App.css";

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showTerms, setShowTerms] = useState(false); // New state for T&C
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
    setShowSuccessMessage(true);
  };

  // Logic: When terms are accepted, go to the reservation page
  const handleAcceptTerms = () => {
    setShowTerms(false);
    window.location.href = "/tablereservation";
  };

  return (
    <Router>
      <div id="app">
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
                    // Intercept with Terms
                    onReserveClick={() => setShowTerms(true)}
                  />
                  <div id="menu-section"><FeaturedMenu /></div>
                  <div id="about-section"><AboutSection /></div>
                  <div id="promos-section"><PromoSection /></div>
                  <ReviewsSection />
                  <Footer />
                </>
              )
            }
          />

          <Route 
            path="/tablereservation" 
            element={
              <TableReservation 
                onClose={() => (window.location.href = isLoggedIn ? "/customer" : "/")} 
                onSuccess={handleReservationSuccess} 
              />
            } 
          />

          <Route
            path="/customer"
            element={
              isLoggedIn ? (
                <CustomerPage
                  onReserveClick={() => setShowTerms(true)} // Intercept with Terms
                  onSuccess={handleReservationSuccess} 
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route path="/profile" element={isLoggedIn ? <CustomerProfile /> : <Navigate to="/" replace />} />
          <Route path="/notifications" element={isLoggedIn ? <Notifications /> : <Navigate to="/" replace />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/kiosk-selection" element={<KioskSelection />} />
          <Route path="/kiosk-selection/kiosk-menu" element={<KioskMenu />} />
          <Route path="/kitchen-page" element={<KitchenPage/>} />
          <Route path="/kiosk-selection/kiosk-reservation" element={<KioskReservation />} />
          <Route path="/kiosk-selection/kiosk-reservation-menu" element={<KioskReservationMenu />} />
        </Routes>

        {isLoginOpen && <LoginSection onClose={() => setIsLoginOpen(false)} />}

        {/* TERMS AND CONDITIONS MODAL */}
        <TermsModal 
          isOpen={showTerms} 
          onClose={() => setShowTerms(false)} 
          onAccept={handleAcceptTerms} 
        />

        {showSuccessMessage && (
          <ReservationSuccess 
            onClose={() => {
              setShowSuccessMessage(false);
              window.location.href = isLoggedIn ? "/customer" : "/";
            }} 
          />
        )}
      </div>
    </Router>
  );
}

const ReservationSuccess = ({ onClose }) => {
  return (
    <div className="res-modal-overlay" style={{ display: "flex", zIndex: 9999999 }}>
      <div className="res-modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <div style={{ fontSize: "60px", color: "#ffcc00", marginBottom: "20px" }}>✔</div>
        <h2 className="res-title">SUBMITTED SUCCESSFULLY</h2>
        <p style={{ color: "#333", margin: "20px 0", fontSize: "16px" }}>
          Your reservation request has been received. <br />
          <strong>Please wait for an email regarding your reservation status.</strong>
        </p>
        <button className="res-btn-continue" onClick={onClose}>OKAY</button>
      </div>
    </div>
  );
};

const NavbarWrapper = ({ onLoginClick, isLoggedIn, onLogout }) => {
  const location = useLocation();
  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/cashier-selection") ||
    location.pathname.startsWith("/kiosk-selection") ||
    location.pathname.startsWith("/kitchen-page") ||
    location.pathname === "/tablereservation"
  ) { return null; }
  if (isLoggedIn) { return <CustomerNavbar onLogout={onLogout} />; }
  return <Navbar onLoginClick={onLoginClick} isLoggedIn={isLoggedIn} onLogout={onLogout} />;
};

export default App;
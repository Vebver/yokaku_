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
// import Reservation from "./components/Reservation";
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

import "./Style/App.css";

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  // Removed isReservationOpen as we are moving to a Route-based page
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
    // Show success message and ensure we are back on a main page
    setShowSuccessMessage(true);
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
                    // Redirect to the new path
                    onReserveClick={() => (window.location.href = "/tablereservation")}
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

          {/* NEW TABLE RESERVATION ROUTE */}
          <Route 
            path="/tablereservation" 
            element={
              <TableReservation 
                onClose={() => (window.location.href = isLoggedIn ? "/customer" : "/")} 
                onSuccess={handleReservationSuccess} 
                testProp="I AM WORKING"
              />
            } 
          />

          {/* PROTECTED ROUTES */}
          <Route
            path="/customer"
            element={
              isLoggedIn ? (
                <CustomerPage
                  onReserveClick={() => (window.location.href = "/tablereservation")}
                  onSuccess={handleReservationSuccess} 
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
          <Route path="/kitchen-page" element={<KitchenPage/>} />
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

        {/* SUCCESS MESSAGE MODAL */}
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

const ReservationSuccess = ({ onClose }) => (
  <div className="res-modal-overlay">
    <div className="res-modal-content" style={{ textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '50px' }}>✅</div>
      <h2 style={{ color: '#ffcc00', fontWeight: '900' }}>RESERVATION CONFIRMED!</h2>
      {/* CHANGE THIS LINE BELOW */}
      <p>Your reservation has been automatically approved. Check your notifications for details.</p> 
      <button 
        className="res-btn-continue" 
        onClick={onClose}
        style={{ marginTop: '20px', width: '100%' }}
      >
        Great, thank you!
      </button>
    </div>
  </div>
);

const NavbarWrapper = ({ onLoginClick, isLoggedIn, onLogout }) => {
  const location = useLocation();

  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/cashier-selection") ||
    location.pathname.startsWith("/kiosk-selection") ||
    location.pathname.startsWith("/kitchen-page") ||
    location.pathname === "/tablereservation" // Hide navbar for reservation page
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
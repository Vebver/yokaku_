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
import CashierSelection from "./components/cashier-page/CashierSelection.jsx";
import CashierDineIn from "./components/cashier-page/CashierDineIn.jsx";
import KioskSelection from "./components/kiosk-page/KioskSelection.jsx";
import KioskMenu from "./components/kiosk-page/KioskMenu.jsx";
import KioskReservation from "./components/kiosk-page/KioskReservation.jsx";
import "./Style/App.css";

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
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
          {/* 
            FIXED HOME ROUTE: 
            If logged in, go to /customer. 
            If not, show guest landing page.
          */}
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
                  <div id="menu-section"><FeaturedMenu /></div>
                  <div id="about-section"><AboutSection /></div>
                  <div id="promos-section"><PromoSection /></div>
                  <ReviewsSection />
                  <Footer />
                </>
              )
            }
          />

          {/* PROTECTED ROUTES */}
          <Route
            path="/customer"
            element={isLoggedIn ? <CustomerPage /> : <Navigate to="/" replace />}
          />

          <Route
            path="/profile"
            element={isLoggedIn ? <CustomerProfile /> : <Navigate to="/" replace />}
          />

          <Route
            path="/notifications"
            element={isLoggedIn ? <Notifications /> : <Navigate to="/" replace />}
          />

          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/cashier-selection" element={<CashierSelection />} />
          <Route path="/cashier-selection/dinein" element={<CashierDineIn />} />
          <Route path="/kiosk-selection" element={<KioskSelection />} />
          <Route path="/kiosk-selection/kiosk-menu" element={<KioskMenu />} />
          <Route path="/kiosk-selection/kiosk-reservation" element={<KioskReservation />} />
        </Routes>

        {/* MODALS */}
        {isLoginOpen && <LoginSection onClose={() => setIsLoginOpen(false)} />}
        {isReservationOpen && (
          <Reservation onClose={() => setIsReservationOpen(false)} />
        )}
      </div>
    </Router>
  );
}

/**
 * FIXED NAVBAR WRAPPER:
 * Correctly switches between Guest Navbar and Customer Navbar
 */
const NavbarWrapper = ({ onLoginClick, isLoggedIn, onLogout }) => {
  const location = useLocation();

  // 1. Hide for Admin
  if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/cashier-selection") || location.pathname.startsWith("/kiosk-selection")) {
    return null;
  }

  // 2. If Logged In, show CustomerNavbar (with the bell)
  if (isLoggedIn) {
    return <CustomerNavbar onLogout={onLogout} />;
  }

  // 3. Otherwise, show standard Navbar
  return (
    <Navbar
      onLoginClick={onLoginClick}
      isLoggedIn={isLoggedIn}
      onLogout={onLogout}
    />
  );
};

export default App;
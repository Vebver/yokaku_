import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";

// Imports
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturedMenu from "./components/FeaturedMenu";
import FullMenu from "./components/FullMenu";
import AboutSection from "./components/AboutSection";
import PromoSection from "./components/PromoSection";
import ReviewsSection from "./components/ReviewsSection";
import Footer from "./components/Footer";
import LoginSection from "./components/LoginSection";
import AdminDashboard from "./components/admin-page/AdminDashboard.jsx";
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
import TermsModal from "./components/TermsModal";
import ResetPasswordPage from "./components/ResetPasswordPage";

import "./Style/App.css";

// 1. MAIN APP COMPONENT
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// 2. SUB-COMPONENT (Handles Logic)
function AppContent() {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [userRole, setUserRole] = useState(localStorage.getItem("role"));

  // --- OFFLINE SYNC LOGIC ---
  // This listener stays active to push orders when internet returns
  useEffect(() => {
    const handleSync = async () => {
      const offlineOrders = JSON.parse(
        localStorage.getItem("offline_orders") || "[]"
      );

      if (offlineOrders.length > 0) {
        console.log(`⚡ Internet Restored! Syncing ${offlineOrders.length} orders...`);

        for (const order of offlineOrders) {
          try {
            await fetch("http://localhost:5000/api/orders/place", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(order),
            });
          } catch (err) {
            console.error("❌ Failed to sync one order, keeping in queue.");
          }
        }

        localStorage.removeItem("offline_orders");
        alert("Kiosk Sync: All offline orders have been sent to the kitchen!");
      }
    };

    window.addEventListener("online", handleSync);
    return () => window.removeEventListener("online", handleSync);
  }, []);

  // Update login status when app loads
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    setIsLoggedIn(!!token);
    setUserRole(role);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setUserRole(null);
    navigate("/");
  };

  const handleReservationSuccess = () => {
    setShowSuccessMessage(true);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessMessage(false);
    if (isLoggedIn) {
      navigate("/customer");
    } else {
      navigate("/");
    }
  };

  const handleAcceptTerms = () => {
    setShowTerms(false);
    navigate("/tablereservation");
  };

  return (
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
              userRole === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/customer" replace />
              )
            ) : (
              <>
                <HeroSection
                  isLoggedIn={isLoggedIn}
                  onLoginClick={() => setIsLoginOpen(true)}
                  onReserveClick={() => navigate("/tablereservation")}
                />
                <div id="menu-section">
                  <FeaturedMenu onLoginClick={() => setIsLoginOpen(true)} />
                </div>
                <div id="about-section">
                  <AboutSection
                    isLoggedIn={isLoggedIn}
                    onLoginClick={() => setIsLoginOpen(true)}
                  />
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

        <Route
          path="/tablereservation"
          element={
            <TableReservation
              onClose={() => navigate(isLoggedIn ? "/customer" : "/")}
              onSuccess={handleReservationSuccess}
            />
          }
        />

        <Route
          path="/customer"
          element={
            isLoggedIn ? (
              userRole === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <CustomerPage
                  isLoggedIn={isLoggedIn}
                  onLoginClick={() => setIsLoginOpen(true)}
                  onReserveClick={() => navigate("/tablereservation")}
                  onSuccess={handleReservationSuccess}
                />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/profile"
          element={isLoggedIn ? <CustomerProfile /> : <Navigate to="/" replace />}
        />
        
        <Route
          path="/notifications"
          element={
            isLoggedIn && userRole !== "admin" ? (
              <Notifications />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/kiosk-selection" element={<KioskSelection />} />
        <Route path="/kiosk-selection/kiosk-menu" element={<KioskMenu />} />
        <Route path="/kitchen-page" element={<KitchenPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route
          path="/kiosk-selection/kiosk-reservation"
          element={<KioskReservation />}
        />
        <Route
          path="/kiosk-selection/kiosk-reservation-menu"
          element={<KioskReservationMenu />}
        />
        <Route path="/menu" element={<FullMenu />} />

        <Route
          path="*"
          element={
            isLoggedIn ? (
              userRole === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/customer" replace />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>

      {isLoginOpen && <LoginSection onClose={() => setIsLoginOpen(false)} />}

      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={handleAcceptTerms}
      />

      {showSuccessMessage && (
        <ReservationSuccess onClose={handleCloseSuccessModal} />
      )}
    </div>
  );
}

// 3. SUCCESS MODAL COMPONENT
const ReservationSuccess = ({ onClose }) => {
  return (
    <div className="res-success-overlay">
      <div className="res-success-card fade-in" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: "50px", color: "#f38d31" }}>✔</div>
        <h2>SUBMITTED SUCCESSFULLY</h2>
        <p>Your reservation request has been received.</p>
        <div className="res-status-text">
          Status: <strong>Confirmed</strong>
        </div>
        <p className="res-info-small">
          Check your notifications for assigned table details and updates.
        </p>
        <button className="res-success-close" onClick={onClose}>
          OKAY
        </button>
      </div>
    </div>
  );
};

// 4. NAVBAR WRAPPER
const NavbarWrapper = ({ onLoginClick, isLoggedIn, onLogout }) => {
  const location = useLocation();

  // Hide Navbar for these specific routes
  const hideNavbarRoutes = [
    "/admin",
    "/cashier-selection",
    "/kiosk-selection",
    "/kitchen-page",
    "/tablereservation",
    "/reset-password"
  ];

  const shouldHide = hideNavbarRoutes.some(route => location.pathname.startsWith(route));

  if (shouldHide) return null;

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
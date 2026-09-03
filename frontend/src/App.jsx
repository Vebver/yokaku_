import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";

// Imports (kept small or essential components)
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturedMenu from "./components/FeaturedMenu";
import AboutSection from "./components/AboutSection";
import PromoSection from "./components/PromoSection";
import ReviewsSection from "./components/ReviewsSection";
import Footer from "./components/Footer";
import LoginSection from "./components/LoginSection";
import CustomerNavbar from "./components/customer-page/CustomerNavbar.jsx";
import TermsModal from "./components/TermsModal";

// Lazy-loaded route components (code-split so each page loads on demand)
const FullMenu = lazy(() => import("./components/FullMenu"));
const AdminDashboard = lazy(() =>
  import("./components/admin-page/AdminDashboard.jsx")
);
const CustomerPage = lazy(() =>
  import("./components/customer-page/CustomerPage")
);
const CustomerProfile = lazy(() =>
  import("./components/customer-page/CustomerProfile")
);
const Notifications = lazy(() =>
  import("./components/customer-page/Notifications")
);
const KioskSelection = lazy(() =>
  import("./components/kiosk-page/KioskSelection.jsx")
);
const KioskMenu = lazy(() => import("./components/kiosk-page/KioskMenu.jsx"));
const KioskReservation = lazy(() =>
  import("./components/kiosk-page/KioskReservation.jsx")
);
const KioskReservationMenu = lazy(() =>
  import("./components/kiosk-page/KioskReservationMenu.jsx")
);
const KitchenPage = lazy(() =>
  import("./components/kitchen-page/KitchenPage.jsx")
);
const Inventory = lazy(() => import("./components/admin-page/Inventory.jsx"));
const TableReservation = lazy(() =>
  import("./components/ReservationSteps.jsx")
);
const ResetPasswordPage = lazy(() =>
  import("./components/ResetPasswordPage")
);
const MyReservation = lazy(() =>
  import("./components/customer-page/MyReservation")
);
const Cashier = lazy(() => import("./components/cashier/Cashier.jsx"));
const FileARefund = lazy(() => import("./components/FileARefund"));

import "./Style/App.css";

// Loading fallback shown while a lazy chunk is being fetched
const PageLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
    }}
  >
    <div className="spinner-border text-primary" role="status"></div>
  </div>
);
// 1. MAIN APP COMPONENT
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// 2. SUB-COMPONENT (So we can use useNavigate)
function AppContent() {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Utility to clear all session data
  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    localStorage.removeItem("email");
  };

  // Check token validity on mount and after storage changes
  const checkTokenValidity = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setUserRole(null);
      return false;
    }

    // Decode JWT payload to check expiry (base64 decode)
    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) throw new Error("Invalid token format");
      
      // Decode base64 URL-safe
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));
      
      if (payload.exp) {
        const expiryMs = payload.exp * 1000; // JWT exp is in seconds
        if (Date.now() >= expiryMs) {
          console.warn("⚠️ Token expired — clearing session");
          clearSession();
          setIsLoggedIn(false);
          setUserRole(null);
          return false;
        }
      }

      // Token is valid
      setIsLoggedIn(true);
      const role = localStorage.getItem("role");
      setUserRole(role);
      return true;
    } catch (e) {
      console.error("❌ Failed to decode token:", e);
      clearSession();
      setIsLoggedIn(false);
      setUserRole(null);
      return false;
    }
  };

  // Validate token on mount
  useEffect(() => {
    checkTokenValidity();
  }, []);

  // Listen for storage changes (login in another tab, etc.)
  useEffect(() => {
    const handleStorageChange = () => {
      checkTokenValidity();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    localStorage.removeItem("email");
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
        userRole={userRole}
      />

<Suspense fallback={<PageLoader />}>
      <Routes>
        {/* 1. LANDING PAGE REDIRECTS */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              userRole === "admin" ? (
                <Navigate to="/admin" replace />
              ) : userRole === "cashier" || userRole === "staff" ? (
                <Navigate to="/cashier/dashboard" replace />
              ) : userRole === "cook" ? ( // ADD THIS LINE
                <Navigate to="/kitchen-page" replace />
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
        {/* 2. PROTECTED CUSTOMER ROUTES */}
        <Route
          path="/customer"
          element={
            isLoggedIn && userRole === "customer" ? (
              <CustomerPage
                isLoggedIn={isLoggedIn}
                onLoginClick={() => setIsLoginOpen(true)}
                onReserveClick={() => navigate("/tablereservation")}
                onSuccess={handleReservationSuccess}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/my-reservation"
          element={
            isLoggedIn && userRole === "customer" ? (
              <MyReservation />
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
          element={isLoggedIn ? <Notifications /> : <Navigate to="/" replace />}
        />
        {/* 3. PROTECTED ADMIN ROUTES */}
        <Route
          path="/admin/*"
          element={
            isLoggedIn && userRole === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        {/* 4. PROTECTED CASHIER ROUTE */}
        <Route
          path="/cashier/dashboard"
          element={
            isLoggedIn && (userRole === "cashier" || userRole === "admin") ? (
              <Cashier />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        {/* 5. PUBLIC / KIOSK / KITCHEN ROUTES */}
        <Route
          path="/tablereservation"
          element={
            <TableReservation
              onClose={() => navigate(isLoggedIn ? "/customer" : "/")}
              onSuccess={handleReservationSuccess}
            />
          }
        />

        {/* KIOSK SELECTION */}
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

        {/*KITCHEN PAGE */}
        <Route
          path="/kitchen-page"
          element={
            isLoggedIn && (userRole === "cook" || userRole === "admin") ? (
              <KitchenPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/kitchen-inventory"
          element={
            isLoggedIn && (userRole === "cook" || userRole === "admin") ? (
              <Inventory />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/menu" element={<FullMenu />} />
        
        {/* 6. CATCH ALL - MUST BE AT THE VERY BOTTOM */}
        <Route
          path="*"
          element={
            isLoggedIn ? (
              userRole === "admin" ? (
                <Navigate to="/admin" replace />
              ) : userRole === "cashier" || userRole === "staff" ? (
                <Navigate to="/cashier/dashboard" replace />
              ) : userRole === "cook" ? ( // ADD THIS LINE
                <Navigate to="/kitchen-page" replace />
              ) : (
                <Navigate to="/customer" replace />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

<Route path="/file-a-refund" element={<FileARefund />} />
      </Routes>
      </Suspense>

      {/* Modals */}
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

// 3. SUCCESS COMPONENT
const ReservationSuccess = ({ onClose }) => {
  return (
    <div className="res-success-overlay" onClick={onClose}>
      <div
        className="res-success-card fade-in"
        onClick={(e) => e.stopPropagation()}
      >
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
const NavbarWrapper = ({ onLoginClick, isLoggedIn, onLogout, userRole }) => {
  const location = useLocation();
  // Hide navbar on these pages
  const hiddenPaths = [
    "/admin",
    "/cashier",
    "/cashier-selection",
    "/kiosk-selection",
    "/kitchen-page",
    "/tablereservation",
    "/reset-password",
    "/menu",
  ];

  if (hiddenPaths.some((path) => location.pathname.startsWith(path))) {
    return null;
  }

  // Show CustomerNavbar for logged in users (both customer and admin on customer routes)
  if (isLoggedIn) {
    console.log("NavbarWrapper - Showing CustomerNavbar");
    return <CustomerNavbar onLogout={onLogout} />;
  }

  // Show regular Navbar for non-logged in users
  console.log("NavbarWrapper - Showing regular Navbar");
  return (
    <Navbar
      onLoginClick={onLoginClick}
      isLoggedIn={isLoggedIn}
      onLogout={onLogout}
    />
  );
};

export default App;

import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate, // 1. CRITICAL: Make sure this is here
} from "react-router-dom";

// Imports (Make sure these paths are correct for your project)
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
import "./Style/App.css";

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <Router>
      <div id="app">
        {/* Navbar changes based on Login state and Path */}
        <NavbarWrapper
          onLoginClick={() => setIsLoginOpen(true)}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
        />

        <Routes>
          {/* Public Home Route */}
          <Route path="/" element={
              <>
                <HeroSection 
                  isLoggedIn={isLoggedIn}
                  onLoginClick={() => setIsLoginOpen(true)} 
                  onReserveClick={() => setIsReservationOpen(true)} 
                />
                <div id="menu-section"><FeaturedMenu onLoginClick={() => setIsLoginOpen(true)} /></div>
                <div id="about-section"><AboutSection onLoginClick={() => setIsLoginOpen(true)} /></div>
                <div id="promos-section"><PromoSection /></div>
                <ReviewsSection />
                <Footer />
              </>
          }/>

          {/* PROTECTED ROUTES: Redirects to "/" if NOT logged in */}
          <Route 
            path="/customer" 
            element={isLoggedIn ? <CustomerPage /> : <Navigate to="/" replace />} 
          />
          
          <Route 
            path="/profile" 
            element={isLoggedIn ? <CustomerProfile /> : <Navigate to="/" replace />} 
          />

          {/* Admin Routes */}
          <Route path="/admin/*" element={<AdminDashboard />} />
          
          {/* Catch-all for /login path */}
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>

        {/* MODAL LAYER */}
        {isLoginOpen && (
          <LoginSection onClose={() => setIsLoginOpen(false)} />
        )}
        
        {isReservationOpen && (
          <Reservation onClose={() => setIsReservationOpen(false)} />
        )}
      </div>
    </Router>
  );
}

/**
 * NavbarWrapper handles which Navbar to show.
 * It hides the Navbar if the path starts with /admin.
 */
const NavbarWrapper = ({ onLoginClick, isLoggedIn, onLogout }) => {
  const location = useLocation();
  
  // 1. Check if the current URL path starts with "/admin"
  const isAdminPath = location.pathname.startsWith('/admin');

  // 2. If it is an admin path, return null (renders nothing)
  if (isAdminPath) {
    return null;
  }

  // 3. Otherwise, show the standard Navbar
  return (
    <Navbar
      onLoginClick={onLoginClick}
      isLoggedIn={isLoggedIn}
      onLogout={onLogout}
    />
  );
};

export default App;


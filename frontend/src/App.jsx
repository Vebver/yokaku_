import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturedMenu from "./components/FeaturedMenu";
import AboutSection from "./components/AboutSection";
import PromoSection from "./components/PromoSection";
import ReviewsSection from "./components/ReviewsSection";
import Footer from "./components/Footer";
import LoginSection from "./components/LoginSection";
import AdminNavbar from "./components/admin-page/AdminNavbar";
import AdminDashboard from "./components/admin-page/AdminDashboard.jsx";
import Reservation from "./components/Reservation";
import "./Style/App.css";

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);

  return (
    <Router>
      <div id="app">
        <NavbarWrapper onLoginClick={() => setIsLoginOpen(true)} />

        <Routes>
          <Route
            path="/"
            element={
              <>
                <HeroSection
                  onLoginClick={() => setIsLoginOpen(true)}
                  onReserveClick={() => setIsReservationOpen(true)} // Add this line
                />
                <div id="menu-section">
                  <FeaturedMenu onLoginClick={() => setIsLoginOpen(true)} />
                </div>
                <div id="about-section">
                  <AboutSection onLoginClick={() => setIsLoginOpen(true)} />
                </div>
                <div id="promos-section">
                  <PromoSection />
                </div>
                <ReviewsSection />
                {/* Footer moved inside the route content to keep it at the bottom */}
                <Footer />
              </>
            }
          />

          {/* Even though we use a modal, keeping this empty route 
            prevents errors if someone manually types /login 
          */}
          <Route path="/login" element={<div />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>

        {/* MODAL LAYER: Only for public pages */}
        {isLoginOpen && !window.location.pathname.startsWith("/admin") && (
          <LoginSection onClose={() => setIsLoginOpen(false)} />
        )}
        
        {/* Add this right next to your LoginSection modal logic */}
        {isReservationOpen && (
          <Reservation onClose={() => setIsReservationOpen(false)} />
        )}
      </div>
    </Router>
  );
}

const NavbarWrapper = ({ onLoginClick }) => {
  const location = useLocation();
  return location.pathname !== "/admin" ? (
    <Navbar onLoginClick={onLoginClick} />
  ) : (
    <AdminNavbar />
  );
};

export default App;

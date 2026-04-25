import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import HeroSection from "../HeroSection";
import FeaturedMenu from "../FeaturedMenu";
import AboutSection from "../AboutSection";
import PromoSection from "../PromoSection";
import ReviewsSection from "../ReviewsSection";
import Footer from "../Footer";
import LoginSection from "../LoginSection";
import TableReservation from "../TableReservation";
import "../../Style/App.css";

// Receive props passed from App.jsx
function CustomerPage({
  onSuccess,
  onReserveClick,
  isLoggedIn: parentIsLoggedIn,
  onLoginClick,
}) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleReservationSuccess = () => {
    setIsReservationOpen(false);
    setShowSuccessOverlay(true);
    if (onSuccess) onSuccess();
  };

  if (!isLoggedIn) return <div>Loading...</div>;

  return (
    <div id="app" style={{ position: "relative" }}>
      <HeroSection
        /* Use props from App.jsx to ensure the URL changes */
        isLoggedIn={parentIsLoggedIn || isLoggedIn}
        onLoginClick={onLoginClick || (() => setIsLoginOpen(true))}
        onReserveClick={onReserveClick}
      />

      <div id="menu-section">
        <FeaturedMenu
          onLoginClick={onLoginClick || (() => setIsLoginOpen(true))}
        />
      </div>
      <div id="about-section">
        <AboutSection
          isLoggedIn={isLoggedIn}
          onLoginClick={onLoginClick || (() => setIsLoginOpen(true))}
        />
      </div>
      <div id="promos-section">
        <PromoSection />
      </div>
      <ReviewsSection />
      <Footer />

      {showSuccessOverlay && (
        <div className="res-success-overlay">
          <div className="res-success-card fade-in">
            <CheckCircle size={60} color="#52b788" />
            <h2>Reservation Submitted!</h2>
            <p>Your request has been sent successfully.</p>
            <button
              className="res-success-close"
              onClick={() => setShowSuccessOverlay(false)}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {isLoginOpen && <LoginSection onClose={() => setIsLoginOpen(false)} />}
    </div>
  );
}

export default CustomerPage;

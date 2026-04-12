import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react"; // Success icon
import HeroSection from "../HeroSection";
import FeaturedMenu from "../FeaturedMenu";
import AboutSection from "../AboutSection";
import PromoSection from "../PromoSection";
import ReviewsSection from "../ReviewsSection";
import Footer from "../Footer";
import LoginSection from "../LoginSection";
import TableReservation from "../TableReservation"; 
import "../../Style/App.css";

function CustomerPage({ onSuccess }) { 
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false); // NEW STATE
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

  // Handle successful reservation
  const handleReservationSuccess = () => {
    setIsReservationOpen(false); // 1. Close the Table Modal
    setShowSuccessOverlay(true);  // 2. Show the "Waiting for Approval" Message
    
    if (onSuccess) {
      onSuccess(); 
    }
  };

  if (!isLoggedIn) {
    return <div>Loading...</div>;
  }

  return (
    <div id="app" style={{ position: "relative" }}>
      <HeroSection
        isLoggedIn={isLoggedIn}
        onLoginClick={() => setIsLoginOpen(true)}
        onReserveClick={() => setIsReservationOpen(true)} 
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

      {/* --- PENDING APPROVAL OVERLAY --- */}
      {showSuccessOverlay && (
        <div className="res-success-overlay">
          <div className="res-success-card fade-in">
            <CheckCircle size={60} color="#52b788" />
            <h2>Reservation Submitted!</h2>
            <p>Your request has been sent successfully.</p>
            <p className="res-status-text"><strong>Status:</strong> Waiting for Admin Approval</p>
            <p className="res-info-small">You will receive a notification once your table is confirmed.</p>
            <button 
              className="res-success-close" 
              onClick={() => setShowSuccessOverlay(false)}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* MODAL LAYER */}
      {isLoginOpen && <LoginSection onClose={() => setIsLoginOpen(false)} />}
      
      {isReservationOpen && (
        <TableReservation 
          onClose={() => setIsReservationOpen(false)} 
          onSuccess={handleReservationSuccess} 
        />
      )}
    </div>
  );
}

export default CustomerPage;
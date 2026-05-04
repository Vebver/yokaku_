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
import ExistingModal from "../ExistingModal";
import axios from "axios";
import "../../Style/App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Receive props passed from App.jsx
function CustomerPage({ isLoggedIn, onLoginClick, onReserveClick, onSuccess }) {
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [existingReservation, setExistingReservation] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkExistingReservation = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return false;

    try {
      setChecking(true);
      const response = await axios.get(
        `${API_BASE}/reservations/check-active/${userId}`,
      );

      if (response.data.hasActive) {
        const detailsRes = await axios.get(
          `${API_BASE}/reservations/user-active/${userId}`,
        );
        setExistingReservation(detailsRes.data);
        setShowExistingModal(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking existing reservation:", error);
      return false;
    } finally {
      setChecking(false);
    }
  };

  const handleReserveTable = async () => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }

    const hasActive = await checkExistingReservation();
    if (!hasActive) {
      onReserveClick();
    }
  };

  const handleCloseModal = () => {
    setShowExistingModal(false);
    setExistingReservation(null);
  };

  return (
    <>
      {/* Hero Section with Reserve Button */}
      <HeroSection
        isLoggedIn={isLoggedIn}
        onLoginClick={onLoginClick}
        onReserveClick={handleReserveTable}
      />

      {/* Menu Section */}
      <div id="menu-section">
        <FeaturedMenu onLoginClick={onLoginClick} />
      </div>

      {/* About Section */}
      <div id="about-section">
        <AboutSection isLoggedIn={isLoggedIn} onLoginClick={onLoginClick} />
      </div>

      {/* Promos Section */}
      <div id="promos-section">
        <PromoSection />
      </div>

      {/* Reviews Section */}
      <ReviewsSection />

      {/* Footer */}
      <Footer />

      {/* Existing Reservation Modal */}
      <ExistingModal
        isOpen={showExistingModal}
        onClose={handleCloseModal}
        reservationDetails={existingReservation}
      />
    </>
  );
}

export default CustomerPage;

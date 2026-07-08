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

const API_BASE = "https://yokaku-backend.onrender.com/api";

// Receive props passed from App.jsx
function CustomerPage({ isLoggedIn, onLoginClick, onReserveClick, onSuccess }) {
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [existingReservation, setExistingReservation] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkExistingReservation = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return false;

    // Create a clean Axios instance to bypass global auth interceptors
    const cleanAxios = axios.create();
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      setChecking(true);
      const response = await cleanAxios.get(
        `${API_BASE}/reservations/check-active/${userId}`,
        { headers }
      );

      if (response.data.hasActive) {
        const detailsRes = await cleanAxios.get(
          `${API_BASE}/reservations/user-active/${userId}`,
          { headers }
        );
        setExistingReservation(detailsRes.data);
        setShowExistingModal(true);
        return true;
      }
      return false;
    } catch (error) {
      console.warn("Silent check: Error checking existing reservation:", error);
      
      // Silently clean up expired/invalid keys if unauthorized
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
      }
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
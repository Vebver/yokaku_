import React, { useState, useEffect } from "react";
import axios from "axios";
import ExistingModal from "./ExistingModal";
import "../Style/HeroSection.css";

const API_BASE = "https://yokaku-backend.onrender.com/api";

function HeroSection({ onLoginClick, onReserveClick, isLoggedIn }) {
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [existingReservation, setExistingReservation] = useState(null);
  const [checking, setChecking] = useState(false);

  // Check for existing active reservation
  const checkExistingReservation = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return false;

    try {
      setChecking(true);
      console.log("🔍 Checking active reservation for user:", userId);

      const response = await axios.get(
        `${API_BASE}/reservations/check-active/${userId}`,
      );
      console.log("🔍 Response:", response.data);

      if (response.data.hasActive) {
        // Fetch full reservation details
        const token = localStorage.getItem("token");
        const detailsRes = await axios.get(
          `${API_BASE}/reservations/user-active/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        console.log("🔍 Reservation details:", detailsRes.data);
        setExistingReservation(detailsRes.data);
        setShowExistingModal(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        "Error checking existing reservation:",
        error.response?.data || error.message,
      );
      return false;
    } finally {
      setChecking(false);
    }
  };

  const handleReserveTable = async () => {
    console.log("🔍 Reserve button clicked, isLoggedIn:", isLoggedIn);

    if (!isLoggedIn) {
      onLoginClick();
      return;
    }

    // Check for existing reservation before proceeding
    const hasActive = await checkExistingReservation();
    console.log("🔍 Has active reservation:", hasActive);

    if (!hasActive) {
      // No active reservation, proceed to table reservation
      console.log("🔍 Proceeding to table reservation");
      onReserveClick();
    } else {
      console.log("🔍 Blocking reservation - user has active reservation");
    }
    // If has active, modal will show and user cannot proceed
  };

  const handleCloseModal = () => {
    setShowExistingModal(false);
    setExistingReservation(null);
  };

  return (
    <>
      <section className="hero position-relative">
        <div className="hero-image-container">
          <img src="/hero.jpg" alt="Delicious Wings" className="hero-img" />
        </div>
        <div className="hero-overlay position-absolute top-0 start-0 w-100 h-100"></div>
        <div className="hero-content position-relative z-2 container">
          <div className="hero-text">
            <h1>
              <span className="highlight">HANGOUT</span>
              <br />
              <span className="text-white">RESTOBAR</span>
            </h1>
            <p>
              The perfect place to relax and enjoy great food with friends and
              family. We offer delicious meals, refreshing drinks and vibrant
              atmosphere.
            </p>
            <button
              className="reserve-btn"
              onClick={handleReserveTable}
              disabled={checking}
            >
              {checking ? "CHECKING..." : "RESERVE A TABLE"}
            </button>
          </div>
        </div>
      </section>

      <ExistingModal
        isOpen={showExistingModal}
        onClose={handleCloseModal}
        reservationDetails={existingReservation}
      />
    </>
  );
}

export default HeroSection;

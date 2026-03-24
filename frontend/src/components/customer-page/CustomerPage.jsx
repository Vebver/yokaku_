import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "../HeroSection";
import FeaturedMenu from "../FeaturedMenu";
import AboutSection from "../AboutSection";
import PromoSection from "../PromoSection";
import ReviewsSection from "../ReviewsSection";
import Footer from "../Footer";
import LoginSection from "../LoginSection";
import Reservation from "../Reservation";
import "../../Style/App.css";

function CustomerPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    } else {
      // If not logged in, redirect to home or show login
      navigate("/");
    }
  }, [navigate]);

  if (!isLoggedIn) {
    return <div>Loading...</div>; // Or redirect
  }

  return (
    <div id="app">
      <HeroSection
        isLoggedIn={isLoggedIn}
        onLoginClick={() => setIsLoginOpen(true)}
        onReserveClick={() => setIsReservationOpen(true)}
      />
      <div id="menu-section">
        {isLoggedIn}
        <FeaturedMenu onLoginClick={() => setIsLoginOpen(true)} />
      </div>
      <div id="about-section">
        <AboutSection
        isLoggedIn={isLoggedIn}
        onLoginClick={() => setIsLoginOpen(true)} />
      </div>
      <div id="promos-section">
        <PromoSection />
      </div>
      <ReviewsSection />
      <Footer />

      {/* MODAL LAYER */}
      {isLoginOpen && <LoginSection onClose={() => setIsLoginOpen(false)} />}
      {isReservationOpen && (
        <Reservation onClose={() => setIsReservationOpen(false)} />
      )}
    </div>
  );
}

export default CustomerPage;

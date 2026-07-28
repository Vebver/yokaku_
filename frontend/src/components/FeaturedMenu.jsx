import React, { useState, useEffect } from "react";
import axios from "axios";
import Slider from "react-slick";
import { useNavigate } from "react-router-dom";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "../Style/FeaturedMenu.css";
import ExistingModal from "./ExistingModal";

const API_BASE = "https://yokaku-backend.onrender.com/api";
const BASE_URL = "https://yokaku-backend.onrender.com";

function FeaturedMenu({ onLoginClick }) {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [slidesToShow, setSlidesToShow] = useState(1);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [existingReservation, setExistingReservation] = useState(null);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  const getSlidesToShow = () => {
    if (typeof window === "undefined") return 1;
    const width = window.innerWidth;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await axios.get(`${API_BASE}/products/featured`);
        if (Array.isArray(res.data)) {
          setFeaturedItems(res.data);
        } else if (res.data && Array.isArray(res.data.data)) {
          setFeaturedItems(res.data.data);
        } else if (res.data && typeof res.data === "object") {
          setFeaturedItems([res.data]);
        } else {
          setFeaturedItems([]);
        }
      } catch (err) {
        console.error(err);
        setFeaturedItems([]);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setSlidesToShow(getSlidesToShow());
    };
    setSlidesToShow(getSlidesToShow());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ===== NEW: Check active reservation =====
  const checkExistingReservation = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return false;

    try {
      setChecking(true);
      const response = await axios.get(
        `${API_BASE}/reservations/check-active/${userId}`,
      );

      if (response.data.hasActive) {
        const token = localStorage.getItem("token");
        const detailsRes = await axios.get(
          `${API_BASE}/reservations/user-active/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
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

  // ===== FIXED: Check active reservation before navigating =====
  const handleCardClick = async (item) => {
    if (!isLoggedIn) {
      if (onLoginClick) {
        onLoginClick();
      }
      return;
    }

    // Check for existing reservation
    const hasActive = await checkExistingReservation();
    if (!hasActive) {
      navigate("/tablereservation");
    }
    // If has active, modal will show and user cannot proceed
  };

  const handleCloseModal = () => {
    setShowExistingModal(false);
    setExistingReservation(null);
  };

  const getImageUrl = (item) => {
    const imagePath = item.local_path || item.image_url;
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/uploads/${imagePath}`;
  };

  const settings = {
    dots: true,
    arrows: slidesToShow > 1,
    infinite: true,
    speed: 500,
    slidesToShow: slidesToShow,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
  };

  return (
    <>
      <section className="featured-menu">
        <h2>FEATURED ITEMS</h2>

        <div className="carousel-container">
          <Slider {...settings}>
            {featuredItems.map((item) => (
              <div key={item.id} className="menu-card-wrapper">
                <div className="menu-card">
                  <img src={getImageUrl(item)} alt={item.name} />
                  <span>{item.menu_name}</span>
                  <small>₱{item.price}</small>
                  <button
                    className="card-order-btn"
                    onClick={() => handleCardClick(item)}
                    disabled={checking}
                  >
                    {checking
                      ? "CHECKING..."
                      : isLoggedIn
                        ? "ORDER"
                        : "ORDER NOW"}
                  </button>
                </div>
              </div>
            ))}
          </Slider>
        </div>

        <button className="all-menu-btn" onClick={() => navigate("/menu")}>
          VIEW FULL MENU
        </button>
      </section>

      <ExistingModal
        isOpen={showExistingModal}
        onClose={handleCloseModal}
        reservationDetails={existingReservation}
      />
    </>
  );
}

export default FeaturedMenu;

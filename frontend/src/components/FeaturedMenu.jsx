import React, { useState, useEffect } from "react";
import axios from "axios";
import Slider from "react-slick";
import { useNavigate } from "react-router-dom";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "../Style/FeaturedMenu.css";

const API_BASE = "https://yokaku-backend.onrender.com/api";
const BASE_URL = "https://yokaku-backend.onrender.com";

function FeaturedMenu({ onLoginClick }) {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [slidesToShow, setSlidesToShow] = useState(1); // Start with mobile default
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  // Function to determine slides based on screen width
  const getSlidesToShow = () => {
    if (typeof window === "undefined") return 1;
    const width = window.innerWidth;
    if (width >= 1024) return 3; // Desktop - 3 items
    if (width >= 768) return 2; // Tablet - 2 items
    return 1; // Mobile - 1 item
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await axios.get(`${API_BASE}/products/featured`);
        // Handle both array and object responses
        if (Array.isArray(res.data)) {
          setFeaturedItems(res.data);
        } else if (res.data && Array.isArray(res.data.data)) {
          setFeaturedItems(res.data.data);
        } else if (res.data && typeof res.data === "object") {
          // If it's a single object, wrap it in an array
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

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      setSlidesToShow(getSlidesToShow());
    };

    // Set initial value
    setSlidesToShow(getSlidesToShow());

    // Listen for resize events
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getImageUrl = (item) => {
    const imagePath = item.local_path || item.image_url;
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/uploads/${imagePath}`;
  };

  // Handle card click - redirect to login if not logged in, otherwise go to Table Reservation
  const handleCardClick = (item) => {
    if (!isLoggedIn) {
      if (onLoginClick) {
        onLoginClick();
      }
    } else {
      navigate("/tablereservation");
    }
  };

  const settings = {
    dots: true,
    arrows: slidesToShow > 1, // Only show arrows if more than 1 slide
    infinite: true,
    speed: 500,
    slidesToShow: slidesToShow,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
  };

  return (
    <section className="featured-menu">
      <h2>FEATURED ITEMS</h2>

      <div className="carousel-container">
        <Slider {...settings}>
          {featuredItems.map((item) => (
            <div key={item.id} className="menu-card-wrapper">
              <div className="menu-card">
                <img src={getImageUrl(item)} alt={item.name} />
                <span>{item.name}</span>
                <small>₱{item.price}</small>
                <button
                  className="card-order-btn"
                  onClick={() => handleCardClick(item)}
                >
                  {isLoggedIn ? "ORDER" : "ORDER NOW"}
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
  );
}

export default FeaturedMenu;

import React, { useState, useEffect } from "react";
import axios from "axios";
import Slider from "react-slick";
import { useNavigate } from "react-router-dom";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "../Style/FeaturedMenu.css";

const API_BASE = import.meta.env.VITE_API_URL;
const BASE_URL = import.meta.env.VITE_SOCKET_URL;

function FeaturedMenu() {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [slidesToShow, setSlidesToShow] = useState(1); // Start with mobile default
  const navigate = useNavigate();

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
        setFeaturedItems(res.data);
      } catch (err) {
        console.error(err);
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

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/uploads/${imagePath}`;
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
                <img src={getImageUrl(item.image_url)} alt={item.name} />
                <span>{item.name}</span>
                <small>₱{item.price}</small>
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

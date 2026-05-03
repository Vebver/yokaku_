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
  const navigate = useNavigate();

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

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/uploads/${imagePath}`;
  };

  const settings = {
    dots: true,
    arrows: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
        },
      },
    ],
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

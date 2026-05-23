import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "../Style/FullMenu.css";

const API_BASE = "https://yokaku-backend.onrender.com/api";
const BASE_URL = "https://yokaku-backend.onrender.com";

function FullMenu({ onLoginClick }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const isLoggedIn = !!localStorage.getItem("token");

  // Define categories to exclude
  const excludedCategories = ["Chicken", "Drinks"];

  // Check if user is logged in
  const isLoggedIn = () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    return userId && token;
  };

  const handleCardClick = (item) => {
    if (!isLoggedIn) {
      if (onLoginClick) {
        onLoginClick();
      }
    } else {
      navigate("/tablereservation");
    }
  };

  useEffect(() => {
    const fetchAllItems = async () => {
      try {
        const res = await axios.get(`${API_BASE}/products`);

        // 1. Filter out the items belonging to excluded categories
        const filteredData = res.data.filter(
          (item) => !excludedCategories.includes(item.category_name),
        );

        setItems(filteredData);

        // 2. Extract unique category names, excluding the unwanted ones
        const uniqueNames = [
          ...new Set(filteredData.map((item) => item.category_name)),
        ].filter(Boolean);

        setCategories([...uniqueNames, "All"]);

        // 3. Set the first available category as default
        if (uniqueNames.length > 0) {
          const firstCat = uniqueNames[0];
          setActiveCategory(firstCat);
          const initialFiltered = filteredData.filter(
            (item) => item.category_name === firstCat,
          );
          setFilteredItems(initialFiltered);
        } else {
          setFilteredItems(filteredData);
          setActiveCategory("All");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading menu:", err);
        setLoading(false);
      }
    };
    fetchAllItems();
  }, []);

  const handleFilter = (name) => {
    setActiveCategory(name);
    if (name === "All") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter((item) => item.category_name === name);
      setFilteredItems(filtered);
    }
  };

  if (loading) return <div className="loading">Loading Menu...</div>;

  return (
    <section className="full-menu-page">
      {/* BACK BUTTON */}
      <button className="menu-back-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <h1>OUR MENU</h1>

      <div className="category-bar">
        {categories.map((name) => (
          <button
            key={name}
            className={activeCategory === name ? "cat-btn active" : "cat-btn"}
            onClick={() => handleFilter(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="menu-grid-compact">
        {filteredItems.map((item) => (
          <div key={item.item_id || item.id} className="small-menu-card">
            <div className="img-container">
              <img
                src={
                  item.local_path
                    ? item.local_path
                    : item.image_url
                      ? `${BASE_URL}${item.image_url}`
                      : "https://placehold.co/150"
                }
                alt={item.name}
              />
            </div>
            <div className="small-card-info">
              <h4>{item.name}</h4>
              <span className="small-price">₱{item.price}</span>
              {/* ORDER NOW BUTTON */}
              <button
                className="order-now-button"
                onClick={() => handleCardClick(item)}
              >
                {isLoggedIn ? "Log in" : "Order Now"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FullMenu;

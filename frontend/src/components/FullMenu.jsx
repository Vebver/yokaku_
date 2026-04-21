import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react"; // Import the icon
import "../Style/FullMenu.css";

function FullMenu() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllItems = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/products");
        setItems(res.data);
        setFilteredItems(res.data);

        const uniqueNames = [
          ...new Set(res.data.map((item) => item.category_name)),
        ].filter(Boolean);

        setCategories([...uniqueNames, "All"]);

        if (uniqueNames.length > 0) {
          const firstCat = uniqueNames[0];
          setActiveCategory(firstCat);
          const initialFiltered = res.data.filter(
            (item) => item.category_name === firstCat,
          );
          setFilteredItems(initialFiltered);
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
                  item.image_url
                    ? `http://localhost:5000${item.image_url}`
                    : "https://placehold.co/150"
                }
                alt={item.name}
              />
            </div>
            <div className="small-card-info">
              <h4>{item.name}</h4>
              <span className="small-price">₱{item.price}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FullMenu;
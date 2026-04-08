import React, { useState, useEffect } from "react";
import axios from "axios";
import '../Style/FeaturedMenu.css';

function FeaturedMenu({ onLoginClick }) {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Updated API endpoint
        const res = await axios.get("/api/products/featured");
        setFeaturedItems(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading featured items:", err);
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  if (loading) return <div className="p-5 text-center" style={{color: 'white'}}>Loading Specials...</div>;

  return (
    <section className="featured-menu" id="menu-section">
      <h2>FEATURED ITEMS</h2>
      <div className="menu-items">
        {featuredItems.map((item) => (
          <div key={item.item_id} className="menu-card">
            {/* Display the item image and name */}
            <img 
              src={item.image_url.startsWith('http') ? item.image_url : `/${item.image_url}`} 
              alt={item.name} 
            />
            <span>{item.name}</span>
            {/* Optional: Add price since it's a specific item now */}
            <small style={{color: '#ffcc00', fontWeight: 'bold'}}>₱{item.price}</small>
          </div>
        ))}
      </div>
      
      <button className="all-menu-btn" onClick={onLoginClick}>
        VIEW FULL MENU
      </button>
    </section>
  );
}

export default FeaturedMenu;
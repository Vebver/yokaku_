import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../Style/KioskOrder.css";

const KioskOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- 1. DATA ---
  // Check if we are in "Add-on" mode (coming back from the active timer screen)
  const isAddOnMode = location.state?.isAddOnMode || false;
  const existingOrder = location.state?.currentOrder || [];

  const categories = [
    { id: 1, name: "What's Popular", icon: "🔥" },
    { id: 2, name: "Wings & More", icon: "🍗" }, // This will be hidden in Add-on mode
    { id: 3, name: "Budget Meals", icon: "🍱" },
    { id: 4, name: "Pizzas", icon: "🍕" },
    { id: 5, name: "Burgers", icon: "🍔" },
    { id: 6, name: "Hangout Specials", icon: "✨" },
  ];

  // Filter out "Wings & More" if the user is just adding extras
  const filteredCategories = isAddOnMode
    ? categories.filter((cat) => cat.name !== "Wings & More")
    : categories;

  const menuItems = [
    { id: 101, name: "6pcs Wings", price: 199, category: "Wings & More" },
    { id: 102, name: "12pcs Wings", price: 389, category: "Wings & More" },
    { id: 103, name: "Junior Burger", price: 99, category: "Burgers" },
    { id: 104, name: "Overload Pizza", price: 450, category: "Pizzas" },
    { id: 105, name: "Solo Rice Meal", price: 120, category: "Budget Meals" },
  ];

  // --- 2. STATE ---
  // Default to first available category
  const [activeCategory, setActiveCategory] = useState(
    filteredCategories[0].name,
  );
  const [orderItems, setOrderItems] = useState(existingOrder);

  // --- 3. LOGIC ---
  const calculateTotal = () => {
    return orderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  };

  const handleProductClick = (item) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handlePlaceOrder = () => {
    // Navigate to the route defined in App.js
    navigate("/kiosk/order/active", {
      state: {
        orderItems: orderItems, // Pass the tray items to the active screen
      },
    });
  };

  const totalQty = orderItems.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="kiosk-order-wrapper">
      <div className="order-main-layout">
        {/* SIDEBAR */}
        <aside className="category-sidebar">
          <div className="brand-small">
            <h2>HANGOUT</h2>
            <p>{isAddOnMode ? "Add Extras" : "Resto Bar"}</p>
          </div>

          <div className="scroll-arrow">▲</div>

          <div className="categories-list">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className={`category-item ${activeCategory === cat.name ? "selected" : ""}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                <div className="cat-icon-placeholder">{cat.icon}</div>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>

          <div className="scroll-arrow">▼</div>

          <button
            className="bill-btn"
            onClick={() =>
              navigate("/kiosk/order/active", {
                state: { orderItems: orderItems },
              })
            }
          >
            Review Order
          </button>

          <button className="assist-btn">
            <span>🔔</span> Assist Me
          </button>
        </aside>

        {/* MENU GRID */}
        <main className="menu-grid-container">
          <div className="menu-grid">
            {menuItems
              .filter((item) => item.category === activeCategory)
              .map((item) => (
                <div
                  key={item.id}
                  className="menu-card"
                  onClick={() => handleProductClick(item)}
                >
                  <div className="item-image-placeholder">
                    <div className="watermark">HANGOUT</div>
                  </div>
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p>₱{item.price}</p>
                  </div>
                  <div className="card-add-indicator">+</div>
                </div>
              ))}
          </div>
        </main>
      </div>

      <div className="bottom-bar">
        <div className="left-actions">
          <button className="btn-assist" onClick={() => navigate("/kiosk")}>
            🔔 Assist Me
          </button>
        </div>

        <div className="footer-actions">
          <button className="btn-cancel" onClick={() => navigate("/kiosk")}>
            CANCEL
          </button>
          <button
            className="btn-view-order"
            onClick={handlePlaceOrder}
            disabled={orderItems.length === 0}
          >
            {isAddOnMode ? "UPDATE ORDER" : "ORDER"} ({totalQty})
          </button>
        </div>
      </div>
    </div>
  );
};

export default KioskOrder;

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  Utensils,
  Plus,
  Minus,
  ShoppingBasket,
  Loader2,
  Trash2,
  Baby,
} from "lucide-react";
import "../Style/MenuModal.css";

const MenuModal = ({
  isOpen,
  onClose,
  onSelectedItemsChange,
  initialSelectedItems = [],
}) => {
  // States from your snippet
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Tray state for selection logic
  const [tray, setTray] = useState({});

  // Integrated useEffect
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }

    const fetchAllItems = async () => {
      try {
        setLoading(true);
        const res = await axios.get("http://localhost:5000/api/products");

        setItems(res.data);
        
        // Get unique Category Names from the data
        const uniqueNames = [
          ...new Set(res.data.map((item) => item.category_name)),
        ].filter(Boolean);

        // Set categories state (Specific categories + "All")
        setCategories([...uniqueNames, "All"]);

        // Logic to determine initial view
        if (uniqueNames.length > 0) {
          const firstCat = uniqueNames[0];
          setActiveCategory(firstCat); 

          // Only show items belonging to that first category initially
          const initialFiltered = res.data.filter(
            (item) => item.category_name === firstCat
          );
          setFilteredItems(initialFiltered);
        } else {
          setFilteredItems(res.data);
          setActiveCategory("All");
        }

        // --- SYNC TRAY LOGIC ---
        // Keeps track of what was already selected in the main reservation form
        const initialTray = {};
        initialSelectedItems.forEach((item) => {
          initialTray[item.id] = item;
        });
        setTray(initialTray);

        setLoading(false);
      } catch (err) {
        console.error("Error loading menu:", err);
        setLoading(false);
      }
    };

    fetchAllItems();
    document.body.style.overflow = "hidden";
  }, [isOpen, initialSelectedItems]);

  // Handler for clicking category buttons
  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    if (cat === "All") {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter((item) => item.category_name === cat));
    }
  };

  const addToTray = (item) => {
    const itemId = item.id || item.item_id;
    setTray((prev) => ({
      ...prev,
      [itemId]: {
        id: itemId,
        name: item.name || item.itemName,
        price: item.price || item.itemPrice,
        quantity: (prev[itemId]?.quantity || 0) + 1,
      },
    }));
  };

  const removeFromTray = (itemId) => {
    setTray((prev) => {
      const newTray = { ...prev };
      if (newTray[itemId].quantity > 1) {
        newTray[itemId].quantity -= 1;
      } else {
        delete newTray[itemId];
      }
      return newTray;
    });
  };

  const clearTray = () => setTray({});

  const totalPrice = Object.values(tray).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (!isOpen) return null;

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div className="menu-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="menu-modal-header">
          <div className="menu-header-left">
            <div className="menu-logo-box">
              <Utensils size={20} color="white" />
            </div>
            <h2>Choose Your Packages</h2>
          </div>
          <button className="menu-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        {/* Categories from DB */}
        <div className="category-container">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? "active" : ""}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="menu-grid">
          {loading ? (
            <div className="menu-loading">
              <Loader2 className="spin" size={40} />
              <p>Loading Menu...</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const itemId = item.id || item.item_id;
              const quantity = tray[itemId]?.quantity || 0;
              return (
                <div key={itemId} className="food-card">
                  <div className="food-image-wrapper">
                    <img
                      src={
                        item.image_url
                          ? `http://localhost:5000${item.image_url}`
                          : "https://placehold.co/300"
                      }
                      alt={item.name}
                      className="food-img"
                      onError={(e) => {
                        e.target.src = "https://placehold.co/300";
                      }}
                    />
                    <span className="food-price-tag">
                      ₱{item.price || item.itemPrice}
                    </span>
                  </div>
                  <div className="food-info">
                    <div className="food-text-details">
                      <h3>{item.name || item.itemName}</h3>
                      <p>{item.description || item.itemDesc}</p>
                    </div>

                    {quantity > 0 ? (
                      <div className="quantity-controls">
                        <button onClick={() => removeFromTray(itemId)}>
                          <Minus size={16} />
                        </button>
                        <span>{quantity}</span>
                        <button onClick={() => addToTray(item)}>
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="add-to-tray-btn"
                        onClick={() => addToTray(item)}
                      >
                        Add to Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="menu-modal-footer">
          <div className="footer-top-row">
            <p className="price-notice">
              Prices are subject to change without prior notice.
            </p>
            {Object.keys(tray).length > 0 && (
              <button className="clear-selection-btn" onClick={clearTray}>
                <Trash2 size={14} /> Clear Selection
              </button>
            )}
          </div>

          <div className="tray-summary">
            <div className="total-info">
              <ShoppingBasket size={20} />
              <span>
                Total: <strong>₱{totalPrice}</strong>
              </span>
            </div>

            <div className="footer-action-buttons">
              <button className="menu-cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="confirm-menu-btn"
                disabled={Object.values(tray).length === 0}
                onClick={() => {
                  if (typeof onSelectedItemsChange === "function") {
                    onSelectedItemsChange(Object.values(tray));
                  }
                  onClose();
                }}
              >
                Confirm ({Object.values(tray).length})
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MenuModal;
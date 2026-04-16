import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  X,
  Utensils,
  Plus,
  Minus,
  ShoppingBasket,
  Loader2,
} from "lucide-react";
import "../Style/MenuModal.css";

const MenuModal = ({
  isOpen,
  onClose,
  onSelectedItemsChange,
  initialSelectedItems = [],
}) => {
  const [FoodItems, setFoodItems] = useState([]); // Database data
  const [tray, setTray] = useState({}); // Selection state
  const [loading, setLoading] = useState(true);

  // 1. Fetch Food from Database
  useEffect(() => {
    if (isOpen) {
      const fetchMenu = async () => {
        try {
          setLoading(true);
          const res = await axios.get("http://localhost:5000/api/products"); // Your API endpoint
          setFoodItems(res.data);

          // Sync tray with what was previously selected in the parent
          const initialTray = {};
          initialSelectedItems.forEach((item) => {
            initialTray[item.id] = item;
          });
          setTray(initialTray);
        } catch (err) {
          console.error("Failed to fetch menu:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchMenu();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, initialSelectedItems]);

  // 2. Logic to add/remove from Tray
  const addToTray = (item) => {
    const itemId = item.id || item.item_id;
    setTray((prev) => ({
      ...prev,
      [itemId]: {
        id: itemId,
        name: item.name || item.itemName, // Adjust based on your DB column names
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

  const totalPrice = useMemo(() => {
    return Object.values(tray).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }, [tray]);

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

        <div className="menu-grid">
          {loading ? (
            <div className="menu-loading">
              <Loader2 className="spin" /> <p>Loading Menu...</p>
            </div>
          ) : (
            FoodItems.map((item) => {
              const itemId = item.id || item.item_id;
              const quantity = tray[item.id]?.quantity || 0;
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
                        <button onClick={() => removeFromTray(item.id)}>
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
          {/* This is the original design element */}
          <p>Prices are subject to change without prior notice.</p>

          <div className="tray-summary">
            <div className="total-info">
              <ShoppingBasket size={20} />
              <span>
                Total: <strong>₱{totalPrice}</strong>
              </span>
            </div>
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
              Confirm Selection ({Object.values(tray).length})
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MenuModal;

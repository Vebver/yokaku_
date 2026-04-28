import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import "../../Style/PackageModal.css";

const PackageModal = ({
  isOpen,
  onClose,
  onSelectedItemsChange,
  initialSelectedItems = [],
}) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialSelectedItems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedItems(initialSelectedItems);
  }, [initialSelectedItems]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/categories");
      setCategories(res.data);
      if (res.data.length > 0 && !selectedCategory) {
        setSelectedCategory(res.data[0].category_id);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/products");
      setProducts(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setLoading(false);
    }
  };

  const handleAddItem = (item) => {
    const existing = selectedItems.find((i) => i.id === item.item_id);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: item.item_id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: 1,
          image: item.image,
        },
      ]);
    }
  };

  const handleRemoveItem = (itemId) => {
    const existing = selectedItems.find((i) => i.id === itemId);
    if (existing && existing.quantity === 1) {
      setSelectedItems(selectedItems.filter((i) => i.id !== itemId));
    } else {
      setSelectedItems(
        selectedItems.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i,
        ),
      );
    }
  };

  const handleConfirm = () => {
    onSelectedItemsChange(selectedItems);
    onClose();
  };

  const filteredProducts = products.filter(
    (p) => p.category_id === selectedCategory,
  );

  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (!isOpen) return null;

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div
        className="menu-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-modal-header">
          <h2>Select Packages</h2>
          <button className="menu-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="menu-modal-content">
          <div className="menu-categories">
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                className={`category-btn ${
                  selectedCategory === cat.category_id ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(cat.category_id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="menu-items-grid">
            {loading ? (
              <div className="loading-spinner">Loading packages...</div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((item) => (
                <div key={item.item_id} className="menu-item-card">
                  <div className="menu-item-image">
                    {item.image ? (
                      <img
                        src={`http://localhost:5000/uploads/${item.image}`}
                        alt={item.name}
                      />
                    ) : (
                      <div className="menu-item-placeholder">
                        <ShoppingBag size={32} />
                      </div>
                    )}
                  </div>
                  <div className="menu-item-info">
                    <h4>{item.name}</h4>
                    <p className="menu-item-price">
                      ₱{parseFloat(item.price).toFixed(2)}
                    </p>
                    <div className="menu-item-actions">
                      <button
                        className="qty-btn"
                        onClick={() => handleRemoveItem(item.item_id)}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="qty-value">
                        {selectedItems.find((i) => i.id === item.item_id)
                          ?.quantity || 0}
                      </span>
                      <button
                        className="qty-btn"
                        onClick={() => handleAddItem(item)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-items">No items in this category</p>
            )}
          </div>
        </div>

        <div className="menu-modal-footer">
          <div className="menu-summary">
            <span>Total: ₱{totalPrice.toFixed(2)}</span>
          </div>
          <button className="menu-confirm-btn" onClick={handleConfirm}>
            Confirm Selection ({selectedItems.length} items)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackageModal;

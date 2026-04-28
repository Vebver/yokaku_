import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle,
  Info,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import "../Style/PackageModal.css";

const API_BASE = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000";

// Helper function to get correct image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/uploads/")) return `${BASE_URL}${imagePath}`;
  return `${BASE_URL}/uploads/${imagePath}`;
};

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
  const [imageErrors, setImageErrors] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);

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
      const res = await axios.get(`${API_BASE}/categories`);
      setCategories(res.data);
      if (res.data.length > 0 && !selectedCategory) {
        setSelectedCategory(Number(res.data[0].category_id));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/products`);
      console.log("Products fetched:", res.data);
      setProducts(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setLoading(false);
    }
  };

  const isItemSelected = (itemId) => {
    return selectedItems.some((i) => i.id === itemId);
  };

  const getItemQuantity = (itemId) => {
    const item = selectedItems.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  };

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setItemQuantity(getItemQuantity(item.item_id) || 1);
    setShowItemModal(true);
  };

  const handleIncreaseQuantity = () => {
    setItemQuantity((prev) => prev + 1);
  };

  const handleDecreaseQuantity = () => {
    if (itemQuantity > 1) {
      setItemQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = () => {
    const existing = selectedItems.find((i) => i.id === selectedItem.item_id);

    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.id === selectedItem.item_id ? { ...i, quantity: itemQuantity } : i,
        ),
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: selectedItem.item_id,
          name: selectedItem.name,
          price: parseFloat(selectedItem.price),
          quantity: itemQuantity,
          image: selectedItem.image_url,
          description: selectedItem.description,
        },
      ]);
    }
    setShowItemModal(false);
    setSelectedItem(null);
    setItemQuantity(1);
  };

  const handleRemoveFromCart = () => {
    setSelectedItems(
      selectedItems.filter((i) => i.id !== selectedItem.item_id),
    );
    setShowItemModal(false);
    setSelectedItem(null);
    setItemQuantity(1);
  };

  const handleRemoveCartItem = (itemId) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== itemId));
  };

  const handleUpdateCartItem = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveCartItem(itemId);
    } else {
      setSelectedItems(
        selectedItems.map((i) =>
          i.id === itemId ? { ...i, quantity: newQuantity } : i,
        ),
      );
    }
  };

  const handleViewOrder = () => {
    setShowCartModal(true);
  };

  const handleConfirmOrder = () => {
    onSelectedItemsChange(selectedItems);
    setShowCartModal(false);
    onClose();
  };

  const handleCancelOrder = () => {
    setShowCartModal(false);
  };

  const handleImageError = (itemId, imageUrl) => {
    console.error(`Failed to load image for item ${itemId}:`, imageUrl);
    setImageErrors((prev) => ({ ...prev, [itemId]: true }));
  };

  const filteredProducts = products.filter(
    (p) => Number(p.category_id) === Number(selectedCategory),
  );

  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (!isOpen) return null;

  return (
    <>
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
                    Number(selectedCategory) === Number(cat.category_id)
                      ? "active"
                      : ""
                  }`}
                  onClick={() => setSelectedCategory(Number(cat.category_id))}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="menu-items-grid">
              {loading ? (
                <div className="loading-spinner">Loading packages...</div>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((item) => {
                  const isSelected = isItemSelected(item.item_id);
                  const quantity = getItemQuantity(item.item_id);
                  const imageUrl = getImageUrl(item.image_url);
                  const hasImage = imageUrl && !imageErrors[item.item_id];

                  return (
                    <div
                      key={item.item_id}
                      className={`menu-item-card ${isSelected ? "selected" : ""}`}
                      onClick={() => handleCardClick(item)}
                    >
                      <div className="menu-item-image">
                        {hasImage ? (
                          <img
                            src={imageUrl}
                            alt={item.name}
                            onError={() =>
                              handleImageError(item.item_id, imageUrl)
                            }
                          />
                        ) : (
                          <div className="menu-item-placeholder">
                            <ShoppingBag size={32} />
                          </div>
                        )}
                        {isSelected && (
                          <div className="selected-overlay">
                            <CheckCircle size={32} color="#f38d31" />
                          </div>
                        )}
                      </div>
                      <div className="menu-item-info">
                        <div className="menu-item-header">
                          <h4>{item.name}</h4>
                          {isSelected && (
                            <span className="selected-badge">
                              {quantity} in cart
                            </span>
                          )}
                        </div>
                        <p className="menu-item-price">
                          ₱{parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="no-items">No items in this category</p>
              )}
            </div>
          </div>

          <div className="menu-modal-footer">
            <div className="menu-summary">
              <span>Total: ₱{totalPrice.toFixed(2)}</span>
              <span className="selected-count">
                ({selectedItems.length} item
                {selectedItems.length !== 1 ? "s" : ""} selected)
              </span>
            </div>
            <button className="view-order-btn" onClick={handleViewOrder}>
              <ShoppingCart size={18} />
              View Order ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>

      {/* Item Detail Modal */}
      {showItemModal && selectedItem && (
        <div
          className="item-detail-modal-overlay"
          onClick={() => setShowItemModal(false)}
        >
          <div
            className="item-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="item-detail-close"
              onClick={() => setShowItemModal(false)}
            >
              <X size={24} />
            </button>

            <div className="item-detail-modal-content">
              <div className="item-detail-modal-image">
                {getImageUrl(selectedItem.image_url) &&
                !imageErrors[selectedItem.item_id] ? (
                  <img
                    src={getImageUrl(selectedItem.image_url)}
                    alt={selectedItem.name}
                    onError={() =>
                      handleImageError(
                        selectedItem.item_id,
                        getImageUrl(selectedItem.image_url),
                      )
                    }
                  />
                ) : (
                  <div className="item-detail-placeholder">
                    <ShoppingBag size={64} />
                  </div>
                )}
              </div>

              <div className="item-detail-modal-info">
                <h2>{selectedItem.name}</h2>
                <p className="item-detail-modal-price">
                  ₱{parseFloat(selectedItem.price).toFixed(2)}
                </p>
                <p className="item-detail-modal-description">
                  {selectedItem.description ||
                    "No description available for this item."}
                </p>

                <div className="item-detail-quantity">
                  <label>Quantity:</label>
                  <div className="quantity-controls">
                    <button
                      className="qty-btn"
                      onClick={handleDecreaseQuantity}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="qty-value">{itemQuantity}</span>
                    <button
                      className="qty-btn"
                      onClick={handleIncreaseQuantity}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="item-detail-actions">
                  {isItemSelected(selectedItem.item_id) && (
                    <button
                      className="remove-btn"
                      onClick={handleRemoveFromCart}
                    >
                      Remove from Cart
                    </button>
                  )}
                  <button className="add-btn" onClick={handleAddToCart}>
                    {isItemSelected(selectedItem.item_id)
                      ? "Update Cart"
                      : "Add to Cart"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal - View Order */}
      {showCartModal && (
        <div
          className="cart-modal-overlay"
          onClick={() => setShowCartModal(false)}
        >
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-modal-header">
              <h2>Your Order</h2>
              <button
                className="cart-modal-close"
                onClick={() => setShowCartModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="cart-modal-content">
              {selectedItems.length === 0 ? (
                <div className="empty-cart">
                  <ShoppingBag size={64} color="#ccc" />
                  <p>Your order is empty</p>
                  <button
                    className="continue-shopping-btn"
                    onClick={() => setShowCartModal(false)}
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-image">
                          {getImageUrl(item.image) ? (
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                            />
                          ) : (
                            <ShoppingBag size={32} />
                          )}
                        </div>
                        <div className="cart-item-details">
                          <h4>{item.name}</h4>
                          <p>₱{item.price.toFixed(2)} each</p>
                        </div>
                        <div className="cart-item-quantity">
                          <button
                            className="cart-qty-btn"
                            onClick={() =>
                              handleUpdateCartItem(item.id, item.quantity - 1)
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            className="cart-qty-btn"
                            onClick={() =>
                              handleUpdateCartItem(item.id, item.quantity + 1)
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="cart-item-total">
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          className="cart-item-remove"
                          onClick={() => handleRemoveCartItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="cart-summary">
                    <div className="cart-total-row">
                      <span>Subtotal:</span>
                      <span>₱{totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="cart-total-row">
                      <span>Service Charge (10%):</span>
                      <span>₱{(totalPrice * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="cart-total-row grand-total">
                      <span>Grand Total:</span>
                      <span>₱{(totalPrice * 1.1).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="cart-modal-footer">
              <button className="cancel-order-btn" onClick={handleCancelOrder}>
                Cancel
              </button>
              <button
                className="confirm-order-btn"
                onClick={handleConfirmOrder}
                disabled={selectedItems.length === 0}
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PackageModal;

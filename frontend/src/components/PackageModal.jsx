import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle,
  ShoppingCart,
  Trash2,
  Settings,
} from "lucide-react";
import "../Style/PackageModal.css";

const API_BASE = "https://yokaku-backend.onrender.com/api";
const BASE_URL = "https://yokaku-backend.onrender.com";

const getImageUrl = (item) => {
  const imagePath = item.local_path || item.image_url;
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/uploads/")) return `${BASE_URL}${imagePath}`;
  return `${BASE_URL}/uploads/${imagePath}`;
};

const PackageModal = ({
  onClose,
  onSelectedItemsChange,
  initialSelectedItems = [],
}) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialSelectedItems);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const [itemNote, setItemNote] = useState("");

  const [customizations, setCustomizations] = useState({
    addOns: [],
    flavors: [],
    drink: "",
    specialInstructions: "None",
    spiceLevel: "Medium",
    selectedRamenFlavor: "",
  });

  const currentCategory = categories.find(
    (c) => c.category_id === selectedItem?.category_id,
  );
  const isUnliPackage = currentCategory?.name === "Unlimited";
  const isHangoutBundle =
    currentCategory?.name === "Hangout Bundle" ||
    selectedItem?.name?.toLowerCase().includes("hangout") ||
    currentCategory?.name?.toLowerCase().includes("bundle");
  const isRamenItem = selectedItem?.name?.toLowerCase().includes("ramen");
  const isRamenSetItem = selectedItem?.name
    ?.toLowerCase()
    .includes("ramen set");
  const canCustomize = isUnliPackage || isRamenItem || isRamenSetItem;
  const HIDDEN_CATEGORIES = ["Chicken", "Drinks"];

  // Get Ramen flavors from products with their images
  const ramenFlavors = products.filter(
    (p) =>
      categories.find((c) => c.category_id === p.category_id)?.name === "Ramen",
  );

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    setSelectedItems(initialSelectedItems);
  }, [initialSelectedItems]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories`);
      const publicCategories = res.data.filter(
        (cat) => !HIDDEN_CATEGORIES.includes(cat.name),
      );
      setCategories(res.data);
      if (publicCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(Number(publicCategories[0].category_id));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/products`);
      setProducts(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setLoading(false);
    }
  };

  const handleCardClick = (item) => {
    const existingItem = selectedItems.find((i) => i.id === item.item_id);
    const itemCategory = categories.find(
      (c) => c.category_id === item.category_id,
    );
    const isUnli = itemCategory?.name === "Unlimited";
    const isBundle =
      itemCategory?.name === "Hangout Bundle" ||
      item.name?.toLowerCase().includes("hangout") ||
      itemCategory?.name?.toLowerCase().includes("bundle");
    const isRamenSet = item.name?.toLowerCase().includes("ramen set");

    setSelectedItem(item);
    setItemQuantity(existingItem?.quantity || 1);
    setShowCustomizePanel(false);
    setItemNote(existingItem?.note || "");

    if (existingItem) {
      setCustomizations(existingItem.customizations);
    } else {
      const chickenProducts = products.filter(
        (p) =>
          categories.find((c) => c.category_id === p.category_id)?.name ===
          "Chicken",
      );

      const firstDrink = products.find(
        (p) =>
          categories.find((c) => c.category_id === p.category_id)?.name ===
          "Drinks",
      )?.name;

      // Get first ramen flavor as default if it's a Ramen Set
      const defaultRamenFlavor =
        ramenFlavors.length > 0 ? ramenFlavors[0].name : "";

      setCustomizations({
        addOns: [],
        flavors:
          isUnli || isBundle
            ? chickenProducts.slice(0, 4).map((p) => p.name)
            : [],
        drink: (isUnli || isBundle) && firstDrink ? firstDrink : "",
        spiceLevel: "Medium",
        specialInstructions: "None",
        selectedRamenFlavor: isRamenSet ? defaultRamenFlavor : "",
      });
    }
    setShowItemModal(true);
  };

  const handleFlavorToggle = (flavorName) => {
    setCustomizations((prev) => {
      const isSelected = prev.flavors.includes(flavorName);
      if (isSelected) {
        return {
          ...prev,
          flavors: prev.flavors.filter((f) => f !== flavorName),
        };
      } else {
        if (prev.flavors.length < 4) {
          return { ...prev, flavors: [...prev.flavors, flavorName] };
        } else {
          alert("You can only select up to 4 flavors.");
          return prev;
        }
      }
    });
  };

  const handleAddToCart = () => {
    // Get the full product details for image URL
    const fullProduct = products.find(
      (p) => p.item_id === selectedItem.item_id,
    );

    // Use getImageUrl to get the full image URL
    const imageUrl = getImageUrl(fullProduct || selectedItem);

    const newItemData = {
      id: selectedItem.item_id,
      name: selectedItem.name,
      price: Math.round(parseFloat(selectedItem.price) * 100) / 100,
      quantity: itemQuantity,
      image: imageUrl, // ← CHANGE: Use the full URL from getImageUrl
      note: itemNote,
      customizations: canCustomize ? customizations: null,
    };

    const updatedItems = selectedItems.find(
      (i) => i.id === selectedItem.item_id,
    )
      ? selectedItems.map((i) =>
          i.id === selectedItem.item_id ? newItemData : i,
        )
      : [...selectedItems, newItemData];

    setSelectedItems(updatedItems);
    onSelectedItemsChange(updatedItems);
    setShowItemModal(false);
    setItemNote("");
  };

  const handleRemoveCartItem = (itemId) => {
    const updatedItems = selectedItems.filter((i) => i.id !== itemId);
    setSelectedItems(updatedItems);
    onSelectedItemsChange(updatedItems);
  };

  const handleUpdateCartItem = (itemId, newQuantity) => {
    if (newQuantity <= 0) return handleRemoveCartItem(itemId);
    const updatedItems = selectedItems.map((i) =>
      i.id === itemId ? { ...i, quantity: newQuantity } : i,
    );
    setSelectedItems(updatedItems);
    onSelectedItemsChange(updatedItems);
  };

  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <div className="package-inline-container">
      {/* Header */}
      <div className="package-inline-header">
        <h2>Select Packages</h2>
        <button className="package-inline-close" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="package-inline-content">
        <div className="menu-categories">
          {categories
            .filter((cat) => !HIDDEN_CATEGORIES.includes(cat.name))
            .map((cat) => (
              <button
                key={cat.category_id}
                className={`category-btn ${Number(selectedCategory) === Number(cat.category_id) ? "active" : ""}`}
                onClick={() => setSelectedCategory(Number(cat.category_id))}
              >
                {cat.name}
              </button>
            ))}
        </div>

        <div className="menu-items-grid">
          {loading ? (
            <div className="loading-spinner">Loading packages...</div>
          ) : products.filter(
              (p) => Number(p.category_id) === Number(selectedCategory),
            ).length > 0 ? (
            products
              .filter((p) => Number(p.category_id) === Number(selectedCategory))
              .map((item) => (
                <div
                  key={item.item_id}
                  className={`menu-item-card ${selectedItems.some((i) => i.id === item.item_id) ? "selected" : ""}`}
                  onClick={() => handleCardClick(item)}
                >
                  <div className="menu-item-image">
                    <img
                      src={getImageUrl(item)}
                      alt={item.name}
                      onError={(e) =>
                        (e.target.src = "https://placehold.co/100")
                      }
                    />
                    {selectedItems.some((i) => i.id === item.item_id) && (
                      <div className="selected-overlay">
                        <CheckCircle size={32} color="#f38d31" />
                      </div>
                    )}
                  </div>
                  <div className="menu-item-info">
                    <h4>{item.name}</h4>
                    <p className="menu-item-price">
                      ₱{parseFloat(item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
          ) : (
            <p className="no-items">No items in this category</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="package-inline-footer">
        <div className="menu-summary">
          <span>Total: ₱{totalPrice.toFixed(2)}</span>
        </div>
        <button
          className="view-order-btn"
          onClick={() => setShowCartModal(true)}
        >
          <ShoppingCart size={18} /> View Order ({selectedItems.length})
        </button>
      </div>

      {/* Item Detail Modal (still needed for customization) */}
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
                <img
                  src={getImageUrl(selectedItem)}
                  alt={selectedItem.name}
                  onError={(e) => (e.target.src = "https://placehold.co/150")}
                />
              </div>
              <div className="item-detail-modal-info">
                <h2>{selectedItem.name}</h2>
                <p className="item-detail-modal-price">
                  ₱{parseFloat(selectedItem.price).toFixed(2)}
                </p>
                <p className="item-detail-modal-description">
                  {selectedItem.description || "No description available."}
                </p>

                {!showCustomizePanel ? (
                  <>
                    <div className="item-detail-quantity">
                      <label>Quantity:</label>
                      <div className="quantity-controls">
                        <button
                          className="qty-btn"
                          onClick={() =>
                            setItemQuantity((q) => Math.max(1, q - 1))
                          }
                        >
                          <Minus size={16} />
                        </button>
                        <span className="qty-value">{itemQuantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => setItemQuantity((q) => q + 1)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* ============ RAMEN FLAVOR SELECTION WITH IMAGES (for Ramen Set in Hangout Bundle) ============ */}
                    {isRamenSetItem && ramenFlavors.length > 0 && (
                      <div className="item-detail-ramen-flavors">
                        <label>Select Ramen Flavor:</label>
                        <div className="ramen-flavor-grid">
                          {ramenFlavors.map((flavor) => (
                            <button
                              key={flavor.item_id}
                              className={`ramen-flavor-btn ${customizations.selectedRamenFlavor === flavor.name ? "active" : ""}`}
                              onClick={() =>
                                setCustomizations((prev) => ({
                                  ...prev,
                                  selectedRamenFlavor: flavor.name,
                                }))
                              }
                            >
                              <div className="ramen-flavor-image">
                                <img
                                  src={getImageUrl(flavor)}
                                  alt={flavor.name}
                                  onError={(e) => {
                                    e.target.src = "https://placehold.co/80";
                                  }}
                                />
                              </div>
                              <span className="ramen-flavor-name">
                                {flavor.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* NOTE TEXT FIELD (for all items) */}
                    <div className="item-detail-note">
                      <label>Add a Note (Optional)</label>
                      <textarea
                        className="item-note-textarea"
                        placeholder="e.g., No onions, extra sauce, less ice..."
                        value={itemNote}
                        onChange={(e) => setItemNote(e.target.value)}
                        rows="2"
                      />
                    </div>

                    <div className="item-detail-actions">
                      {/* Show Customize button for Unlimited AND Hangout Bundle */}
                      {isUnliPackage &&
                        !isRamenSetItem && (
                          <button
                            className="customize-btn"
                            onClick={() => setShowCustomizePanel(true)}
                          >
                            <Settings size={16} /> Customize Selections
                          </button>
                        )}
                      <button
                        className="cancel-btn"
                        onClick={() => setShowItemModal(false)}
                      >
                        Cancel
                      </button>
                      <button className="add-btn" onClick={handleAddToCart}>
                        Add to Cart
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="customize-panel">
                    <h3>Customize Your {selectedItem?.name}</h3>

                    {/* Chicken Flavors */}
                    <div className="customize-section">
                      <label className="section-label-highlight">
                        Choose Chicken Flavors (Pick up to 4):
                      </label>
                      <div className="flavor-grid">
                        {products
                          .filter(
                            (p) =>
                              categories.find(
                                (c) => c.category_id === p.category_id,
                              )?.name === "Chicken",
                          )
                          .map((flavor) => (
                            <button
                              key={flavor.item_id}
                              className={`spice-btn ${customizations.flavors.includes(flavor.name) ? "active" : ""}`}
                              onClick={() => handleFlavorToggle(flavor.name)}
                            >
                              {flavor.name}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Drinks */}
                    <div className="customize-section">
                      <label className="section-label-highlight">
                        Choose Drink (Included):
                      </label>
                      <div className="flavor-grid">
                        {products
                          .filter(
                            (p) =>
                              categories.find(
                                (c) => c.category_id === p.category_id,
                              )?.name === "Drinks",
                          )
                          .map((drink) => (
                            <button
                              key={drink.item_id}
                              className={`spice-btn ${customizations.drink === drink.name ? "active" : ""}`}
                              onClick={() =>
                                setCustomizations((prev) => ({
                                  ...prev,
                                  drink: drink.name,
                                }))
                              }
                            >
                              {drink.name}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Spice Level */}
                    <div className="customize-section">
                      <label>Spice Level:</label>
                      <div className="spice-levels">
                        {["Mild", "Medium", "Hot"].map((level) => (
                          <button
                            key={level}
                            className={`spice-btn ${customizations.spiceLevel === level ? "active" : ""}`}
                            onClick={() =>
                              setCustomizations((prev) => ({
                                ...prev,
                                spiceLevel: level,
                              }))
                            }
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Special Instructions */}
                    <div className="customize-section">
                      <label>Special Instructions:</label>
                      <textarea
                        className="special-instructions"
                        placeholder="e.g., No onions, extra napkins..."
                        value={customizations.specialInstructions}
                        onChange={(e) =>
                          setCustomizations((prev) => ({
                            ...prev,
                            specialInstructions: e.target.value,
                          }))
                        }
                        rows="3"
                      />
                    </div>

                    {/* Note Field in Customize Panel */}
                    <div className="customize-section">
                      <label>Add a Note (Optional):</label>
                      <textarea
                        className="special-instructions"
                        placeholder="e.g., No onions, extra sauce, less ice..."
                        value={itemNote}
                        onChange={(e) => setItemNote(e.target.value)}
                        rows="2"
                      />
                    </div>

                    <div className="customize-actions">
                      <button
                        className="save-customize-btn"
                        onClick={() => setShowCustomizePanel(false)}
                      >
                        Save Selections
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal with Images */}
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
                <p className="empty-cart">Your order is empty</p>
              ) : (
                <div className="cart-items">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="cart-item">
                      {/* Item Image */}
                      <div className="cart-item-image">
                        <img
                          src={
                            item.image && item.image !== "null"
                              ? item.image
                              : "https://placehold.co/60"
                          }
                          alt={item.name}
                          onError={(e) => {
                            e.target.src = "https://placehold.co/60";
                          }}
                        />
                      </div>
                      <div className="cart-item-details">
                        <h4>{item.name}</h4>
                        <p>₱{item.price.toFixed(2)} each</p>
                        {item.note && (
                          <div className="cart-item-note">
                            <small>
                              <strong>Note:</strong> {item.note}
                            </small>
                          </div>
                        )}
                        {item.customizations && (
                          <div className="cart-item-customizations">
                            {item.customizations.selectedRamenFlavor && (
                              <small>
                                Ramen Flavor:{" "}
                                {item.customizations.selectedRamenFlavor}
                              </small>
                            )}
                            {item.customizations.flavors?.length > 0 && (
                              <small>
                                Flavors:{" "}
                                {item.customizations.flavors.join(", ")}
                              </small>
                            )}
                            {item.customizations.drink && (
                              <small>Drink: {item.customizations.drink}</small>
                            )}
                            {item.customizations.spiceLevel && (
                              <small>
                                Spice: {item.customizations.spiceLevel}
                              </small>
                            )}
                            {item.customizations.specialInstructions &&
                              item.customizations.specialInstructions !==
                                "None" && (
                                <small>
                                  Instructions:{" "}
                                  {item.customizations.specialInstructions}
                                </small>
                              )}
                          </div>
                        )}
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
                      <button
                        className="cart-item-remove"
                        onClick={() => handleRemoveCartItem(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="cart-modal-footer">
              <button
                className="confirm-order-btn"
                onClick={() => {
                  onSelectedItemsChange(selectedItems);
                  setShowCartModal(false);
                  onClose();
                }}
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageModal;

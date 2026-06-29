import React, { useState, useEffect } from "react";
import { Plus, Minus, Check } from "lucide-react";
import "../../Style/ReservationOrderModal.css";
import { useToast } from "../ToastContext";

const ReservationOrderModal = ({
  isOpen,
  onClose,
  item,
  onAdd,
  allProducts,
}) => {
  const [quantity, setQuantity] = useState(1);
  const { showToast } = useToast();
  // UPDATED: Added flavors (array), spiceLevel, and specialInstructions
  const [customizations, setCustomizations] = useState({
    flavors: [],
    drink: "",
    spiceLevel: "Medium",
    specialInstructions: "None",
  });

  const categoryName = item?.category?.toLowerCase() || "";
  const isBundle =
    categoryName.includes("bundle") ||
    categoryName.includes("unli") ||
    item?.name?.toLowerCase().includes("unlimited");

  // Helper to find items by keyword (e.g., finding the "Chicken" category list)
  const getItemsByKeywords = (keywords) => {
    // FIXED: Stronger safety guard to prevent Object.keys(null) crash
    if (
      !allProducts ||
      Array.isArray(allProducts) ||
      typeof allProducts !== "object"
    ) {
      return [];
    }

    const keys = Object.keys(allProducts);
    const foundKey = keys.find((key) =>
      keywords.some((word) => key.toLowerCase().includes(word.toLowerCase())),
    );

    return foundKey ? allProducts[foundKey] : [];
  };

  const chickenOptions = getItemsByKeywords(["Chicken", "Wings"]);
  const drinkOptions = getItemsByKeywords(["Drink", "Beverage", "Soda"]);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);

      // 1. If it's a Reserved Item from the Web, load those choices
      if (item?.customizations) {
        setCustomizations({
          flavors: item.customizations.flavors || [],
          drink: item.customizations.drink || "",
          spiceLevel: item.customizations.spiceLevel || "Medium",
          specialInstructions:
            item.customizations.specialInstructions || "None",
        });
      }
      // 2. If it's a NEW bundle selection, set the 4-flavor default
      else if (isBundle && chickenOptions.length > 0) {
        setCustomizations({
          flavors: chickenOptions.slice(0, 4).map((f) => f.name),
          drink: drinkOptions.length > 0 ? drinkOptions[0].name : "",
          spiceLevel: "Medium",
          specialInstructions: "None",
        });
      }
    }
  }, [isOpen, item, allProducts]); // Added allProducts to dependency to re-run when data arrives

  if (!isOpen) return null;

  // Handle picking/unpicking flavors (Max 4)
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
          showToast("You can only select up to 4 flavors.");
          return prev;
        }
      }
    });
  };

  const handleAdd = () => {
    if (
      isBundle &&
      (customizations.flavors.length === 0 || !customizations.drink)
    ) {
      showToast("Please select your flavors and drink.");
      return;
    }

    // Parse the quantity state safely (falls back to 1 if empty)
    const finalQuantity = parseInt(quantity, 10) || 1;

    onAdd({
      ...item,
      quantity: finalQuantity,
      customizations: isBundle ? customizations : null,
    });
    onClose();
  };

  return (
    <div
      className={`res-modal-overlay ${isOpen ? "active" : ""}`}
      onClick={onClose}
    >
      <div
        className={`res-bottom-sheet ${isOpen ? "slide-up" : ""} ${isBundle ? "is-bundle" : "is-single"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" onClick={onClose}></div>
        <div className="flex-container">
          <div className="scrollable-content">
            <div className="item-main-info">
              <div className="item-preview-card">
                <img
                  src={item?.image}
                  alt={item?.name}
                  className="item-image"
                />
              </div>
              <div className="item-text-details">
                <h2 className="item-name">{item?.name}</h2>
                <div className="item-price-tag">
                  ₱{parseFloat(item?.price).toFixed(2)}
                </div>
                <p className="item-description">
                  {item?.description ||
                    "Signature item prepared with fresh ingredients."}
                </p>
              </div>
            </div>

            {isBundle && (
              <div className="bundle-options">
                <h3 className="section-title">
                  1. CHOOSE CHICKEN FLAVORS (UP TO 4)
                </h3>
                <div className="chip-grid">
                  {chickenOptions.map((f) => (
                    <button
                      key={f.id || f.item_id}
                      className={`selection-chip ${customizations.flavors.includes(f.name) ? "active" : ""}`}
                      onClick={() => handleFlavorToggle(f.name)}
                    >
                      {customizations.flavors.includes(f.name) && (
                        <Check size={14} className="chip-icon" />
                      )}
                      {f.name}
                    </button>
                  ))}
                </div>

                <h3 className="section-title" style={{ marginTop: "25px" }}>
                  2. SELECT DRINK
                </h3>
                <div className="chip-grid">
                  {drinkOptions.map((d) => (
                    <button
                      key={d.id || d.item_id}
                      className={`selection-chip ${customizations.drink === d.name ? "active" : ""}`}
                      onClick={() =>
                        setCustomizations({ ...customizations, drink: d.name })
                      }
                    >
                      {customizations.drink === d.name && (
                        <Check size={14} className="chip-icon" />
                      )}
                      {d.name}
                    </button>
                  ))}
                </div>

                <h3 className="section-title" style={{ marginTop: "25px" }}>
                  3. SPICE LEVEL
                </h3>
                <div className="chip-grid">
                  {["Mild", "Medium", "Hot"].map((level) => (
                    <button
                      key={level}
                      className={`selection-chip ${customizations.spiceLevel === level ? "active" : ""}`}
                      onClick={() =>
                        setCustomizations({
                          ...customizations,
                          spiceLevel: level,
                        })
                      }
                    >
                      {level}
                    </button>
                  ))}
                </div>

                <h3 className="section-title" style={{ marginTop: "25px" }}>
                  4. SPECIAL INSTRUCTIONS
                </h3>
                <textarea
                  className="res-textarea"
                  placeholder="e.g. No onions, extra spicy..."
                  value={
                    customizations.specialInstructions === "None"
                      ? ""
                      : customizations.specialInstructions
                  }
                  onChange={(e) =>
                    setCustomizations({
                      ...customizations,
                      specialInstructions: e.target.value || "None",
                    })
                  }
                />
              </div>
            )}

            <div className="qty-section">
              <span className="qty-label">QUANTITY</span>
              <div className="qty-picker">
                {/* DECREMENT BUTTON (Min limit: 1) */}
                <button
                  onClick={() =>
                    setQuantity((q) => {
                      const current = parseInt(q, 10) || 1;
                      return Math.max(1, current - 1);
                    })
                  }
                >
                  <Minus size={20} />
                </button>

                {/* TEXT INPUT FIELD WITH LIMITERS (1 to 50) */}
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val) || val < 1) {
                      setQuantity(""); // Allow empty temporarily for backspacing
                    } else if (val > 20) {
                      setQuantity(20); // Hard ceiling at 50 if they type a larger number
                    } else {
                      setQuantity(val);
                    }
                  }}
                  onBlur={() => {
                    if (quantity === "" || quantity < 1) {
                      setQuantity(1);
                    } else if (quantity > 20) {
                      setQuantity(20);
                    }
                  }}
                  className="qty-input-field"
                />

                {/* INCREMENT BUTTON (Max limit: 50) */}
                <button
                  onClick={() =>
                    setQuantity((q) => {
                      const current = parseInt(q, 10) || 1;
                      return Math.min(20, current + 1); // Hard limit to 50
                    })
                  }
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="fixed-footer">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`btn-submit ${isBundle && (customizations.flavors.length === 0 || !customizations.drink) ? "disabled" : ""}`}
              onClick={handleAdd}
            >
              Add to Tray - ₱
              {(item?.price * (parseInt(quantity, 10) || 1)).toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .qty-input-field {
          font-size: 1.6rem;
          font-weight: 900;
          width: 60px;
          text-align: center;
          border: none;
          background: transparent;
          font-family: inherit;
          color: #222;
        }
        .qty-input-field:focus {
          outline: none;
        }
        /* Hide HTML5 arrows inside input box */
        .qty-input-field::-webkit-inner-spin-button,
        .qty-input-field::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .qty-input-field {
          -moz-appearance: textfield; /* Firefox */
        }
        .res-textarea {
          width: 100%;
          border: 2px solid #eee;
          border-radius: 15px;
          padding: 15px;
          font-family: inherit;
          font-weight: 700;
          color: #444;
          resize: none;
          height: 100px;
          margin-top: 5px;
          background: #fdfdfd;
        }
        .res-textarea:focus {
          outline: none;
          border-color: #ffcc00;
          background: #fff;
        }
        .res-bottom-sheet {
          background: #fff;
          border-radius: 30px 30px 0 0;
          display: flex;
          flex-direction: column;
          transition: height 0.3s ease;
        }
        .res-bottom-sheet.is-bundle {
          height: 85vh;
        }
        .res-bottom-sheet.is-single {
          height: auto;
          max-height: 85vh;
        }
        .flex-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .scrollable-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 30px;
          scrollbar-width: none;
        }
        .item-main-info {
          display: flex;
          gap: 25px;
          margin-bottom: 25px;
        }
        .item-preview-card {
          width: 140px;
          height: 140px;
          border-radius: 24px;
          overflow: hidden;
          background: #f9f9f9;
          flex-shrink: 0;
        }
        .item-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .item-name {
          font-size: 1.8rem;
          font-weight: 900;
          color: #222;
          margin: 0;
          text-transform: uppercase;
        }
        .item-price-tag {
          color: #ffcc00;
          font-size: 1.5rem;
          font-weight: 800;
        }
        .section-title {
          font-size: 0.8rem;
          font-weight: 800;
          color: #aaa;
          margin-bottom: 12px;
          letter-spacing: 1px;
        }
        .chip-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .selection-chip {
          background: #f4f4f4;
          border: 2px solid transparent;
          padding: 14px;
          border-radius: 15px;
          font-weight: 700;
          color: #444;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .selection-chip.active {
          background: #000;
          color: #ffcc00;
          border-color: #ffcc00;
        }
        .qty-section {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding-bottom: 30px;
        }
        .qty-picker {
          display: flex;
          align-items: center;
          gap: 40px;
          background: #f8f8f8;
          padding: 10px 15px;
          border-radius: 50px;
          border: 1px solid #eee;
        }
        .qty-picker button {
          background: #fff;
          border: 1px solid #eee;
          width: 44px;
          height: 44px;
          border-radius: 50%;
        }
        .qty-val {
          font-size: 1.6rem;
          font-weight: 900;
          min-width: 30px;
          text-align: center;
        }
        .fixed-footer {
          padding: 20px 30px 30px;
          background: #fff;
          border-top: 1px solid #f5f5f5;
          display: flex;
          gap: 15px;
        }
        .btn-cancel {
          background: #fff;
          border: 2px solid #eee;
          padding: 16px 25px;
          border-radius: 20px;
          font-weight: 800;
          color: #aaa;
        }
        .btn-submit {
          flex: 1;
          background: #ffcc00;
          color: #000;
          border: none;
          padding: 18px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 1.1rem;
        }
        .btn-submit.disabled {
          background: #f0f0f0;
          color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ReservationOrderModal;

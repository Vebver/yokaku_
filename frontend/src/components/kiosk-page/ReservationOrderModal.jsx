import React, { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import "../../Style/ReservationOrderModal.css";

const ReservationOrderModal = ({ isOpen, onClose, item, onAdd }) => {
  const [quantity, setQuantity] = useState(1);

  // Reset quantity when modal opens for a new item
  useEffect(() => {
    if (isOpen) setQuantity(1);
  }, [isOpen, item]);


  if (!isOpen) return null; // Don't render anything if not open

  // Handle the Add Order action
  const handleAdd = () => {
    if (item) {
      onAdd({
        ...item,
        quantity: quantity,
      });
      // This calls the close function which will also uncheck the card
      onClose();
    }
  };

  return (
    <div
      className={`res-modal-overlay ${isOpen ? "active" : ""}`}
      onClick={onClose} // Clicking outside closes and unchecks
    >
      <div
        className={`res-bottom-sheet ${isOpen ? "slide-up" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle */}
        <div className="sheet-handle" onClick={onClose}></div>

        <div className="sheet-content">
          <div className="item-display-section">
            <div className="item-preview-card">
              {item && (
                <img src={item.image} alt={item.name} className="item-image" />
              )}
            </div>

            <div className="item-info-details">
              <h2 className="item-name">{item?.name || "Loading..."}</h2>
              <p className="item-description">
                {item?.description ||
                  "Enjoy our signature flavor prepared with fresh ingredients and our special Hangout Resto Bar recipe."}
              </p>

              <div className="quantity-control-wrapper">
                <span className="qty-label">Quantity</span>
                <div className="qty-buttons">
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={20} />
                  </button>
                  <span className="qty-number">{quantity}</span>
                  <button
                    className="qty-btn plus"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="sheet-footer">
            <button className="btn-cancel-modal" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-add-modal" onClick={handleAdd}>
              Add Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationOrderModal;

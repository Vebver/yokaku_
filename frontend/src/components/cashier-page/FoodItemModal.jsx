import React, { useState } from 'react';
import '../../Style/FoodItemModal.css';

const FoodItemModal = ({ isOpen, onClose, item }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedFlavors, setSelectedFlavors] = useState([2, 5]); // Mock pre-selected indices
  const [selectedDrinks, setSelectedDrinks] = useState([2,5]);

  if (!isOpen) return null;

  const handleFlavorToggle = (index) => {
    if (selectedFlavors.includes(index)) {
      setSelectedFlavors(selectedFlavors.filter(i => i !== index));
    } else {
      setSelectedFlavors([...selectedFlavors, index]);
    }
  };

  const handleDrinksToggle = (index) => {
    if (selectedDrinks.includes(index)) {
      setSelectedDrinks(selectedDrinks.filter(i => i !== index));
    } else {
      setSelectedDrinks([...selectedDrinks, index]);
    }
  };

  return (
    <div className={`bottom-sheet-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Header / Back Link */}
        <div className="modal-back-link" onClick={onClose}>
          <span>‹</span> Back to Wings & More
        </div>

        <div className="modal-body">
          {/* Section 1: Item Details */}
          <div className="item-main-row">
            <span className="step-number">1</span>
            <div className="item-image-placeholder"></div>
            <div className="item-details">
              <p className="sub-text">Let's choose options for</p>
              <h2 className="item-name">UNLIMITED RICE<br/>WINGS & JUICE</h2>
            </div>
            <div className="qty-price-container">
              <span className="item-base-price">₱0.00</span>
              <div className="qty-controls">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                <span className="qty-value">{quantity}</span>
                <button className="plus" onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>
          </div>

          {/* Section 2: Flavors Grid */}
          <div className="flavor-section">
            <div className="section-title">
              <span className="step-number">2.</span>
              Add Ons <span className="required-label">(Optional)</span>
            </div>
            
            <div className="flavors-grid">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`flavor-box ${selectedFlavors.includes(i) ? 'active' : ''}`}
                  onClick={() => handleFlavorToggle(i)}
                >
                  {/* Icon/Image would go here */}
                </div>
              ))}
            </div>
          </div>

          <div className="drinks-section">
            <div className="section-title">
              <span className="step-number">3.</span>
              Drinks <span className="required-label">(Optional)</span>
            </div>
            
            <div className="drinks-grid">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`drinks-box ${selectedDrinks.includes(i) ? 'active' : ''}`}
                  onClick={() => handleDrinksToggle(i)}
                >
                  {/* Icon/Image would go here */}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="total-price-group">
            <p>Total Price</p>
            <h3>₱0.00</h3>
          </div>
          <div className="footer-btns">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-add">Add to Order</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodItemModal;
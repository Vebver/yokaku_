import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Style/KioskOrder.css';

const KioskOrder = () => {
  const navigate = useNavigate();
  
  // 1. STATE FOR THE ACTUAL ORDER (The Right Panel)
  const [orderItems, setOrderItems] = useState([]);

  // 2. STATES FOR THE SELECTION (The Left Panel)
  const [selectedFlavor, setSelectedFlavor] = useState('Classic');
  const [quantities, setQuantities] = useState({
    wings: 1, // Default to 1 so user can see what they are adding
    rice: 0,   
    juice: 0,
    nachos: 0,
    pasta: 0
  });

  const flavors = [
    "Classic", "Teriyaki", "Barbeque", "Honey Mustard", "Sisig Flavor",
    "Sweet & Chili", "Garlic Mayo", "Hot & Spicy Buffalo"
  ];

  const handleQty = (item, direction) => {
    setQuantities(prev => ({
      ...prev,
      // Wings must be at least 1 to add flavor, Extras can be 0
      [item]: Math.max(item === 'wings' ? 1 : 0, direction === 'add' ? prev[item] + 1 : prev[item] - 1)
    }));
  };

  // 3. THE UPDATED "ADD TO ORDER" FUNCTION WITH MERGING LOGIC
  const handleAddToOrder = () => {
    // a. Create a list of what the user is currently trying to add from the left panel
    const itemsToProcess = [];

    // Add current flavor selection
    itemsToProcess.push({
      description: `${selectedFlavor} Wings`,
      qty: quantities.wings
    });

    // Add Extras only if Qty > 0
    Object.keys(quantities).forEach((key) => {
      if (key !== 'wings' && quantities[key] > 0) {
        itemsToProcess.push({
          description: `Extra ${key.charAt(0).toUpperCase() + key.slice(1)}`,
          qty: quantities[key]
        });
      }
    });

    // b. Merge these items into the existing order list
    setOrderItems(prevItems => {
      const updatedList = [...prevItems];

      itemsToProcess.forEach(newItem => {
        // Find if this item (by description) is already in the order list
        const existingItemIndex = updatedList.findIndex(
          item => item.description === newItem.description
        );

        if (existingItemIndex !== -1) {
          // If it exists, update the quantity
          updatedList[existingItemIndex] = {
            ...updatedList[existingItemIndex],
            qty: updatedList[existingItemIndex].qty + newItem.qty
          };
        } else {
          // If it's new, add it to the list with a unique ID
          updatedList.push({
            id: Date.now() + Math.random(), // Unique ID
            ...newItem
          });
        }
      });

      return updatedList;
    });

    // c. Reset selections on the left after adding
    setQuantities({ wings: 1, rice: 0, juice: 0, nachos: 0, pasta: 0 });
    setSelectedFlavor('Classic');
  };

  // 4. REMOVE ITEM FUNCTION
  const removeItem = (id) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  return (
    <div className="summary-page-wrapper">
      <div className="background-blur"></div>
      
      <div className="summary-logo">
        <h1>HANGOUT</h1>
        <p>Resto Bar</p>
      </div>

      <div className="panels-container">
        {/* LEFT PANEL: SELECTION */}
        <div className="panel left-panel">
          <h3>Wing Flavors</h3>
          <div className="flavors-grid">
            {flavors.map((flavor) => (
              <div key={flavor} className="flavor-item-container">
                <div 
                  className={`flavor-square ${selectedFlavor === flavor ? 'active' : ''}`}
                  onClick={() => setSelectedFlavor(flavor)}
                ></div>
                <span className={selectedFlavor === flavor ? 'text-active' : ''}>{flavor}</span>
              </div>
            ))}
          </div>

          <div className="add-ons-section">
            {Object.keys(quantities).map((item) => (
              <div key={item} className="add-on-row">
                <span className="add-on-name">
                  {item === 'wings' ? "Quantity Wing" : `Extra ${item.charAt(0).toUpperCase() + item.slice(1)}`}
                </span>
                <div className="qty-picker">
                  <button onClick={() => handleQty(item, 'sub')}>-</button>
                  <span>{quantities[item]}</span>
                  <button className="plus" onClick={() => handleQty(item, 'add')}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="panel-footer-btns">
            <button className="btn-filled-gold" onClick={handleAddToOrder}>
                Add to Order
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: DYNAMIC RECEIPT */}
        <div className="panel right-panel">
          <div className="table-header">
            <span>Description</span>
            <span>Qty</span>
          </div>
          <div className="order-list">
            {orderItems.map((item) => (
              <div key={item.id} className="order-item">
                <span className="item-desc">{item.description}</span>
                <span className="qty-val">{item.qty}</span>
              </div>
            ))}
            {orderItems.length === 0 && <p style={{color: '#888', textAlign: 'center', marginTop: '20px'}}>Your order is empty</p>}
          </div>
          
          <div className="item-actions">
            <button className="btn-remove" onClick={() => removeItem(orderItems[orderItems.length - 1]?.id)}>
                Remove Last
            </button>
            <button className="btn-edit" onClick={() => setOrderItems([])}>Clear All</button>
          </div>

          <div className="note-section">
            <label>Additional Note</label>
            <textarea className="note-box" placeholder="Write instructions here..."></textarea>
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <div className="left-actions">
          <button className="btn-assist">
            <span className="bell-icon">🔔</span> Assist Me
          </button>
          <button className="btn-make-another" onClick={() => navigate('/kiosk')}>
            Make another order
          </button>
        </div>
        <button className="btn-send-order" onClick={() => alert("Order Sent to Kitchen!")}>
            Send Order
        </button>
      </div>
    </div>
  );
};

export default KioskOrder;
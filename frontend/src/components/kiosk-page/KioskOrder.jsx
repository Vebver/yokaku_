import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Style/KioskOrder.css';

const KioskOrder = () => {
  const navigate = useNavigate();
  
  const [orderItems, setOrderItems] = useState([]);
  const [selectedFlavor, setSelectedFlavor] = useState('Classic');
  const [quantities, setQuantities] = useState({
    wings: 1, 
    rice: 0,   
    juice: 0,
    nachos: 0,
    pasta: 0
  });

  const flavors = ["Classic", "Teriyaki", "Barbeque", "Honey Mustard", "Sisig Flavor", "Sweet & Chili", "Garlic Mayo", "Hot & Spicy Buffalo"];

  const totalWingsInOrder = orderItems
    .filter(item => item.description.includes("Wings"))
    .reduce((sum, item) => sum + item.qty, 0);

  // Logic to reduce qty or remove item if hits 0
  const handleReduceItemQty = (id) => {
    setOrderItems((prevItems) => 
      prevItems
        .map(item => item.id === id ? { ...item, qty: item.qty - 1 } : item)
        .filter(item => item.qty > 0)
    );
  };

  const handleQty = (item, direction) => {
    setQuantities(prev => ({
      ...prev,
      [item]: Math.max(0, direction === 'add' ? prev[item] + 1 : prev[item] - 1)
    }));
  };

  const handleAddToOrder = () => {
    const wingsToAdd = quantities.wings;
    if (wingsToAdd > 0 && (totalWingsInOrder + wingsToAdd > 24)) {
      alert(`Order limit reached! You can only add ${24 - totalWingsInOrder} more wings.`);
      return; 
    }

    const itemsToProcess = [];
    if (quantities.wings > 0) {
        itemsToProcess.push({ description: `${selectedFlavor} Wings`, qty: quantities.wings });
    }

    Object.keys(quantities).forEach((key) => {
      if (key !== 'wings' && quantities[key] > 0) {
        itemsToProcess.push({ description: `Extra ${key.charAt(0).toUpperCase() + key.slice(1)}`, qty: quantities[key] });
      }
    });

    setOrderItems(prevItems => {
      const updatedList = [...prevItems];
      itemsToProcess.forEach(newItem => {
        const index = updatedList.findIndex(item => item.description === newItem.description);
        if (index > -1) {
          updatedList[index] = { ...updatedList[index], qty: updatedList[index].qty + newItem.qty };
        } else {
          updatedList.push({ id: Date.now() + Math.random(), ...newItem });
        }
      });
      return updatedList;
    });

    setQuantities({ wings: 0, rice: 0, juice: 0, nachos: 0, pasta: 0 });
  };

  const getPackageName = (id) => id ? String.fromCharCode(64 + id) : "";

  return (
    <div className="summary-page-wrapper">
      <div className="background-blur"></div>
      <div className="summary-logo">
        <h1>HANGOUT</h1>
        <p>Resto Bar</p>
      </div>

      <div className="panels-container">
        {/* LEFT PANEL */}
        <div className="panel left-panel">
          <h3>Wing Flavors</h3>
          <div className="flavors-grid">
            {flavors.map((f) => (
              <div key={f} className="flavor-item-container">
                <div className={`flavor-square ${selectedFlavor === f ? 'active' : ''}`} onClick={() => setSelectedFlavor(f)}></div>
                <span className={selectedFlavor === f ? 'text-active' : ''}>{f}</span>
              </div>
            ))}
          </div>

          <div className="add-ons-section">
            {Object.keys(quantities).map((item) => (
              <div key={item} className="add-on-row">
                <span className="add-on-name">{item === 'wings' ? "Quantity Wing" : `Extra ${item.charAt(0).toUpperCase() + item.slice(1)}`}</span>
                <div className="qty-picker">
                  <button onClick={() => handleQty(item, 'sub')}>-</button>
                  <span>{quantities[item]}</span>
                  <button className="plus" onClick={() => handleQty(item, 'add')} disabled={item === 'wings' && (totalWingsInOrder + quantities.wings >= 24)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="panel-footer-btns">
            <button className="btn-outline-gold">Add a note</button>
            <button className="btn-filled-gold" onClick={handleAddToOrder}>Add to Order</button>
          </div>
        </div>

        {/* RIGHT PANEL (Receipt) */}
        <div className="panel right-panel">
          <div className="table-header">
            <span>Description</span>
            <span>Qty</span>
          </div>
          <div className="order-list">
            {orderItems.map((item) => (
              <div key={item.id} className="order-item">
                <span className="item-desc">{item.description}</span>
                
                {/* --- REFACTORED: Qty first, then Button --- */}
                <div className="receipt-qty-control">
                  <span className="qty-val">{item.qty}</span>
                  <button 
                    className="btn-minus-small" 
                    onClick={() => handleReduceItemQty(item.id)}
                  >
                    -
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="total-wings-container">
             <p>Total of Chicken wings: <span className={totalWingsInOrder >= 24 ? 'limit-reached' : ''}>{totalWingsInOrder} / 24</span></p>
          </div>

          <div className="item-actions">
            <button className="btn-remove" onClick={() => setOrderItems(orderItems.slice(0, -1))}>Remove Last</button>
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
          <button className="btn-assist">🔔 Assist Me</button>
          <button className="btn-make-another" onClick={() => navigate('/kiosk')}>Make another order</button>
        </div>
        <button className="btn-send-order" disabled={orderItems.length === 0} onClick={() => alert("Order Sent!")}>Send Order</button>
      </div>
    </div>
  );
};

export default KioskOrder;
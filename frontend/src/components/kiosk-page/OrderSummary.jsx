import React from 'react';
import { Trash2, ShoppingCart, ReceiptText } from 'lucide-react';
import '../../Style/OrderSummary.css';

const OrderSummary = ({ cart, onRemoveItem }) => {
  return (
    <aside className="order-summary-panel">
      <div className="summary-header">
        <ReceiptText size={20} color="#ffcc00" />
        <h3>ORDER SUMMARY</h3>
      </div>

      <div className="summary-content">
        {cart.length === 0 ? (
          <div className="empty-cart">
            <ShoppingCart size={48} color="#333" />
            <p>Your tray is empty</p>
            <span>Select items from the menu to start your order.</span>
          </div>
        ) : (
          <div className="cart-items-list">
            {cart.map((item, index) => (
              <div key={`${item.id}-${index}`} className="cart-item-card fade-in">
                <div className="item-details">
                  <span className="item-qty">{item.quantity}x</span>
                  <div className="item-name-group">
                    <span className="item-name">{item.name}</span>
                    <span className="item-category">{item.category || 'Main Course'}</span>
                  </div>
                </div>
                
                <button 
                  className="remove-item-btn" 
                  onClick={() => onRemoveItem(item.id)}
                  title="Remove Item"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="summary-footer">
            <div className="total-row">
                <span>Total Items</span>
                <span>{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
            </div>
            <p className="tap-hint">Tap "SEND REQUEST" below to Process your Order</p>
        </div>
      )}
    </aside>
  );
};

export default OrderSummary;
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Style/CashierDineIn.css';
import FoodItemModal from './FoodItemModal'; // Import the modal

const CashierDineIn = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  
  // --- STATES ---
  const [activeCategory, setActiveCategory] = useState('Wings & More');
  const [totalPrice, setTotalPrice] = useState(0.00);
  const [isModalOpen, setIsModalOpen] = useState(false); // Controls modal visibility
  const [selectedItem, setSelectedItem] = useState(null); // Tracks clicked item

  const categories = [
    "What's Popular", "Wings & More", "Budget Meals", "Pizzas", "Burgers", "Hangout Specials"
  ];

  const menuItems = [
    { id: 1, name: 'Classic Buffalo'},
    { id: 2, name: 'Honey Garlic'},
    { id: 3, name: 'Spicy BBQ'},
    { id: 4, name: 'Garlic Parmesan'},
    { id: 5, name: 'Teriyaki Wings'},
    { id: 6, name: 'Lemon Pepper'},
    { id: 7, name: 'Atomic Hot'},
    { id: 8, name: 'Soy Ginger'},
  ];

  // --- HANDLERS ---
  const handleItemClick = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      const scrollAmount = 200;
      scrollRef.current.scrollTo({
        top: direction === 'up' ? scrollTop - scrollAmount : scrollTop + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleCancel = () => {
    if(window.confirm("Are you sure you want to cancel?")) {
      navigate('/cashier/selection');
    }
  };

  return (
    <div className="kiosk-order-wrapper">
      {/* 1. TOP PROGRESS BAR */}
      <header className="kiosk-progress-bar">
        <div className="step completed"><span className="step-check">✔</span><p>Step 1 <br /><strong>Dine in</strong></p></div>
        <div className="step active"><span className="step-circle">2</span><p>Step 2 <br /><strong>Select Order</strong></p></div>
        <div className="step inactive"><span className="step-circle">3</span><p>Step 3 <br /><strong>Payment</strong></p></div>
        <div className="step inactive"><span className="step-circle">4</span><p>Step 4 <br /><strong>Checkout</strong></p></div>
      </header>

      <main className="order-main-layout">
        {/* 2. LEFT SIDEBAR */}
        <aside className="category-sidebar">
          <div className="brand-small">
            <h2>HANGOUT</h2>
            <p>Resto Bar</p>
          </div>
          
          <div className="scroll-arrow up" onClick={() => handleScroll('up')}>▲</div>
          
          <div className="categories-list" ref={scrollRef}>
            {categories.map(cat => (
              <div 
                key={cat} 
                className={`category-item ${activeCategory === cat ? 'selected' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <div className="cat-icon-placeholder"></div>
                <span>{cat}</span>
              </div>
            ))}
          </div>

          <div className="scroll-arrow down" onClick={() => handleScroll('down')}>▼</div>
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <section className="menu-grid-container">
          <div className="menu-grid">
            {menuItems.map(item => (
              <div 
                key={item.id} 
                className="menu-card" 
                onClick={() => handleItemClick(item)} // Now opens the modal
              >
                <div className="item-image-placeholder">
                   <img src="/wings.png" alt="food" className="watermark" style={{width: '50px', opacity: 0.1}} />
                </div>
                <div className="item-info">
                  <h4>{item.name}</h4>
                  {/*<p>₱{item.price.toFixed(2)}</p>*/}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 4. BOTTOM SECTION */}
      <footer className="order-footer">
        <div className="total-display">
          <span className="total-label">Total Price</span>
          <span className="total-amount">{totalPrice.toFixed(2)}</span>
        </div>
        <div className="footer-actions">
          <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
          <button className="btn-view-order" onClick={() => navigate('/kiosk/summary')}>View Order</button>
        </div>
      </footer>

      {/* 5. FOOD ITEM MODAL (Bottom Sheet) */}
      <FoodItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        item={selectedItem}
        activeCategory={activeCategory} // Pass the category name for the "Back to..." link
      />
    </div>
  );
};

export default CashierDineIn;
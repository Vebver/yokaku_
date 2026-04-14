import React, { useEffect } from 'react';
import { X, Utensils } from 'lucide-react';
import '../Style/MenuModal.css';

const MenuModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const foodItems = [
    { id: 1, name: "Buffalo Wings", price: "₱299", desc: "Crispy wings tossed in spicy buffalo sauce.", img: "https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?q=80&w=400" },
    { id: 2, name: "Classic Cheeseburger", price: "₱180", desc: "Juicy beef patty with melted cheddar and fresh veggies, served with our signature house sauce.", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400" },
    { id: 3, name: "Loaded Nachos", price: "₱250", desc: "Tortilla chips topped with cheese, beef, and jalapeños.", img: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?q=80&w=400" },
    { id: 4, name: "Carbonara Pasta", price: "₱220", desc: "Creamy white sauce with bacon and parmesan.", img: "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=400" },
    { id: 5, name: "T-Bone Steak", price: "₱450", desc: "Premium steak served with gravy and mashed potatoes.", img: "https://images.unsplash.com/photo-1546241072-48010ad28c2c?q=80&w=400" },
    { id: 6, name: "Mojito Lemonade", price: "₱120", desc: "Refreshing lemon drink with mint leaves.", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=400" },
  ];

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div className="menu-modal-content fade-in" onClick={(e) => e.stopPropagation()}>
        
        <header className="menu-modal-header">
          <div className="menu-header-left">
            <div className="menu-logo-box">
                <Utensils size={20} color="white" />
            </div>
            <h2>Our Featured Menu</h2>
          </div>
          <button className="menu-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        <div className="menu-grid">
          {foodItems.map((item) => (
            <div key={item.id} className="food-card">
              <div className="food-image-wrapper">
                <img src={item.img} alt={item.name} className="food-img" />
                <span className="food-price-tag">{item.price}</span>
              </div>
              
              <div className="food-info">
                <div className="food-text-details">
                    <h3>{item.name}</h3>
                    <p>{item.desc}</p>
                </div>
                <button className="add-to-tray-btn">
                    Add to Tray
                </button>
              </div>
            </div>
          ))}
        </div>

        <footer className="menu-modal-footer">
          <p>Prices are subject to change without prior notice.</p>
        </footer>
      </div>
    </div>
  );
};

export default MenuModal;
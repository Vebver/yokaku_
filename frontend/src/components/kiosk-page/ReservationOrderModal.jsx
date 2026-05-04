import React, { useState, useEffect } from "react";
import { Plus, Minus, Check } from "lucide-react";
import "../../Style/ReservationOrderModal.css";

const ReservationOrderModal = ({ isOpen, onClose, item, onAdd, allProducts }) => {
  const [quantity, setQuantity] = useState(1);
  const [customizations, setCustomizations] = useState({ flavor: "", drink: "" });

  const categoryName = item?.category?.toLowerCase() || "";
  const isBundle = categoryName.includes("bundle") || categoryName.includes("unli");

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setCustomizations({ flavor: "", drink: "" });
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const getItemsByKeywords = (keywords) => {
    const foundKey = Object.keys(allProducts).find(key => 
      keywords.some(word => key.toLowerCase().includes(word.toLowerCase()))
    );
    return allProducts[foundKey] || [];
  };

  const chickenOptions = getItemsByKeywords(["Chicken", "Wings"]);
  const drinkOptions = getItemsByKeywords(["Drink", "Beverage", "Soda"]);

  const handleAdd = () => {
    if (isBundle && (!customizations.flavor || !customizations.drink)) return;
    onAdd({ ...item, quantity, customizations: isBundle ? customizations : null });
    onClose();
  };

  return (
    <div className={`res-modal-overlay ${isOpen ? "active" : ""}`} onClick={onClose}>
      <div className={`res-bottom-sheet ${isOpen ? "slide-up" : ""} ${isBundle ? 'is-bundle' : 'is-single'}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" onClick={onClose}></div>
        <div className="flex-container">
          <div className="scrollable-content">
            <div className="item-main-info">
              <div className="item-preview-card">
                <img src={item?.image} alt={item?.name} className="item-image" />
              </div>
              <div className="item-text-details">
                <h2 className="item-name">{item?.name}</h2>
                <div className="item-price-tag">₱{parseFloat(item?.price).toFixed(2)}</div>
                <p className="item-description">{item?.description || "Signature item prepared with fresh ingredients."}</p>
              </div>
            </div>

            {isBundle && (
              <div className="bundle-options">
                <h3 className="section-title">1. CHOOSE CHICKEN FLAVOR</h3>
                <div className="chip-grid">
                  {chickenOptions.map((f) => (
                    <button key={f.id} className={`selection-chip ${customizations.flavor === f.name ? 'active' : ''}`}
                      onClick={() => setCustomizations({...customizations, flavor: f.name})}>
                      {customizations.flavor === f.name && <Check size={14} className="chip-icon" />}
                      {f.name}
                    </button>
                  ))}
                </div>
                <h3 className="section-title" style={{ marginTop: '25px' }}>2. SELECT DRINK</h3>
                <div className="chip-grid">
                  {drinkOptions.map((d) => (
                    <button key={d.id} className={`selection-chip ${customizations.drink === d.name ? 'active' : ''}`}
                      onClick={() => setCustomizations({...customizations, drink: d.name})}>
                      {customizations.drink === d.name && <Check size={14} className="chip-icon" />}
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="qty-section">
              <span className="qty-label">QUANTITY</span>
              <div className="qty-picker">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus size={20}/></button>
                <span className="qty-val">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}><Plus size={20}/></button>
              </div>
            </div>
          </div>
          <div className="fixed-footer">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className={`btn-submit ${isBundle && (!customizations.flavor || !customizations.drink) ? 'disabled' : ''}`} onClick={handleAdd}>
               Add to Tray - ₱{(item?.price * quantity).toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .res-bottom-sheet { background: #fff; border-radius: 30px 30px 0 0; display: flex; flex-direction: column; transition: height 0.3s ease; }
        .res-bottom-sheet.is-bundle { height: 85vh; }
        .res-bottom-sheet.is-single { height: auto; max-height: 85vh; }
        .flex-container { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .scrollable-content { flex: 1; overflow-y: auto; padding: 20px 30px; scrollbar-width: none; }
        .item-main-info { display: flex; gap: 25px; margin-bottom: 25px; }
        .item-preview-card { width: 140px; height: 140px; border-radius: 24px; overflow: hidden; background: #f9f9f9; flex-shrink: 0; }
        .item-image { width: 100%; height: 100%; object-fit: cover; }
        .item-name { font-size: 1.8rem; font-weight: 900; color: #222; margin: 0; text-transform: uppercase; }
        .item-price-tag { color: #ffcc00; font-size: 1.5rem; font-weight: 800; }
        .section-title { font-size: 0.8rem; font-weight: 800; color: #aaa; margin-bottom: 12px; letter-spacing: 1px; }
        .chip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .selection-chip { background: #f4f4f4; border: 2px solid transparent; padding: 14px; border-radius: 15px; font-weight: 700; color: #444; display: flex; align-items: center; gap: 8px; }
        .selection-chip.active { background: #000; color: #ffcc00; border-color: #ffcc00; }
        .qty-section { margin-top: 10px; display: flex; flex-direction: column; align-items: center; gap: 10px; padding-bottom: 30px; }
        .qty-picker { display: flex; align-items: center; gap: 40px; background: #f8f8f8; padding: 10px 15px; border-radius: 50px; border: 1px solid #eee; }
        .qty-picker button { background: #fff; border: 1px solid #eee; width: 44px; height: 44px; border-radius: 50%; }
        .qty-val { font-size: 1.6rem; font-weight: 900; min-width: 30px; text-align: center; }
        .fixed-footer { padding: 20px 30px 30px; background: #fff; border-top: 1px solid #f5f5f5; display: flex; gap: 15px; }
        .btn-cancel { background: #fff; border: 2px solid #eee; padding: 16px 25px; border-radius: 20px; font-weight: 800; color: #aaa; }
        .btn-submit { flex: 1; background: #ffcc00; color: #000; border: none; padding: 18px; border-radius: 20px; font-weight: 800; font-size: 1.1rem; }
        .btn-submit.disabled { background: #f0f0f0; color: #ccc; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default ReservationOrderModal;
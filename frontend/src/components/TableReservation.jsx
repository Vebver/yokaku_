import React, { useState, useMemo } from 'react';
import { UtensilsCrossed, Users, ArrowRight, X } from 'lucide-react'; // Added X for closing
import '../Style/TableReservation.css';

const TABLES_DATA = [
  { id: 1, seats: 2, status: 'available' },
  { id: 2, seats: 4, status: 'reserved' },
  { id: 3, seats: 2, status: 'available' },
  { id: 4, seats: 6, status: 'available' },
  { id: 5, seats: 4, status: 'reserved' },
  { id: 6, seats: 2, status: 'available' },
  { id: 7, seats: 8, status: 'available' },
  { id: 8, seats: 4, status: 'available' },
];

const TableCard = ({ table, isSelected, onToggle }) => {
  const isReserved = table.status === 'reserved';
  
  const cardClasses = [
    'card',
    isReserved ? 'reserved' : 'available',
    isSelected ? 'selected' : ''
  ].join(' ');

  return (
    <div className={cardClasses} onClick={() => !isReserved && onToggle(table.id)}>
      <div className={`status-dot ${isReserved ? 'dot-reserved' : 'dot-available'}`} />
      
      <div className="icon-box">
        <UtensilsCrossed size={24} />
      </div>

      <h3 className="table-name">Table {table.id}</h3>
      
      <div className="seat-info">
        <Users size={14} />
        <span>{table.seats} seats</span>
      </div>

      <span className="status-badge">
        {isSelected ? 'SELECTED' : table.status}
      </span>
    </div>
  );
};

// Added onClose and onSuccess props passed from App.jsx
export default function TableReservation({ onClose, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleTable = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const summary = useMemo(() => {
    const selected = TABLES_DATA.filter(t => selectedIds.includes(t.id));
    if (selected.length === 0) return null;

    const names = selected.map(t => `Table ${t.id}`).join(', ');
    const totalSeats = selected.reduce((sum, t) => sum + t.seats, 0);
    return `${names} • ${totalSeats} seats total`;
  }, [selectedIds]);

  const handleContinue = () => {
    // Logic can be added here to save selection to DB/State
    if (onSuccess) onSuccess();
  };

  return (
    <div className="reservation-container">
      {/* Added Close/Back Button */}
      <button className="table-res-close" onClick={onClose}>
        Back
      </button>

      <header>
        <div className="header-icon">
          <UtensilsCrossed size={24} />
        </div>
        <h1 className="title">Reserve Your Table</h1>
        <p className="subtitle">Select an available table below to begin your reservation</p>
      </header>

      <main className="table-grid">
        {TABLES_DATA.map(table => (
          <TableCard 
            key={table.id}
            table={table}
            isSelected={selectedIds.includes(table.id)}
            onToggle={toggleTable}
          />
        ))}
      </main>

      <footer className="footer">
        <button 
          className={`btn-continue ${selectedIds.length > 0 ? 'active' : 'disabled'}`}
          disabled={selectedIds.length === 0}
          onClick={handleContinue}
        >
          Continue Reservation <ArrowRight size={18} />
        </button>
        {summary && <p className="summary-text">{summary}</p>}
      </footer>
    </div>
  );
}
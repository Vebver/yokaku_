import React, { useState, useMemo, useEffect } from "react";
import {
  UtensilsCrossed,
  ArrowRight,
  X,
  Link as LinkIcon,
  Calendar,
  Clock,
  Users,
  Info,
  MapPin,
  Pencil,
} from "lucide-react";
import "../Style/TableReservation.css";

const TABLES_DATA = [
  { id: "T1", seats: 5, status: "available", top: "23%", left: "15%", type: "rect-v", layout: "right-side" },
  { id: "T2", seats: 2, status: "available", top: "50%", left: "25%", type: "square-sm", layout: "sides" },
  { id: "T3", seats: 4, status: "occupied", top: "65%", left: "25%", type: "square", layout: "sides" },
  { id: "T4", seats: 4, status: "available", top: "82%", left: "25%", type: "square", layout: "sides" },
  { id: "T5", seats: 4, status: "available", top: "38%", left: "50%", type: "square", layout: "sides" },
  { id: "T6", seats: 4, status: "available", top: "58%", left: "50%", type: "square", layout: "sides" },
  { id: "T7", seats: 4, status: "available", top: "17%", left: "77%", type: "square", layout: "top-bottom" },
  { id: "T8", seats: 4, status: "reserved", top: "45%", left: "77%", type: "square", layout: "top-bottom" },
  { id: "T9", seats: 4, status: "available", top: "72%", left: "77%", type: "square", layout: "top-bottom" },
  { id: "T10", seats: 3, status: "available", top: "92%", left: "65%", type: "rect-h", layout: "top-side" },
];

export default function TableReservation({ onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(null);
  const [linkedIds, setLinkedIds] = useState([]);
  const [isLinkMode, setIsLinkMode] = useState(false);

  // Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isEditing, setIsEditing] = useState(false); 
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("");
  const [guestCount, setGuestCount] = useState(1);

  // Address States
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  // --- AUTO-FILL USER LOGIC (FIXED) ---
  useEffect(() => {
    // Look for the specific keys we just saved in LoginSection
    const savedFirstName = localStorage.getItem("firstName");
    const savedLastName = localStorage.getItem("lastName");
    
    if (savedFirstName || savedLastName) {
      console.log("Logged in user found:", savedFirstName, savedLastName);
      setFirstName(savedFirstName || "");
      setLastName(savedLastName || "");
    } else {
      console.log("No name data found in storage. Ensure you log out and log back in once.");
    }
  }, []);

  // Fetch Municipalities
  useEffect(() => {
    fetch("http://localhost:5000/api/address/municipalities")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setMunicipalities(list.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((err) => console.error("Error fetching municipalities:", err));
  }, []);

  // Fetch Barangays
  useEffect(() => {
    if (selectedMunicipality) {
      fetch(`http://localhost:5000/api/address/barangays/${selectedMunicipality}`)
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data.data || [];
          setBarangays(list.sort((a, b) => a.name.localeCompare(b.name)));
        })
        .catch((err) => console.error("Error fetching barangays:", err));
    } else {
      setBarangays([]);
      setSelectedBarangay("");
    }
  }, [selectedMunicipality]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().split("T")[0];
  }, []);

  const primaryTable = useMemo(() => TABLES_DATA.find((t) => t.id === selectedId), [selectedId]);
  
  const totalSeats = useMemo(() => {
    if (!primaryTable) return 0;
    const linkedSeats = TABLES_DATA.filter((t) => linkedIds.includes(t.id)).reduce((sum, t) => sum + t.seats, 0);
    return primaryTable.seats + linkedSeats;
  }, [primaryTable, linkedIds]);

  const isFormInvalid = useMemo(() => {
    return (
      !firstName.trim() || !lastName.trim() || !resDate || !resTime || 
      !guestCount || guestCount <= 0 || !selectedMunicipality || !selectedBarangay
    );
  }, [firstName, lastName, resDate, resTime, guestCount, selectedMunicipality, selectedBarangay]);

  const handleTableClick = (table) => {
    if (isLinkMode) {
      if (table.id === selectedId) { setSelectedId(null); setLinkedIds([]); setIsLinkMode(false); return; }
      if (table.status !== "available") return;
      setLinkedIds((prev) => prev.includes(table.id) ? prev.filter((id) => id !== table.id) : [...prev, table.id]);
    } else {
      if (selectedId === table.id) setSelectedId(null);
      else setSelectedId(table.id);
      setLinkedIds([]);
    }
  };

  const renderChairs = (table) => {
    const chairs = [];
    for (let i = 0; i < table.seats; i++) {
      chairs.push(<div key={i} className={`chair chair-${table.layout}-${i + 1}`} />);
    }
    return chairs;
  };

  return (
    <div className="floor-plan-wrapper">
      <div className="floor-plan-main">
        <header className="floor-header">
          <div className="floor-logo-bar">
            <div className="floor-icon-circle"><UtensilsCrossed size={20} color="white" /></div>
            <div className="floor-header-text">
              <h1 className="floor-title">Floor Plan</h1>
              <p className="floor-subtitle">Select a table to reserve your spot</p>
            </div>
          </div>
          <button className="floor-back-btn" onClick={onClose}>Back</button>
        </header>

        <div className="map-scroll-area">
          <div className="map-container">
            {isLinkMode && <div className="link-tooltip fade-in">Click available tables to link them</div>}
            <div className="tables-area">
              {TABLES_DATA.map((table) => {
                const isSelected = selectedId === table.id;
                const isLinked = linkedIds.includes(table.id);
                return (
                  <div key={table.id} className={`floor-table ${table.type} ${isSelected ? 'selected' : (isLinked ? 'linked' : table.status)}`} style={{ top: table.top, left: table.left }} onClick={() => handleTableClick(table)}>
                    {renderChairs(table)}
                    <div className="table-inner">
                      <span className="table-id-label">{table.id}</span>
                      <span className="table-p-label">{table.seats}p</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="floor-legend">
          <div className="legend-item"><span className="dot available"></span> Available</div>
          <div className="legend-item"><span className="dot selected"></span> Selected</div>
          <div className="legend-item"><span className="dot linked"></span> Linked</div>
          <div className="legend-item"><span className="dot reserved"></span> Reserved</div>
          <div className="legend-item"><span className="dot occupied"></span> Occupied</div>
        </div>
      </div>

      <aside className="floor-sidebar">
        {!primaryTable ? (
          <div className="empty-sidebar"><p>Select an available table to make a reservation</p></div>
        ) : (
          <div className="res-panel fade-in">
            <button className="panel-close" onClick={() => { setSelectedId(null); setIsLinkMode(false); }}><X size={18} /></button>
            <h2 className="panel-title">Reserve {primaryTable.id} {linkedIds.length > 0 && `+ ${linkedIds.join(" + ")}`}</h2>
            <div className="panel-meta">
              <span><Users size={14} /> {totalSeats} seats</span>
              <span>{primaryTable.type.includes("rect") ? "Rect Table" : "Square Table"}</span>
              {primaryTable.status !== "available" && <span className="status-warning">Already {primaryTable.status}</span>}
            </div>

            {primaryTable.status === "available" ? (
              <div className="res-form">
                <button className={`btn-link-mode ${isLinkMode ? "active" : ""}`} onClick={() => setIsLinkMode(!isLinkMode)}>
                  {isLinkMode ? <><X size={16} /> Done linking</> : <><LinkIcon size={16} /> Link tables</>}
                </button>

                {/* FIRST NAME with PENCIL ICON */}
                <div className="input-group">
                    <div className="label-with-icon">
                        <label>FIRST NAME</label>
                        <Pencil 
                            size={16} 
                            className={`edit-toggle-icon ${isEditing ? 'active' : ''}`} 
                            onClick={() => setIsEditing(!isEditing)} 
                        />
                    </div>
                    <input 
                        type="text" 
                        placeholder="First Name" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        disabled={!isEditing} 
                    />
                </div>

                {/* LAST NAME */}
                <div className="input-group">
                    <label>LAST NAME</label>
                    <input 
                        type="text" 
                        placeholder="Last Name" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        disabled={!isEditing} 
                    />
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label><MapPin size={12} /> MUNICIPALITY</label>
                    <select className="res-input-dropdown" value={selectedMunicipality} onChange={(e) => setSelectedMunicipality(e.target.value)}>
                      <option value="">Select City</option>
                      {municipalities.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label><MapPin size={12} /> BARANGAY</label>
                    <select className="res-input-dropdown" value={selectedBarangay} onChange={(e) => setSelectedBarangay(e.target.value)} disabled={!selectedMunicipality}>
                      <option value="">Select Brgy</option>
                      {barangays.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label><Calendar size={12} /> DATE</label>
                    <input type="date" value={resDate} min={todayStr} onChange={(e) => setResDate(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label><Clock size={12} /> TIME</label>
                    <input type="time" value={resTime} onChange={(e) => setResTime(e.target.value)} />
                  </div>
                </div>

                <div className="input-group">
                  <label>GUESTS (MAX {totalSeats})</label>
                  <input type="number" min="1" max={totalSeats} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} />
                </div>

                <button className={`btn-confirm ${isFormInvalid ? "btn-disabled" : ""}`} onClick={onSuccess} disabled={isFormInvalid}>
                  Confirm Reservation
                </button>
              </div>
            ) : (
              <div className="reserved-notice fade-in">
                <Info size={32} color="#f4a261" />
                <p>
                  {primaryTable.status === 'occupied' 
                    ? "This table is already occupied. Please select another table." 
                    : "This table is already reserved. Please select another table."}
                </p>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
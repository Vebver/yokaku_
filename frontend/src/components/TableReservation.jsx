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
  // COLUMN 1 (LEFT)
  { id: "T1", seats: 5, status: "available", top: "23%", left: "15%", type: "rect-v", layout: "right-side" },
  { id: "T2", seats: 2, status: "available", top: "50%", left: "25%", type: "square-sm", layout: "sides" },
  { id: "T3", seats: 4, status: "occupied", top: "65%", left: "25%", type: "square", layout: "sides" },
  { id: "T4", seats: 4, status: "available", top: "82%", left: "25%", type: "square", layout: "sides" },

  // COLUMN 2 (CENTER)
  { id: "T5", seats: 4, status: "available", top: "38%", left: "50%", type: "square", layout: "sides" },
  { id: "T6", seats: 4, status: "available", top: "58%", left: "50%", type: "square", layout: "sides" },

  // COLUMN 3 (RIGHT)
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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  
  // Allergy States
  const [allergy, setAllergy] = useState("No Allergy");
  const [otherAllergy, setOtherAllergy] = useState("");

  // Address States
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, period] = timeStr.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const timeOptions = useMemo(() => {
    const options = [];
    const periods = ["AM", "PM"];
    const intervals = ["00", "15", "30", "45"];
    periods.forEach((period) => {
      const startHour = period === "AM" ? 10 : 1;
      const endHour = period === "AM" ? 11 : 10;
      if (period === "PM") intervals.forEach(m => options.push(`12:${m} PM`));
      for (let h = startHour; h <= endHour; h++) {
        intervals.forEach((m) => {
          if (period === "PM" && h === 10 && m !== "00") return; 
          if (period === "AM" && h === 12) return; 
          options.push(`${h.toString().padStart(2, '0')}:${m} ${period}`);
        });
      }
    });
    return options;
  }, []);

  const filteredEndTimeOptions = useMemo(() => {
    if (!startTime) return timeOptions;
    const startMins = timeToMinutes(startTime);
    return timeOptions.filter(t => timeToMinutes(t) >= startMins + 60);
  }, [startTime, timeOptions]);

  useEffect(() => {
    const savedFirstName = localStorage.getItem("firstName");
    const savedLastName = localStorage.getItem("lastName");
    if (savedFirstName || savedLastName) {
      setFirstName(savedFirstName || "");
      setLastName(savedLastName || "");
    }
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/address/municipalities")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setMunicipalities(list.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((err) => console.error("Error fetching municipalities:", err));
  }, []);

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
    return (new Date(now - offset)).toISOString().split("T")[0];
  }, []);

  const primaryTable = useMemo(() => TABLES_DATA.find((t) => t.id === selectedId), [selectedId]);
  
  const totalSeats = useMemo(() => {
    if (!primaryTable) return 0;
    const linkedSeats = TABLES_DATA.filter((t) => linkedIds.includes(t.id)).reduce((sum, t) => sum + t.seats, 0);
    return primaryTable.seats + linkedSeats;
  }, [primaryTable, linkedIds]);

  const isFormInvalid = useMemo(() => {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const hasOneHourDiff = (endMin - startMin) >= 60;
    
    // Check if 'Other' is selected but text field is empty
    const isOtherAllergyEmpty = allergy === "Other" && !otherAllergy.trim();

    return (
      !firstName.trim() || !lastName.trim() || !resDate || 
      !startTime || !endTime || !hasOneHourDiff ||
      !guestCount || guestCount <= 0 || !selectedMunicipality || !selectedBarangay ||
      isOtherAllergyEmpty
    );
  }, [firstName, lastName, resDate, startTime, endTime, guestCount, selectedMunicipality, selectedBarangay, allergy, otherAllergy]);

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
            
            <h2 className="panel-title" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
              Reserve {primaryTable.id} 
              {linkedIds.length > 0 && linkedIds.map(id => {
                 const uncombinables = ['T1', 'T10'];
                 const isPrimaryRestricted = uncombinables.includes(primaryTable.id);
                 const isLinkedRestricted = uncombinables.includes(id);
                 
                 return (
                   <React.Fragment key={id}>
                     <span> + {id}</span>
                     {(isPrimaryRestricted || isLinkedRestricted) && (
                       <span style={{ fontSize: '10px', color: '#e63946', marginLeft: '4px', fontWeight: '600' }}>
                         ({isPrimaryRestricted ? primaryTable.id : id} cannot be combined to {isPrimaryRestricted ? id : primaryTable.id})
                       </span>
                     )}
                   </React.Fragment>
                 );
              })}
              {(primaryTable.id === 'T1' || primaryTable.id === 'T10') && linkedIds.length === 0 && (
                <span style={{ fontSize: '13px', color: 'red', fontWeight: '500', marginLeft: '5px', fontStyle: 'italic' }}>
                  (This table cannot be combined)
                </span>
              )}
            </h2>

            <div className="panel-meta">
              <span><Users size={14} /> {totalSeats} seats</span>
              <span>{primaryTable.type.includes("rect") ? "Rect Table" : "Square Table"}</span>
              {primaryTable.status !== 'available' && (
                  <span className="status-warning">Already {primaryTable.status}</span>
               )}
            </div>

            {primaryTable.status === "available" ? (
              <div className="res-form">
                <button className={`btn-link-mode ${isLinkMode ? "active" : ""}`} onClick={() => setIsLinkMode(!isLinkMode)}>
                  {isLinkMode ? <><X size={16} /> Done linking</> : <><LinkIcon size={16} /> Link tables</>}
                </button>

                <div className="input-group">
                    <div className="label-with-icon">
                        <label>FIRST NAME</label>
                        <Pencil size={16} className={`edit-toggle-icon ${isEditing ? 'active' : ''}`} onClick={() => setIsEditing(!isEditing)} />
                    </div>
                    <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!isEditing} />
                </div>
                <div className="input-group">
                    <label>LAST NAME</label>
                    <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!isEditing} />
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

                <div className="input-group">
                    <label><Calendar size={12} /> DATE</label>
                    <input type="date" value={resDate} min={todayStr} onChange={(e) => setResDate(e.target.value)} />
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label><Clock size={12} /> TIME START</label>
                    <select className="res-input-dropdown" value={startTime} onChange={(e) => { setStartTime(e.target.value); setEndTime(""); }}>
                      <option value="">--:-- --</option>
                      {timeOptions.map((t) => <option key={`start-${t}`} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label><Clock size={12} /> TIME END</label>
                    <select className="res-input-dropdown" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!startTime}>
                      <option value="">--:-- --</option>
                      {filteredEndTimeOptions.map((t) => <option key={`end-${t}`} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                
                {/* UPDATED ALLERGY SECTION WITH "OTHER" INPUT */}
                <div className="input-group">
                  <label>ALLERGY</label>
                  <select 
                    className="res-input-dropdown" 
                    value={allergy} 
                    onChange={(e) => {
                        setAllergy(e.target.value);
                        if(e.target.value !== "Other") setOtherAllergy(""); // Clear text if not 'Other'
                    }}
                  >
                    <option value="No Allergy">No Allergy</option>
                    <option value="Peanuts">Peanuts</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Eggs">Eggs</option>
                    <option value="Wheat/Gluten">Wheat/Gluten</option>
                    <option value="Soy">Soy</option>
                    <option value="Tree Nuts">Tree Nuts</option>
                    <option value="Other">Other</option>
                  </select>

                  {/* CONDITIONAL TEXT INPUT FOR OTHER ALLERGY */}
                  {allergy === "Other" && (
                    <input 
                      type="text" 
                      className="res-input fade-in" 
                      style={{ marginTop: '10px' }}
                      placeholder="Please specify your allergy" 
                      value={otherAllergy} 
                      onChange={(e) => setOtherAllergy(e.target.value)} 
                    />
                  )}
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
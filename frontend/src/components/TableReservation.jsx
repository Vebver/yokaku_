import React, { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
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
  Upload, // Added for the upload button
} from "lucide-react";
import "../Style/TableReservation.css";

const TABLES_DATA = [
  {
    id: 1,
    label: "T1",
    seats: 5,
    status: "available",
    top: "23%",
    left: "15%",
    type: "rect-v",
    layout: "right-side",
  },
  {
    id: 2,
    label: "T2",
    seats: 2,
    status: "available",
    top: "50%",
    left: "25%",
    type: "square-sm",
    layout: "sides",
  },
  {
    id: 3,
    label: "T3",
    seats: 4,
    status: "occupied",
    top: "65%",
    left: "25%",
    type: "square",
    layout: "sides",
  },
  {
    id: 4,
    label: "T4",
    seats: 4,
    status: "available",
    top: "82%",
    left: "25%",
    type: "square",
    layout: "sides",
  },
  {
    id: 5,
    label: "T5",
    seats: 4,
    status: "available",
    top: "38%",
    left: "50%",
    type: "square",
    layout: "sides",
  },
  {
    id: 6,
    label: "T6",
    seats: 4,
    status: "available",
    top: "58%",
    left: "50%",
    type: "square",
    layout: "sides",
  },
  {
    id: 7,
    label: "T7",
    seats: 4,
    status: "available",
    top: "17%",
    left: "77%",
    type: "square",
    layout: "top-bottom",
  },
  {
    id: 8,
    label: "T8",
    seats: 4,
    status: "reserved",
    top: "45%",
    left: "77%",
    type: "square",
    layout: "top-bottom",
  },
  {
    id: 9,
    label: "T9",
    seats: 4,
    status: "available",
    top: "72%",
    left: "77%",
    type: "square",
    layout: "top-bottom",
  },
  {
    id: 10,
    label: "T10",
    seats: 3,
    status: "available",
    top: "92%",
    left: "65%",
    type: "rect-h",
    layout: "top-side",
  },
];

export default function TableReservation({ onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(null);
  const [linkedIds, setLinkedIds] = useState([]);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- FORM STATES ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false); 
  const [resDate, setResDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  
  // Allergy States
  const [allergy, setAllergy] = useState("No Allergy");
  const [otherAllergy, setOtherAllergy] = useState("");

  // Receipt States
  const [receipt, setReceipt] = useState(null);
  const fileInputRef = useRef(null);

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
      fetch(
        `http://localhost:5000/api/address/barangays/${selectedMunicipality}`,
      )
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

  // --- BACKEND SUBMISSION LOGIC ---
  const handleConfirmReservation = async () => {
    setLoading(true);
    setError("");

    try {
      const reservationData = {
        userId: localStorage.getItem("userId") || null,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        date: resDate,
        time: resTime,
        guests: guestCount,
        packageName: "Table Reservation",
        brgyCode: selectedBarangay, // Composite link
        tableIds: [selectedId, ...linkedIds], // Composite link
        status: "Pending",
      };

      const response = await axios.post(
        "http://localhost:5000/api/reservations/table",
        reservationData,
      );

      if (response.status === 200 || response.status === 201) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save reservation.");
    } finally {
      setLoading(false);
    }
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return (new Date(now - offset)).toISOString().split("T")[0];
  }, []);

  /// --- TABLE SEATS CALCULATION WITH LINKING ---
  const primaryTable = useMemo(
    () => TABLES_DATA.find((t) => t.id === selectedId),
    [selectedId],
  );

  const totalSeats = useMemo(() => {
    if (!primaryTable) return 0;
    const linkedSeats = TABLES_DATA.filter((t) =>
      linkedIds.includes(t.id),
    ).reduce((sum, t) => sum + t.seats, 0);
    return primaryTable.seats + linkedSeats;
  }, [primaryTable, linkedIds]);

  // --- UPDATED VALIDATION ---
  const isFormInvalid = useMemo(() => {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const hasOneHourDiff = (endMin - startMin) >= 60;
    const isOtherAllergyEmpty = allergy === "Other" && !otherAllergy.trim();

    return (
      !firstName.trim() || !lastName.trim() || !resDate || 
      !startTime || !endTime || !hasOneHourDiff ||
      !guestCount || guestCount <= 0 || !selectedMunicipality || !selectedBarangay ||
      isOtherAllergyEmpty || !receipt   || !email || !phone // Added receipt check
    );
  }, [firstName, lastName, resDate, startTime, endTime, guestCount, selectedMunicipality, selectedBarangay, allergy, otherAllergy, receipt, email, phone]);

  const handleTableClick = (table) => {
    if (isLinkMode) {
      if (table.id === selectedId) { setSelectedId(null); setLinkedIds([]); setIsLinkMode(false); return; }
      if (table.status !== "available") return;
      setLinkedIds((prev) =>
        prev.includes(table.id)
          ? prev.filter((id) => id !== table.id)
          : [...prev, table.id],
      );
    } else {
      if (selectedId === table.id) setSelectedId(null);
      else setSelectedId(table.id);
      setLinkedIds([]);
    }
  };

  const renderChairs = (table) => {
    const chairs = [];
    for (let i = 0; i < table.seats; i++) {
      chairs.push(
        <div key={i} className={`chair chair-${table.layout}-${i + 1}`} />,
      );
    }
    return chairs;
  };

  return (
    <div className="floor-plan-wrapper" onClick={onClose}>
      <div className="floor-plan-main" onClick={(e) => e.stopPropagation()}>
        <header className="floor-header">
          <div className="floor-logo-bar">
            <div className="floor-icon-circle">
              <UtensilsCrossed size={20} color="white" />
            </div>
            <div className="floor-header-text">
              <h1 className="floor-title">Floor Plan</h1>
              <p className="floor-subtitle">Select a table to reserve</p>
            </div>
          </div>
          <button className="floor-back-btn" onClick={onClose}>
            Back
          </button>
        </header>

        <div className="map-scroll-area">
          <div className="map-container">
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
          <div className="legend-item">
            <span className="dot available"></span> Available
          </div>
          <div className="legend-item">
            <span className="dot selected"></span> Selected
          </div>
          <div className="legend-item">
            <span className="dot linked"></span> Linked
          </div>
        </div>
      </div>

      <aside className="floor-sidebar" onClick={(e) => e.stopPropagation()}>
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
                <span style={{ fontSize: '11px', color: '#999', fontWeight: '500', marginLeft: '5px', fontStyle: 'italic' }}>
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

                <div className="input-group">
                    <label>ALLERGY</label>
                    <select className="res-input-dropdown" value={allergy} onChange={(e) => { setAllergy(e.target.value); if(e.target.value !== "Other") setOtherAllergy(""); }}>
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
                    {allergy === "Other" && (
                        <input type="text" className="res-input fade-in" style={{ marginTop: '10px' }} placeholder="Please specify your allergy" value={otherAllergy} onChange={(e) => setOtherAllergy(e.target.value)} />
                    )}
                </div>

                <div className="input-group">
                  <label>GUESTS (MAX {totalSeats})</label>
                  <input type="number" min="1" max={totalSeats} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} />
                </div>

                {/* NEW RECEIPT UPLOAD SECTION */}
                <div className="input-group">
                  <label>Upload your Receipt we're accepting (Gcash/Maya)</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    accept="image/*,.pdf"
                    onChange={(e) => setReceipt(e.target.files[0])}
                  />
                  <button 
                    type="button"
                    className="btn-link-mode" 
                    style={{ width: "100%", marginTop: "5px" }}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Upload size={16} /> {receipt ? receipt.name : "Upload"}
                  </button>
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

            <div className="res-form">
              <button
                className={`btn-link-mode ${isLinkMode ? "active" : ""}`}
                onClick={() => setIsLinkMode(!isLinkMode)}
              >
                {isLinkMode ? (
                  <>
                    <X size={16} /> Done linking
                  </>
                ) : (
                  <>
                    <LinkIcon size={16} /> Link tables
                  </>
                )}
              </button>

              {/* --- NEW NAME INPUTS --- */}
              <div className="input-row">
                <div className="input-group">
                  <label>FIRST NAME</label>
                  <input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>LAST NAME</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>CONTACT NUMBER</label>
                <input
                  type="text"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => {
                    // Only allow numbers and limit to 11 digits
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 11) setPhone(val);
                  }}
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>
                    <MapPin size={12} /> MUNICIPALITY
                  </label>
                  <select
                    className="res-input"
                    value={selectedMunicipality}
                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                  >
                    <option value="">Select City</option>
                    {municipalities.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>
                    <MapPin size={12} /> BARANGAY
                  </label>
                  <select
                    className="res-input"
                    value={selectedBarangay}
                    onChange={(e) => setSelectedBarangay(e.target.value)}
                    disabled={!selectedMunicipality}
                  >
                    <option value="">Select Brgy</option>
                    {barangays.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>
                    <Calendar size={12} /> DATE
                  </label>
                  <input
                    type="date"
                    value={resDate}
                    min={todayStr}
                    onChange={(e) => setResDate(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>
                    <Clock size={12} /> TIME
                  </label>
                  <input
                    type="time"
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>GUESTS (MAX {totalSeats})</label>
                <input
                  type="number"
                  min="1"
                  max={totalSeats}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                />
              </div>

              <button
                className={`btn-confirm ${isFormInvalid ? "btn-disabled" : ""}`}
                onClick={handleConfirmReservation}
                disabled={isFormInvalid}
              >
                {loading ? "Processing..." : "Confirm Reservation"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

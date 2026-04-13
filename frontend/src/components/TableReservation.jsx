import React, { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import {
  UtensilsCrossed,
  X,
  Link as LinkIcon,
  Calendar,
  Clock,
  Users,
  Info,
  MapPin,
  Pencil,
  Upload,
} from "lucide-react";
import "../Style/TableReservation.css";

const TABLES_DATA = [
  { id: 1, label: "T1", seats: 5, top: "23%", left: "15%", type: "rect-v", layout: "right-side" },
  { id: 2, label: "T2", seats: 2, top: "50%", left: "25%", type: "square-sm", layout: "sides" },
  { id: 3, label: "T3", seats: 4, top: "65%", left: "25%", type: "square", layout: "sides" },
  { id: 4, label: "T4", seats: 4, top: "82%", left: "25%", type: "square", layout: "sides" },
  { id: 5, label: "T5", seats: 4, top: "38%", left: "50%", type: "square", layout: "sides" },
  { id: 6, label: "T6", seats: 4, top: "58%", left: "50%", type: "square", layout: "sides" },
  { id: 7, label: "T7", seats: 4, top: "17%", left: "77%", type: "square", layout: "top-bottom" },
  { id: 8, label: "T8", seats: 4, top: "45%", left: "77%", type: "square", layout: "top-bottom" },
  { id: 9, label: "T9", seats: 4, top: "72%", left: "77%", type: "square", layout: "top-bottom" },
  { id: 10, label: "T10", seats: 3, top: "92%", left: "65%", type: "rect-h", layout: "top-side" },
];

export default function TableReservation({ onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(null);
  const [linkedIds, setLinkedIds] = useState([]);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- NEW LOGIC STATES ---
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [dbOccupiedTables, setDbOccupiedTables] = useState({}); // { tableId: status }

  // --- FORM STATES (ALL PRESERVED) ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [resDate, setResDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [allergy, setAllergy] = useState("No Allergy");
  const [otherAllergy, setOtherAllergy] = useState("");
  const [receipt, setReceipt] = useState(null);
  const fileInputRef = useRef(null);

  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  // 1. Check if user already has a reservation
  useEffect(() => {
    const checkUser = async () => {
      const userId = localStorage.getItem("userId");
      if (userId) {
        try {
          const res = await axios.get(`http://localhost:5000/api/reservations/user-active/${userId}`);
          setHasActiveReservation(res.data.hasActive);
        } catch (err) { console.error(err); }
      }
    };
    checkUser();
  }, []);

  // 2. Fetch live statuses for Red/Orange updates
  useEffect(() => {
    const fetchLiveStatus = async () => {
      if (resDate && startTime && endTime) {
        try {
          const res = await axios.get(`http://localhost:5000/api/reservations/table-statuses`, {
            params: { date: resDate, startTime, endTime }
          });
          setDbOccupiedTables(res.data);
        } catch (err) { console.error(err); }
      }
    };
    fetchLiveStatus();
  }, [resDate, startTime, endTime]);

  // --- TIME LOGIC ---
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
      if (period === "PM") intervals.forEach((m) => options.push(`12:${m} PM`));
      for (let h = startHour; h <= endHour; h++) {
        intervals.forEach((m) => {
          if (period === "PM" && h === 10 && m !== "00") return;
          if (period === "AM" && h === 12) return;
          options.push(`${h.toString().padStart(2, "0")}:${m} ${period}`);
        });
      }
    });
    return options;
  }, []);

  const filteredEndTimeOptions = useMemo(() => {
    if (!startTime) return timeOptions;
    const startMins = timeToMinutes(startTime);
    return timeOptions.filter((t) => timeToMinutes(t) >= startMins + 60);
  }, [startTime, timeOptions]);

  // Pre-fill data
  useEffect(() => {
    setFirstName(localStorage.getItem("firstName") || "");
    setLastName(localStorage.getItem("lastName") || "");
    setEmail(localStorage.getItem("email") || "");
    setPhone(localStorage.getItem("phone") || "");
    if (!localStorage.getItem("firstName")) setIsEditing(true);
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/address/municipalities")
      .then((res) => res.json())
      .then((data) => setMunicipalities(Array.isArray(data) ? data : data.data || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedMunicipality && selectedMunicipality !== "undefined") {
      fetch(`http://localhost:5000/api/address/barangays/${selectedMunicipality}`)
        .then((res) => res.json())
        .then((data) => setBarangays(Array.isArray(data) ? data : []))
        .catch((err) => console.error(err));
    }
  }, [selectedMunicipality]);

  const handleConfirmReservation = async () => {
    if (loading || hasActiveReservation) return;
    setLoading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("userId", localStorage.getItem("userId") || "");
      data.append("firstName", firstName);
      data.append("lastName", lastName);
      data.append("email", email);
      data.append("phone", phone);
      data.append("date", resDate);
      data.append("startTime", startTime);
      data.append("endTime", endTime);
      data.append("guests", guestCount);
      data.append("brgyCode", selectedBarangay);
      data.append("tableIds", JSON.stringify([selectedId, ...linkedIds]));
      data.append("allergy", allergy === "Other" ? otherAllergy : allergy);
      data.append("receipt", receipt);
      data.append("status", "Pending");

      const response = await axios.post("http://localhost:5000/api/reservations/table", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.status === 200 || response.status === 201) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed.");
    } finally { setLoading(false); }
  };

  const handleTableClick = (table) => {
    if (dbOccupiedTables[table.id]) return; // Block Red tables
    if (isLinkMode) {
      if (table.id === selectedId) { setSelectedId(null); setLinkedIds([]); setIsLinkMode(false); return; }
      setLinkedIds((p) => p.includes(table.id) ? p.filter((id) => id !== table.id) : [...p, table.id]);
    } else {
      setSelectedId(selectedId === table.id ? null : table.id);
      setLinkedIds([]);
    }
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().split("T")[0];
  }, []);

  const primaryTable = useMemo(() => TABLES_DATA.find((t) => t.id === selectedId), [selectedId]);
  const totalSeats = useMemo(() => {
    if (!primaryTable) return 0;
    const linkedSeats = TABLES_DATA.filter((t) => linkedIds.includes(t.id)).reduce((s, t) => s + t.seats, 0);
    return primaryTable.seats + linkedSeats;
  }, [primaryTable, linkedIds]);

  const isFormInvalid = useMemo(() => {
    return (
      !firstName || !lastName || !resDate || !startTime || !endTime ||
      !selectedBarangay || !receipt || !email || !phone || hasActiveReservation
    );
  }, [firstName, lastName, resDate, startTime, endTime, selectedBarangay, receipt, email, phone, hasActiveReservation]);

  return (
    <div className="floor-plan-wrapper" onClick={onClose}>
      <div className="floor-plan-main" onClick={(e) => e.stopPropagation()}>
        <header className="floor-header">
          <div className="floor-logo-bar">
            <div className="floor-icon-circle"><UtensilsCrossed size={20} color="white" /></div>
            <div className="floor-header-text">
              <h1 className="floor-title">Floor Plan</h1>
              <p className="floor-subtitle">Select a table to reserve</p>
            </div>
          </div>
          <button className="floor-back-btn" onClick={onClose}>Back</button>
        </header>

        <div className="map-scroll-area">
          <div className="map-container">
            <div className="tables-area">
              {TABLES_DATA.map((table) => {
                const isOccupiedInDb = dbOccupiedTables[table.id];
                let statusClass = "available"; // GREEN
                if (isOccupiedInDb) statusClass = "occupied"; // RED
                else if (selectedId === table.id) statusClass = "selected"; // ORANGE
                else if (linkedIds.includes(table.id)) statusClass = "linked"; // BLUE

                return (
                  <div
                    key={table.id}
                    className={`floor-table ${table.type} ${statusClass}`}
                    style={{ top: table.top, left: table.left }}
                    onClick={() => handleTableClick(table)}
                  >
                    {Array.from({ length: table.seats }).map((_, i) => (
                      <div key={i} className={`chair chair-${table.layout}-${i + 1}`} />
                    ))}
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
          <div className="legend-item"><span className="dot available"></span> Green: Available</div>
          <div className="legend-item"><span className="dot selected"></span> Orange: Selected</div>
          <div className="legend-item"><span className="dot linked"></span> Blue: Linked</div>
          <div className="legend-item"><span className="dot occupied"></span> Red: Occupied</div>
        </div>
      </div>

      <aside className="floor-sidebar" onClick={(e) => e.stopPropagation()}>
        {hasActiveReservation ? (
          <div className="reserved-notice fade-in">
             <Info size={32} color="#e74c3c" />
             <p>You already have an active reservation. You cannot book again.</p>
          </div>
        ) : !primaryTable ? (
          <div className="empty-sidebar"><p>Select a table to reserve</p></div>
        ) : (
          <div className="res-panel fade-in">
            <button className="panel-close" onClick={() => { setSelectedId(null); setIsLinkMode(false); }}><X size={18} /></button>
            <h2 className="panel-title">Reserve {primaryTable.id} {linkedIds.map(id => ` + ${id}`)}</h2>

            <div className="res-form">
              <button className={`btn-link-mode ${isLinkMode ? "active" : ""}`} onClick={() => setIsLinkMode(!isLinkMode)}>
                {isLinkMode ? "Done Linking" : "Link Tables"}
              </button>

              <div className="input-group">
                <label>FIRST NAME <Pencil size={14} onClick={() => setIsEditing(!isEditing)} /></label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!isEditing} />
              </div>
              <div className="input-group">
                <label>LAST NAME</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!isEditing} />
              </div>
              <div className="input-group">
                <label>EMAIL ADDRESS</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} />
              </div>
              <div className="input-group">
                <label>CONTACT NUMBER</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0,11))} />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>MUNICIPALITY</label>
                  <select value={selectedMunicipality} onChange={(e) => setSelectedMunicipality(e.target.value)}>
                    <option value="">Select City</option>
                    {municipalities.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>BARANGAY</label>
                  <select value={selectedBarangay} onChange={(e) => setSelectedBarangay(e.target.value)} disabled={!selectedMunicipality}>
                    <option value="">Select Brgy</option>
                    {barangays.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>DATE</label>
                <input type="date" value={resDate} min={todayStr} onChange={(e) => setResDate(e.target.value)} />
              </div>

              <div className="input-row">
                <div className="input-group"><label>START</label>
                  <select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                    <option value="">--:--</option>
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="input-group"><label>END</label>
                  <select value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!startTime}>
                    <option value="">--:--</option>
                    {filteredEndTimeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>GUESTS (MAX {totalSeats})</label>
                <input type="number" min="1" max={totalSeats} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} />
              </div>

              <div className="input-group">
                <label>ALLERGY</label>
                <select value={allergy} onChange={(e) => setAllergy(e.target.value)}>
                  <option value="No Allergy">No Allergy</option>
                  <option value="Peanuts">Peanuts</option>
                  <option value="Seafood">Seafood</option>
                  <option value="Other">Other</option>
                </select>
                {allergy === "Other" && <input type="text" placeholder="Specify allergy" value={otherAllergy} onChange={(e) => setOtherAllergy(e.target.value)} style={{marginTop: '5px'}} />}
              </div>

              <div className="input-group">
                <label>PROOF OF PAYMENT</label>
                <input type="file" ref={fileInputRef} hidden onChange={(e) => setReceipt(e.target.files[0])} />
                <button type="button" className="btn-link-mode" style={{width: '100%'}} onClick={() => fileInputRef.current.click()}>
                  {receipt ? receipt.name : "Upload Image"}
                </button>
              </div>

              {error && <p style={{color: 'red', fontSize: '12px'}}>{error}</p>}

              <button className={`btn-confirm ${isFormInvalid ? "btn-disabled" : ""}`} onClick={handleConfirmReservation} disabled={isFormInvalid || loading}>
                {loading ? "Processing..." : "Confirm Reservation"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
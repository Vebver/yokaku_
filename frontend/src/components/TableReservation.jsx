import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  UtensilsCrossed,
  ArrowRight,
  ArrowLeft,
  X,
  Calendar,
  Clock,
  Info,
  MapPin,
  Pencil,
  Layers,
  Baby,
  ChevronRight,
  Armchair,
  Mail,
  Phone,
  Link as LinkIcon,
} from "lucide-react";
import "../Style/TableReservation.css";
import MenuModal from "./MenuModal";
import ReservationSummary from "./ReservationSummary";
import TermsModal from "./TermsModal";

const TABLES_DATA = [
  { id: 1, label: "Table 1", seats: 5 },
  { id: 2, label: "Table 2", seats: 2 },
  { id: 3, label: "Table 3", seats: 4 },
  { id: 4, label: "Table 4", seats: 4 },
  { id: 5, label: "Table 5", seats: 4 },
  { id: 6, label: "Table 6", seats: 4 },
  { id: 7, label: "Table 7", seats: 4 },
  { id: 8, label: "Table 8", seats: 4 },
  { id: 9, label: "Table 9", seats: 4 },
  { id: 10, label: "Table 10", seats: 3 },
];

export default function TableReservation({ onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(null);
  const [linkedIds, setLinkedIds] = useState([]);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [dbOccupiedTables, setDbOccupiedTables] = useState({});
  const [tableSchedule, setTableSchedule] = useState([]);

  // --- FORM STATES ---
  const [firstName, setFirstName] = useState(
    localStorage.getItem("firstName") || "",
  );
  const [lastName, setLastName] = useState(
    localStorage.getItem("lastName") || "",
  );
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [phone, setPhone] = useState(localStorage.getItem("phone") || "");
  const [isEditing, setIsEditing] = useState(false);
  const [resDate, setResDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [highChair, setHighChair] = useState("No");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const todayStr = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().split("T")[0];
  }, []);

  // --- DERIVED STATE ---
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

  const fullReservationData = useMemo(
    () => ({
      firstName,
      lastName,
      email,
      phone,
      guestCount: totalSeats,
      resDate,
      startTime,
      endTime,
      tableLabel: primaryTable?.label,
      linkedTables: linkedIds,
      packages: selectedItems,
    }),
    [
      firstName,
      lastName,
      email,
      phone,
      totalSeats,
      resDate,
      startTime,
      endTime,
      primaryTable,
      linkedIds,
      selectedItems,
    ],
  );

  // --- REAL-TIME POLLING ---
  useEffect(() => {
    const fetchData = async () => {
      if (resDate) {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/reservations/table-statuses`,
            {
              params: {
                date: resDate,
                startTime: startTime || "00:00",
                endTime: endTime || "23:59",
              },
            },
          );
          setDbOccupiedTables(res.data || {});
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [resDate, startTime, endTime]);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (selectedId && resDate) {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/reservations/table-schedule`,
            {
              params: { tableId: selectedId, date: resDate },
            },
          );
          setTableSchedule(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 5000);
    return () => clearInterval(interval);
  }, [selectedId, resDate]);

  // --- HELPERS ---
  const timeToMinutes = (t) => {
    if (!t) return 0;
    const is12 = t.includes("AM") || t.includes("PM");
    if (is12) {
      const [time, period] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    }
    return t.split(":").reduce((h, m) => h * 60 + +m, 0);
  };

  const formatTimeForDisplay = (timeStr) => {
    if (!timeStr) return "";
    if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
    const parts = timeStr.split(":");
    let hours = parseInt(parts[0], 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${parts[1]} ${ampm}`;
  };

  const availableStartTimeOptions = useMemo(() => {
    const options = [];
    ["AM", "PM"].forEach((p) => {
      for (let h = p === "AM" ? 10 : 1; h <= (p === "AM" ? 11 : 10); h++) {
        ["00", "15", "30", "45"].forEach((m) => {
          if (
            (p === "PM" && h === 10 && m !== "00") ||
            (p === "AM" && h === 12)
          )
            return;
          options.push(`${h.toString().padStart(2, "0")}:${m} ${p}`);
        });
      }
    });
    let filtered = options;
    if (resDate === todayStr) {
      const thresh = new Date().getHours() * 60 + new Date().getMinutes() + 15;
      filtered = filtered.filter((t) => timeToMinutes(t) >= thresh);
    }
    return filtered.filter((t) => {
      const m = timeToMinutes(t);
      return !tableSchedule.some(
        (r) =>
          r.status !== "Done" &&
          r.status !== "Completed" &&
          m >= timeToMinutes(r.startTime) &&
          m < timeToMinutes(r.endTime),
      );
    });
  }, [tableSchedule, resDate, todayStr]);

  const filteredEndTimeOptions = useMemo(() => {
    if (!startTime) return [];
    const startM = timeToMinutes(startTime);
    const options = [];
    ["AM", "PM"].forEach((p) => {
      for (let h = p === "AM" ? 10 : 1; h <= (p === "AM" ? 11 : 10); h++) {
        ["00", "15", "30", "45"].forEach((m) => {
          if (
            (p === "PM" && h === 10 && m !== "00") ||
            (p === "AM" && h === 12)
          )
            return;
          options.push(`${h.toString().padStart(2, "0")}:${m} ${p}`);
        });
      }
    });
    return options.filter((t) => timeToMinutes(t) >= startM + 60);
  }, [startTime]);

  const isFormInvalid = useMemo(() => {
    const s = timeToMinutes(startTime),
      e = timeToMinutes(endTime);
    const conflict = tableSchedule.some(
      (r) =>
        r.status !== "Done" &&
        r.status !== "Completed" &&
        s < timeToMinutes(r.endTime) &&
        e > timeToMinutes(r.startTime),
    );
    const isPhoneValid = phone.length === 11 && phone.startsWith("09");
    return (
      !selectedId ||
      !firstName.trim() ||
      !email.trim() ||
      !isPhoneValid ||
      !resDate ||
      !startTime ||
      !endTime ||
      e - s < 60 ||
      selectedItems.length === 0 ||
      conflict
    );
  }, [
    firstName,
    email,
    phone,
    resDate,
    startTime,
    endTime,
    tableSchedule,
    selectedId,
    selectedItems,
  ]);

  const handleTableClick = (table) => {
    const status = dbOccupiedTables[table.id];
    if (status === "Confirmed" || status === "Seated" || status === "Pending")
      return;

    if (isLinkMode) {
      if (table.id === selectedId) return;
      setLinkedIds((prev) =>
        prev.includes(table.id)
          ? prev.filter((id) => id !== table.id)
          : [...prev, table.id],
      );
    } else {
      setSelectedId(selectedId === table.id ? null : table.id);
      setLinkedIds([]);
    }
  };

  const handleConfirmReservation = async (file) => {
    setLoading(true);
    try {
      const data = new FormData();
      const allTables = [selectedId, ...linkedIds];
      data.append("userId", localStorage.getItem("userId") || "");
      data.append("firstName", firstName);
      data.append("lastName", lastName);
      data.append("email", email);
      data.append("phone", phone);
      data.append("date", resDate);
      data.append("startTime", startTime);
      data.append("endTime", endTime);
      data.append("guests", totalSeats);
      data.append("tableIds", JSON.stringify(allTables));
      data.append("receipt", file);
      data.append("status", "Confirmed");
      data.append("selectedItems", JSON.stringify(selectedItems));
      const res = await axios.post(
        "http://localhost:5000/api/reservations/table",
        data,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (res.status === 200 || res.status === 201) onSuccess(res.data.id);
    } catch (err) {
      setError("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`floor-plan-wrapper ${!resDate ? "init-state" : ""}`}>
      <button className="page-back-btn" onClick={onClose}>
        <ArrowLeft size={18} /> <span>Back</span>
      </button>

      <aside
        className={`floor-sidebar ${!resDate ? "centered-form" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="res-panel fade-in">
          <h2 className="panel-title">
            {!resDate
              ? "Select Reservation Date"
              : selectedId
                ? `Reserve ${primaryTable?.label}`
                : "Pick a Table"}
          </h2>
          <div className="res-form">
            <div className="input-group">
              <label>
                <Calendar size={12} /> DATE
              </label>
              <input
                type="date"
                value={resDate}
                min={todayStr}
                onChange={(e) => {
                  setResDate(e.target.value);
                  setSelectedId(null);
                  setStartTime("");
                  setEndTime("");
                }}
              />
            </div>

            {resDate && selectedId && (
              <>
                <div className="table-schedule-section">
                  <h4 className="schedule-header">
                    <Clock size={14} /> Occupied Slots for {primaryTable?.label}
                  </h4>
                  <div className="schedule-list">
                    {tableSchedule.filter(
                      (res) =>
                        res.status !== "Done" && res.status !== "Completed",
                    ).length > 0 ? (
                      tableSchedule
                        .filter(
                          (res) =>
                            res.status !== "Done" && res.status !== "Completed",
                        )
                        .map((res, index) => (
                          <div key={index} className="schedule-item-3d">
                            <Clock size={12} />{" "}
                            {formatTimeForDisplay(res.startTime)} -{" "}
                            {formatTimeForDisplay(res.endTime)}
                          </div>
                        ))
                    ) : (
                      <p className="no-res-text">Table is fully available.</p>
                    )}
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>
                      <Clock size={12} /> START
                    </label>
                    <select
                      className="res-input-dropdown"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setEndTime("");
                      }}
                    >
                      <option value="">--:-- --</option>
                      {availableStartTimeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>
                      <Clock size={12} /> END
                    </label>
                    <select
                      className="res-input-dropdown"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={!startTime}
                    >
                      <option value="">--:-- --</option>
                      {filteredEndTimeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <div className="label-with-icon">
                    <label>FIRST NAME</label>
                    <Pencil
                      size={16}
                      className={`edit-toggle-icon ${isEditing ? "active" : ""}`}
                      onClick={() => setIsEditing(!isEditing)}
                    />
                  </div>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="input-group">
                  <label>LAST NAME</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="input-group">
                  <label>
                    <Mail size={12} /> EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="input-group">
                  <label>
                    <Phone size={12} /> CONTACT NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="09xxxxxxxxx"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 11) setPhone(val);
                    }}
                  />
                </div>
                <div className="input-group">
                  <label>GUESTS (Based on Selection)</label>
                  <input
                    type="text"
                    value={totalSeats}
                    readOnly
                    style={{
                      backgroundColor: "#f0f0f0",
                      cursor: "not-allowed",
                      fontWeight: "700",
                    }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    <Baby size={12} /> HIGH CHAIR NEEDED?
                  </label>
                  <div className="radio-group-horizontal">
                    {["Yes", "No"].map((opt) => (
                      <label key={opt} className="custom-radio">
                        <input
                          type="radio"
                          name="hc"
                          value={opt}
                          checked={highChair === opt}
                          onChange={(e) => setHighChair(e.target.value)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label>PACKAGES</label>
                  <button
                    type="button"
                    className="btn-link-mode"
                    onClick={() => setIsMenuOpen(true)}
                  >
                    <Layers size={16} />{" "}
                    {selectedItems.length > 0
                      ? `${selectedItems.length} Selected`
                      : "View Packages"}
                  </button>
                </div>
                <button
                  className={`btn-confirm ${isFormInvalid ? "btn-disabled" : ""}`}
                  onClick={() => setIsTermsOpen(true)}
                  disabled={isFormInvalid || loading}
                >
                  Confirm Reservation
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {resDate && (
        <div
          className="floor-plan-main fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="floor-header">
            <h1 className="floor-title">Select a Table</h1>
          </header>

          {selectedId && (
            <div style={{ marginBottom: "20px", width: "100%" }}>
              <button
                className={`btn-link-mode ${isLinkMode ? "active" : ""}`}
                onClick={() => setIsLinkMode(!isLinkMode)}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <LinkIcon size={18} style={{ marginRight: "10px" }} />{" "}
                {isLinkMode ? "Finish Linking" : "Link Tables"}
              </button>
            </div>
          )}

          <div className="table-selection-grid">
            {TABLES_DATA.map((table) => {
              const status = dbOccupiedTables[table.id];
              let cls =
                status === "Confirmed" || status === "Seated"
                  ? "occupied"
                  : status === "Pending"
                    ? "reserved"
                    : selectedId === table.id
                      ? "selected"
                      : linkedIds.includes(table.id)
                        ? "linked"
                        : "available";
              return (
                <div
                  key={table.id}
                  className={`table-list-card ${cls}`}
                  onClick={() => handleTableClick(table)}
                >
                  <div className="table-card-content">
                    <div className="table-details">
                      <div className="table-title-row">
                        <Armchair size={16} />
                        <strong className="table-label-text">
                          {table.label}
                        </strong>
                      </div>
                      <span className="table-seats-text">
                        {table.seats} Seats
                      </span>
                    </div>
                  </div>
                  <div className={`status-dot ${cls}`} />
                </div>
              );
            })}
          </div>
          <div className="floor-legend-horizontal">
            <div className="legend-item">
              <span className="dot available"></span> Available
            </div>
            <div className="legend-item">
              <span className="dot reserved"></span> Reserved
            </div>
            <div className="legend-item">
              <span className="dot occupied"></span> Occupied (Ongoing)
            </div>
          </div>
        </div>
      )}

      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectedItemsChange={setSelectedItems}
        initialSelectedItems={selectedItems}
      />
      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={() => {
          setIsTermsOpen(false);
          setIsSummaryOpen(true);
        }}
      />
      <ReservationSummary
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        orderSummary={{}}
        reservationData={fullReservationData}
        onConfirm={handleConfirmReservation}
        loading={loading}
      />
    </div>
  );
}

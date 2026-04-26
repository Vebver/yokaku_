import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Upload,
  Layers,
  User,
  Baby,
  ChevronRight,
  Armchair,
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

  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [dbOccupiedTables, setDbOccupiedTables] = useState({});
  const [tableSchedule, setTableSchedule] = useState([]);

  // --- FORM STATES ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [resDate, setResDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [guestCount, setGuestCount] = useState("");

  const [allergy, setAllergy] = useState("No Allergy");
  const [otherAllergy, setOtherAllergy] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [highChair, setHighChair] = useState("No");

  // Logic Helpers (Unchanged)
  useEffect(() => {
    const checkUser = async () => {
      const userId = localStorage.getItem("userId");
      if (userId) {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/reservations/user-active/${userId}`,
          );
          setHasActiveReservation(res.data.hasActive);
        } catch (err) {
          console.error(err);
        }
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    const fetchLiveStatus = async () => {
      if (resDate && startTime && endTime) {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/reservations/table-statuses`,
            {
              params: { date: resDate, startTime, endTime },
            },
          );
          setDbOccupiedTables(res.data);
        } catch (err) {
          console.error("Fetch Error:", err);
        }
      }
    };
    fetchLiveStatus();
  }, [resDate, startTime, endTime]);

  useEffect(() => {
    const fetchTableSchedule = async () => {
      if (selectedId && resDate) {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/reservations/table-schedule`,
            {
              params: { tableId: selectedId, date: resDate },
            },
          );
          setTableSchedule(res.data);
        } catch (err) {
          console.error("Schedule Error:", err);
        }
      } else {
        setTableSchedule([]);
      }
    };
    fetchTableSchedule();
  }, [selectedId, resDate]);

  useEffect(() => {
    fetch("http://localhost:5000/api/address/municipalities")
      .then((res) => res.json())
      .then((data) =>
        setMunicipalities(Array.isArray(data) ? data : data.data || []),
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedMunicipality) {
      fetch(
        `http://localhost:5000/api/address/barangays/${selectedMunicipality}`,
      )
        .then((res) => res.json())
        .then((data) => setBarangays(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [selectedMunicipality]);

  useEffect(() => {
    setFirstName(localStorage.getItem("firstName") || "");
    setLastName(localStorage.getItem("lastName") || "");
    setEmail(localStorage.getItem("email") || "");
    setPhone(localStorage.getItem("phone") || "");
    if (!localStorage.getItem("firstName")) setIsEditing(true);
  }, []);

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const is12Hour = timeStr.includes("AM") || timeStr.includes("PM");
    if (is12Hour) {
      const [time, period] = timeStr.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    }
    const parts = timeStr.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  };

  const formatTimeForDisplay = (timeStr) => {
    if (!timeStr) return "";
    if (timeStr.includes("AM") || timeStr.includes("PM"))
      return timeStr.replace(/:00\s/, " ");
    let [h, m] = timeStr.split(":");
    let hours = parseInt(h, 10);
    const suffix = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${m} ${suffix}`;
  };

  const handleAcceptTerms = () => {
    setIsTermsOpen(false);
    setIsSummaryOpen(true);
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

  const todayStr = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().split("T")[0];
  }, []);

  const availableStartTimeOptions = useMemo(() => {
    let options = timeOptions;
    if (resDate === todayStr) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const threshold = currentMins + 15;
      options = options.filter((t) => timeToMinutes(t) >= threshold);
    }
    if (!tableSchedule.length) return options;
    return options.filter((timeStr) => {
      const timeMin = timeToMinutes(timeStr);
      return !tableSchedule.some((res) => {
        const startMin = timeToMinutes(res.startTime);
        const endMin = timeToMinutes(res.endTime);
        return timeMin >= startMin && timeMin < endMin;
      });
    });
  }, [timeOptions, tableSchedule, resDate, todayStr]);

  const filteredEndTimeOptions = useMemo(() => {
    if (!startTime) return timeOptions;
    const startMins = timeToMinutes(startTime);
    let options = timeOptions.filter((t) => timeToMinutes(t) >= startMins + 60);
    if (resDate === todayStr) {
      const now = new Date();
      const threshold = now.getHours() * 60 + now.getMinutes() + 15;
      options = options.filter((t) => timeToMinutes(t) >= threshold);
    }
    return options;
  }, [startTime, timeOptions, resDate, todayStr]);

  const handleConfirmReservation = async (receiptFile) => {
    setLoading(true);
    setError("");
    try {
      const productNames = selectedItems
        .map((item) => `${item.name} (x${item.quantity})`)
        .join(", ");
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
      data.append("receipt", receiptFile);
      data.append("status", "Confirmed");
      data.append("totalAmount", orderSummary.totalOrderPrice);
      data.append("selectedItems", JSON.stringify(selectedItems));

      const response = await axios.post(
        "http://localhost:5000/api/reservations/table",
        data,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (response.status === 200 || response.status === 201) {
        setIsSummaryOpen(false);
        onSuccess(response.data.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed.");
    } finally {
      setLoading(false);
    }
  };

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

  const orderSummary = useMemo(() => {
    const totalOrderPrice = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const downpayment = totalOrderPrice * 0.2;
    const balance = totalOrderPrice - downpayment;
    return { totalOrderPrice, downpayment, balance };
  }, [selectedItems]);

  const isFormInvalid = useMemo(() => {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const hasConflict = tableSchedule.some((res) => {
      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);
      return startMin < resEnd && endMin > resStart;
    });
    return (
      !selectedId ||
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !resDate ||
      !startTime ||
      !endTime ||
      endMin - startMin < 60 ||
      !guestCount ||
      guestCount <= 0 ||
      !selectedMunicipality ||
      !selectedBarangay ||
      selectedItems.length === 0 ||
      hasConflict
    );
  }, [
    firstName,
    lastName,
    email,
    resDate,
    startTime,
    endTime,
    guestCount,
    selectedMunicipality,
    selectedBarangay,
    selectedItems,
    tableSchedule,
    selectedId,
  ]);

  const handleTableClick = (table) => {
    if (dbOccupiedTables[table.id]) return;
    if (isLinkMode) {
      if (table.id === selectedId) {
        setSelectedId(null);
        setLinkedIds([]);
        setIsLinkMode(false);
        return;
      }
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

  const fullReservationData = useMemo(() => {
    const muniName =
      municipalities.find((m) => m.code === selectedMunicipality)?.name || "";
    const brgyName =
      barangays.find((b) => b.code === selectedBarangay)?.name || "";
    return {
      firstName,
      lastName,
      email,
      phone,
      municipality: muniName,
      barangay: brgyName,
      guestCount,
      resDate,
      startTime,
      endTime,
      tableLabel: primaryTable?.label,
      linkedTables: linkedIds,
      allergy: allergy === "Other" ? otherAllergy : allergy,
      packages: selectedItems,
    };
  }, [
    firstName,
    lastName,
    email,
    phone,
    selectedMunicipality,
    selectedBarangay,
    guestCount,
    resDate,
    startTime,
    endTime,
    primaryTable,
    linkedIds,
    municipalities,
    barangays,
    allergy,
    otherAllergy,
    selectedItems,
  ]);

  return (
    <div className={`floor-plan-wrapper ${!resDate ? "init-state" : ""}`}>
      <button className="page-back-btn" onClick={onClose}>
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>

      {/* 1. ASIDE TAG (FORM) */}
      <aside
        className={`floor-sidebar ${!resDate ? "centered-form" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="res-panel fade-in">
          <h2 className="panel-title">
            {!resDate ? "Select Reservation Date" : "Reservation Form"}
          </h2>

          <div className="res-form">
            {/* DATE IS ALWAYS VISIBLE */}
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
                  setStartTime("");
                  setEndTime("");
                }}
              />
            </div>

            {/* SHOW THE REST ONLY IF DATE IS SELECTED */}
            {resDate && (
              <>
                {primaryTable && (
                  <div
                    className="table-schedule-section"
                    style={{
                      padding: "10px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "8px",
                      marginBottom: "15px",
                      border: "1px solid #eee",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "12px",
                        marginBottom: "8px",
                        color: "#555",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Clock size={14} /> Occupied Slots for {resDate}
                    </h4>
                    <div className="schedule-list">
                      {tableSchedule.length > 0 ? (
                        tableSchedule.map((res, index) => (
                          <div
                            key={index}
                            style={{
                              fontSize: "12px",
                              padding: "8px",
                              background: "#fff",
                              borderLeft: "3px solid #f38d31",
                              marginBottom: "4px",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            }}
                          >
                            <div style={{ fontWeight: "600", color: "#333" }}>
                              <Clock size={10} style={{ marginRight: "4px" }} />
                              {formatTimeForDisplay(res.startTime)} -{" "}
                              {formatTimeForDisplay(res.endTime)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: "11px", color: "#2a9d8f" }}>
                          All slots are available.
                        </p>
                      )}
                    </div>
                  </div>
                )}

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
                        <option key={`start-${t}`} value={t}>
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
                        <option key={`end-${t}`} value={t}>
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

                <div className="input-row">
                  <div className="input-group">
                    <label>
                      <MapPin size={12} /> MUNICIPALITY
                    </label>
                    <select
                      className="res-input-dropdown"
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
                      className="res-input-dropdown"
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

                <div className="input-group">
                  <label>GUESTS (MAX {totalSeats || "?"})</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1"
                    value={guestCount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val === "") return setGuestCount("");
                      let num = parseInt(val, 10);
                      if (num > totalSeats) num = totalSeats;
                      setGuestCount(num);
                    }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    <Baby size={12} /> HIGH CHAIR NEEDED?
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "30px",
                      width: "100%",
                      padding: "5px 0",
                    }}
                  >
                    {["Yes", "No"].map((opt) => (
                      <label
                        key={opt}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--text-light)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="highChair"
                          value={opt}
                          checked={highChair === opt}
                          onChange={(e) => setHighChair(e.target.value)}
                          style={{
                            accentColor: "#f38d31",
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label>PACKAGES</label>
                  <button
                    type="button"
                    className="btn-link-mode"
                    style={{ width: "100%", marginBottom: "10px" }}
                    onClick={() => setIsMenuOpen(true)}
                  >
                    <Layers size={16} />{" "}
                    {selectedItems.length > 0
                      ? `Selected ${selectedItems.length} Items`
                      : "View Packages"}
                  </button>
                </div>
                <button
                  className={`btn-confirm ${isFormInvalid ? "btn-disabled" : ""}`}
                  onClick={() => setIsTermsOpen(true)}
                  disabled={isFormInvalid || loading}
                >
                  {loading ? "Processing..." : "Confirm Reservation"}
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN SECTION (TABLES) - ONLY VISIBLE IF DATE IS SELECTED */}
      {resDate && (
        <div
          className="floor-plan-main fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="floor-header">
            <div className="floor-logo-bar">
              <div className="floor-icon-circle">
                <UtensilsCrossed size={20} color="white" />
              </div>
              <div className="floor-header-text">
                <h1 className="floor-title">Select a Table</h1>
                <p className="floor-subtitle">Available tables for {resDate}</p>
              </div>
            </div>
          </header>

          <div className="table-selection-grid">
            {TABLES_DATA.map((table) => {
              const isOccupied = dbOccupiedTables[table.id];
              const isSelected = selectedId === table.id;
              const isLinked = linkedIds.includes(table.id);
              let statusClass = isOccupied
                ? "occupied"
                : isSelected
                  ? "selected"
                  : isLinked
                    ? "linked"
                    : "available";
              return (
                <div
                  key={table.id}
                  className={`table-list-card ${statusClass}`}
                  onClick={() => handleTableClick(table)}
                >
                  <div className="table-card-content">
                    <div className="table-icon-box">
                      <Armchair size={24} />
                    </div>
                    <div className="table-details">
                      <span className="table-label-text">{table.label}</span>
                      <span className="table-seats-text">
                        {table.seats} Seats
                      </span>
                    </div>
                  </div>
                  {isSelected ? (
                    <ChevronRight size={18} />
                  ) : (
                    <div className={`status-dot ${statusClass}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="floor-legend-horizontal">
            <div className="legend-item">
              <span className="dot available"></span> Available
            </div>
            <div className="legend-item">
              <span className="dot selected"></span> Selected
            </div>
            <div className="legend-item">
              <span className="dot linked"></span> Linked
            </div>
            <div className="legend-item">
              <span className="dot occupied"></span> Occupied
            </div>
          </div>
        </div>
      )}

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={handleAcceptTerms}
      />
      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectedItemsChange={setSelectedItems}
        initialSelectedItems={selectedItems}
      />
      <ReservationSummary
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        orderSummary={orderSummary}
        reservationData={fullReservationData}
        onConfirm={handleConfirmReservation}
        loading={loading}
      />
    </div>
  );
}

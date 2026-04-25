import React, { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import {
  UtensilsCrossed,
  ArrowRight,
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
} from "lucide-react";
import "../Style/TableReservation.css";
import MenuModal from "./MenuModal";
import ReservationSummary from "./ReservationSummary";
import TermsModal from "./TermsModal";

const TABLES_DATA = [
  {
    id: 1,
    label: "T1",
    seats: 5,
    top: "23%",
    left: "15%",
    type: "rect-v",
    layout: "right-side",
  },
  {
    id: 2,
    label: "T2",
    seats: 2,
    top: "50%",
    left: "25%",
    type: "square-sm",
    layout: "sides",
  },
  {
    id: 3,
    label: "T3",
    seats: 4,
    top: "65%",
    left: "25%",
    type: "square",
    layout: "sides",
  },
  {
    id: 4,
    label: "T4",
    seats: 4,
    top: "82%",
    left: "25%",
    type: "square",
    layout: "sides",
  },
  {
    id: 5,
    label: "T5",
    seats: 4,
    top: "38%",
    left: "50%",
    type: "square",
    layout: "sides",
  },
  {
    id: 6,
    label: "T6",
    seats: 4,
    top: "58%",
    left: "50%",
    type: "square",
    layout: "sides",
  },
  {
    id: 7,
    label: "T7",
    seats: 4,
    top: "17%",
    left: "77%",
    type: "square",
    layout: "top-bottom",
  },
  {
    id: 8,
    label: "T8",
    seats: 4,
    top: "45%",
    left: "77%",
    type: "square",
    layout: "top-bottom",
  },
  {
    id: 9,
    label: "T9",
    seats: 4,
    top: "72%",
    left: "77%",
    type: "square",
    layout: "top-bottom",
  },
  {
    id: 10,
    label: "T10",
    seats: 3,
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

  const renderChairs = (table) => {
    const chairs = [];
    for (let i = 0; i < table.seats; i++) {
      chairs.push(
        <div key={i} className={`chair chair-${table.layout}-${i + 1}`} />,
      );
    }
    return chairs;
  };

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
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedMunicipality) {
      fetch(
        `http://localhost:5000/api/address/barangays/${selectedMunicipality}`,
      )
        .then((res) => res.json())
        .then((data) => setBarangays(Array.isArray(data) ? data : []))
        .catch((err) => console.error(err));
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
    } else {
      const parts = timeStr.split(":");
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      return h * 60 + m;
    }
  };

  const formatTimeForDisplay = (timeStr) => {
    if (!timeStr) return "";
    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      return timeStr.replace(/:00\s/, " ");
    }
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

    // --- NEW: Filter choices to be at least 15 minutes ahead of current time ---
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

    // --- Ensure End time options also respect the current time if today ---
    if (resDate === todayStr) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const threshold = currentMins + 15;
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
      const storedUserId = localStorage.getItem("userId");
      console.log("Current User ID in LocalStorage:", storedUserId);

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
      data.append("packageName", productNames);
      data.append("totalAmount", orderSummary.totalOrderPrice);
      data.append("downpayment", orderSummary.downpayment);
      data.append("balance", orderSummary.balance);
      data.append("selectedItems", JSON.stringify(selectedItems));

      const response = await axios.post(
        "http://localhost:5000/api/reservations/table",
        data,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
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
    const hasOneHourDiff = endMin - startMin >= 60;
    const isOtherAllergyEmpty = allergy === "Other" && !otherAllergy.trim();

    const hasConflict = tableSchedule.some((res) => {
      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);
      return startMin < resEnd && endMin > resStart;
    });

    return (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !resDate ||
      !startTime ||
      !endTime ||
      !hasOneHourDiff ||
      !guestCount ||
      guestCount <= 0 ||
      !selectedMunicipality ||
      !selectedBarangay ||
      isOtherAllergyEmpty ||
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
    allergy,
    otherAllergy,
    selectedItems,
    tableSchedule,
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
    <div className="floor-plan-wrapper">
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
            {isLinkMode && (
              <div className="link-tooltip fade-in">
                Click available tables to link them
              </div>
            )}
            <div className="tables-area">
              {TABLES_DATA.map((table) => {
                const dbStatus = dbOccupiedTables[table.id];
                let statusClass = "available";
                if (dbStatus === "Confirmed" || dbStatus === "Seated");
                else if (dbStatus === "Pending") statusClass = "reserved";
                else if (selectedId === table.id) statusClass = "selected";
                else if (linkedIds.includes(table.id)) statusClass = "linked";

                return (
                  <div
                    key={table.id}
                    className={`floor-table ${table.type} ${statusClass}`}
                    style={{ top: table.top, left: table.left }}
                    onClick={() => handleTableClick(table)}
                  >
                    {renderChairs(table)}
                    <div className="table-inner">
                      <span className="table-id-label">{table.label}</span>
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
          <div className="legend-item">
            <span className="dot reserved"></span> Reserved
          </div>
        </div>
      </div>

      <aside className="floor-sidebar" onClick={(e) => e.stopPropagation()}>
        {hasActiveReservation ? (
          <div className="reserved-notice fade-in">
            <span className="info-icon-large">
              <Info size={32} color="#e74c3c" />
            </span>
            <p>
              You already have an active reservation. You cannot book again.
            </p>
          </div>
        ) : !primaryTable ? (
          <div className="empty-sidebar">
            <p>Select a table to reserve</p>
          </div>
        ) : (
          <div className="res-panel fade-in">
            <button
              className="panel-close"
              onClick={() => {
                setSelectedId(null);
                setIsLinkMode(false);
              }}
            >
              <X size={18} />
            </button>
            <h2 className="panel-title">
              Reserve {primaryTable.label} {linkedIds.map((id) => ` + T${id}`)}
              {(primaryTable.id === 1 ||
                primaryTable.id === 10 ||
                linkedIds.includes(1) ||
                linkedIds.includes(10)) && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "#e63946",
                    marginLeft: "5px",
                    fontWeight: "600",
                  }}
                >
                  (T1/T10 cannot be combined)
                </span>
              )}
            </h2>

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
                <Clock size={14} /> Occupied Slots for{" "}
                {resDate || "selected date"}
              </h4>

              <div className="schedule-list">
                {tableSchedule.length > 0 ? (
                  tableSchedule
                    .filter((res) => {
                      if (resDate === todayStr) {
                        const now = new Date();
                        const currentMins =
                          now.getHours() * 60 + now.getMinutes();
                        return timeToMinutes(res.endTime) > currentMins;
                      }
                      return true;
                    })
                    .map((res, index) => (
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
                        <div style={{ fontSize: "10px", color: "#888" }}>
                          Status: {res.status}
                        </div>
                      </div>
                    ))
                ) : (
                  <p style={{ fontSize: "11px", color: "#2a9d8f" }}>
                    No reservations. All slots are available.
                  </p>
                )}
                {resDate === todayStr &&
                  tableSchedule.length > 0 &&
                  tableSchedule.filter(
                    (r) =>
                      timeToMinutes(r.endTime) >
                      new Date().getHours() * 60 + new Date().getMinutes(),
                  ).length === 0 && (
                    <p style={{ fontSize: "11px", color: "#2a9d8f" }}>
                      No remaining reservations for today.
                    </p>
                  )}
              </div>
            </div>

            <div className="res-form">
              <button
                className={`btn-link-mode ${isLinkMode ? "active" : ""}`}
                onClick={() => setIsLinkMode(!isLinkMode)}
              >
                {isLinkMode ? "Done Linking" : "Link Tables"}
              </button>

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
              {/* FIRST NAME */}
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
              {/* LAST NAME */}
              <div className="input-group">
                <label>LAST NAME</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              {/* EMAIL ADDRESS */}
              <div className="input-group">
                <label>EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              {/* CONTACT NUMBER */}
              <div className="input-group">
                <label>CONTACT NUMBER</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                />
              </div>
              {/* LOCATION SELECTION */}
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
              {/* GUEST COUNT */}
              <div className="input-group">
                <label>GUESTS (MAX {totalSeats})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1"
                  value={guestCount}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val === "") {
                      setGuestCount("");
                      return;
                    }
                    let num = parseInt(val, 10);
                    if (num > totalSeats) num = totalSeats;
                    if (num < 1 && val !== "") num = 1;
                    setGuestCount(num);
                  }}
                />
              </div>
              {/* HIGH CHAIR SECTION */}
              <div className="input-group">
                <label>
                  <Baby size={12} /> HIGH CHAIR NEEDED?
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    marginTop: "8px",
                    padding: "5px 0",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      cursor: "pointer",
                      color: "#555",
                    }}
                  >
                    <input
                      type="radio"
                      name="highChair"
                      value="Yes"
                      checked={highChair === "Yes"}
                      onChange={(e) => setHighChair(e.target.value)}
                      style={{ accentColor: "#f38d31" }} // Matches your orange theme
                    />
                    Yes
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      cursor: "pointer",
                      color: "#555",
                    }}
                  >
                    <input
                      type="radio"
                      name="highChair"
                      value="No"
                      checked={highChair === "No"}
                      onChange={(e) => setHighChair(e.target.value)}
                      style={{ accentColor: "#f38d31" }}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="input-group">
                <label>ALLERGY</label>
                <select
                  className="res-input-dropdown"
                  value={allergy}
                  onChange={(e) => {
                    setAllergy(e.target.value);
                    if (e.target.value !== "Other") setOtherAllergy("");
                  }}
                >
                  <option value="No Allergy">No Allergy</option>
                  <option value="Peanuts">Peanuts</option>
                  <option value="Seafood">Seafood</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Other">Other</option>
                </select>
                {allergy === "Other" && (
                  <input
                    type="text"
                    className="res-input fade-in"
                    style={{ marginTop: "10px", borderColor: "#f38d31" }}
                    placeholder="Specify allergy"
                    value={otherAllergy}
                    onChange={(e) => setOtherAllergy(e.target.value)}
                  />
                )}
              </div>

              <div className="input-group">
                <label>PACKAGES WE'RE OFFERING</label>
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

              {error && (
                <p
                  className="error-message"
                  style={{ color: "red", fontSize: "11px" }}
                >
                  {error}
                </p>
              )}

              <button
                className={`btn-confirm ${isFormInvalid ? "btn-disabled" : ""}`}
                onClick={() => setIsTermsOpen(true)}
                disabled={isFormInvalid || loading}
              >
                {loading ? "Processing..." : "Confirm Reservation"}
              </button>
            </div>
          </div>
        )}
      </aside>

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={handleAcceptTerms}
      />

      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectedItemsChange={(items) => setSelectedItems(items)}
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

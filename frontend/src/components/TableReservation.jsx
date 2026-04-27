import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  UtensilsCrossed,
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

const API_BASE = "http://localhost:5000/api";
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

// --- UTILITIES ---
const timeToMin = (t) => {
  if (!t) return 0;
  const [time, period] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

const formatTime = (timeStr) => {
  if (!timeStr || timeStr.includes("AM") || timeStr.includes("PM"))
    return timeStr || "";
  const parts = timeStr.split(":");
  let hours = parseInt(parts[0], 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${parts[1]} ${ampm}`;
};

// Helper function to get schedule item class based on status
const getScheduleItemClass = (status) => {
  if (status === "Seated") return "occupied";
  if (status === "Confirmed" || status === "Pending") return "reserved";
  return "";
};

// Helper function to get status display text
const getStatusDisplayText = (status) => {
  if (status === "Seated") return "OCCUPIED";
  if (status === "Confirmed") return "CONFIRMED";
  if (status === "Pending") return "PENDING";
  return status.toUpperCase();
};

export default function TableReservation({ onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(null);
  const [linkedIds, setLinkedIds] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLinkMode, setIsLinkMode] = useState(false);

  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    highChair: "No",
    muni: "",
    brgy: "",
  });
  const [addressData, setAddressData] = useState({
    municipalities: [],
    barangays: [],
  });
  const [user, setUser] = useState({
    firstName: localStorage.getItem("firstName") || "",
    lastName: localStorage.getItem("lastName") || "",
    email: localStorage.getItem("email") || "",
    phone: "09",
  });

  const [data, setData] = useState({ occupied: {}, schedule: [] });
  const [tableSchedules, setTableSchedules] = useState({});
  const [ui, setUi] = useState({
    loading: false,
    editing: false,
    menu: false,
    summary: false,
    terms: false,
  });

  const todayStr = new Date(new Date() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  // --- API DATA ---
  useEffect(() => {
    axios
      .get(`${API_BASE}/address/municipalities`)
      .then((res) =>
        setAddressData((prev) => ({
          ...prev,
          municipalities: Array.isArray(res.data)
            ? res.data
            : res.data.data || [],
        })),
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (form.muni) {
      axios
        .get(`${API_BASE}/address/barangays/${form.muni}`)
        .then((res) =>
          setAddressData((prev) => ({
            ...prev,
            barangays: Array.isArray(res.data) ? res.data : [],
          })),
        )
        .catch(console.error);
    }
  }, [form.muni]);

  // Fetch schedules for all tables when date changes
  useEffect(() => {
    const fetchAllTableSchedules = async () => {
      if (!form.date) return;

      const schedules = {};
      for (const table of TABLES_DATA) {
        try {
          const response = await axios.get(
            `${API_BASE}/reservations/table-schedule`,
            {
              params: { tableId: table.id, date: form.date },
            },
          );
          schedules[table.id] = Array.isArray(response.data)
            ? response.data
            : [];
        } catch (error) {
          console.error(
            `Error fetching schedule for table ${table.id}:`,
            error,
          );
          schedules[table.id] = [];
        }
      }
      setTableSchedules(schedules);
    };

    fetchAllTableSchedules();
  }, [form.date]);

  // REAL-TIME POLLING (5s)
  useEffect(() => {
    const poll = async () => {
      if (!form.date) return;
      try {
        const [statRes, schedRes] = await Promise.all([
          axios.get(`${API_BASE}/reservations/table-statuses`, {
            params: {
              date: form.date,
              startTime: form.startTime || "00:00",
              endTime: form.endTime || "23:59",
            },
          }),
          selectedId
            ? axios.get(`${API_BASE}/reservations/table-schedule`, {
                params: { tableId: selectedId, date: form.date },
              })
            : { data: [] },
        ]);
        setData({
          occupied: statRes.data || {},
          schedule: Array.isArray(schedRes.data) ? schedRes.data : [],
        });
      } catch (e) {
        console.error(e);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [form.date, form.startTime, form.endTime, selectedId]);

  // --- CALCULATIONS ---
  const primaryTable = useMemo(
    () => TABLES_DATA.find((t) => t.id === selectedId),
    [selectedId],
  );

  // Check if a table is available for the selected time slot
  const isTableAvailableForTime = (tableId, startTime, endTime) => {
    const schedule = tableSchedules[tableId] || [];
    const startM = timeToMin(startTime);
    const endM = timeToMin(endTime);

    return !schedule.some(
      (r) =>
        r.status !== "Done" &&
        r.status !== "Completed" &&
        startM < timeToMin(r.endTime) &&
        endM > timeToMin(r.startTime),
    );
  };

  // Filter available tables for linking based on time compatibility
  const getAvailableTablesForLinking = () => {
    if (!form.startTime || !form.endTime) return [];

    return TABLES_DATA.filter(
      (table) =>
        table.id !== selectedId &&
        !linkedIds.includes(table.id) &&
        isTableAvailableForTime(table.id, form.startTime, form.endTime),
    );
  };

  const totalSeats = useMemo(() => {
    if (!selectedId) return 0;
    return (
      (primaryTable?.seats || 0) +
      TABLES_DATA.filter((t) => linkedIds.includes(t.id)).reduce(
        (sum, t) => sum + t.seats,
        0,
      )
    );
  }, [selectedId, linkedIds, primaryTable]);

  const orderSummary = useMemo(() => {
    const total = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    return {
      totalOrderPrice: total,
      downpayment: total * 0.2,
      balance: total * 0.8,
    };
  }, [selectedItems]);

  const fullReservationData = useMemo(
    () => ({
      ...user,
      ...form,
      guestCount: totalSeats,
      tableLabel: primaryTable?.label,
      linkedTables: linkedIds.map(
        (id) => TABLES_DATA.find((t) => t.id === id)?.label,
      ),
      packages: selectedItems,
      resDate: form.date,
      municipality:
        addressData.municipalities.find((m) => m.code === form.muni)?.name ||
        "",
      barangay:
        addressData.barangays.find((b) => b.code === form.brgy)?.name || "",
    }),
    [
      user,
      form,
      totalSeats,
      primaryTable,
      linkedIds,
      selectedItems,
      addressData,
    ],
  );

  const timeOptions = useMemo(() => {
    const opts = [];
    for (let h = 10; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 22 && m > 0) break;
        const hour12 = h % 12 || 12;
        const period = h < 12 ? "AM" : "PM";
        opts.push(
          `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`,
        );
      }
    }
    return opts;
  }, []);

  const availableStartTimeOptions = useMemo(() => {
    let filtered = timeOptions;
    if (form.date === todayStr) {
      const thresh = new Date().getHours() * 60 + new Date().getMinutes() + 15;
      filtered = filtered.filter((t) => timeToMin(t) >= thresh);
    }
    return filtered.filter((t) => {
      const m = timeToMin(t);
      return !data.schedule.some(
        (r) =>
          r.status !== "Done" &&
          r.status !== "Completed" &&
          m >= timeToMin(r.startTime) &&
          m < timeToMin(r.endTime),
      );
    });
  }, [timeOptions, data.schedule, form.date, todayStr]);

  const filteredEndTimeOptions = useMemo(() => {
    if (!form.startTime) return [];
    const startM = timeToMin(form.startTime);
    return timeOptions.filter((t) => timeToMin(t) >= startM + 60);
  }, [form.startTime, timeOptions]);

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      let val = value.replace(/\D/g, "");
      if (!val.startsWith("09")) val = "09";
      if (val.length <= 11) setUser((p) => ({ ...p, phone: val }));
    } else if (name in user) {
      setUser((prev) => ({ ...prev, [name]: value }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onTableClick = (table) => {
    const status = data.occupied[table.id];

    // In link mode, allow clicking on tables even if they have reservations
    if (isLinkMode) {
      // Don't allow linking the primary table to itself
      if (table.id === selectedId) return;

      // Check if time is selected before allowing linking
      if (!form.startTime || !form.endTime) {
        alert("Please select start time and end time first");
        return;
      }

      // Check if the table is available for the selected time slot
      if (!isTableAvailableForTime(table.id, form.startTime, form.endTime)) {
        alert(
          `This table has a reservation during the selected time slot. Please choose a different time or another table.`,
        );
        return;
      }

      setLinkedIds((prev) =>
        prev.includes(table.id)
          ? prev.filter((id) => id !== table.id)
          : [...prev, table.id],
      );
    } else {
      // Normal mode - can't select tables with existing reservations
      if (status === "Seated") return;
      setSelectedId(selectedId === table.id ? null : table.id);
      setLinkedIds([]);
    }
  };

  const isFormInvalid = useMemo(() => {
    const s = timeToMin(form.startTime),
      e = timeToMin(form.endTime);
    const conflictDetected = data.schedule.some(
      (r) =>
        r.status !== "Done" &&
        r.status !== "Completed" &&
        s < timeToMin(r.endTime) &&
        e > timeToMin(r.startTime),
    );
    const phoneValid = user.phone.length === 11 && user.phone.startsWith("09");
    const emailValid = /^\S+@\S+\.\S+$/.test(user.email);

    return (
      !selectedId ||
      !user.firstName.trim() ||
      !emailValid ||
      !phoneValid ||
      !form.date ||
      e - s < 60 ||
      selectedItems.length === 0 ||
      !form.muni ||
      !form.brgy ||
      conflictDetected
    );
  }, [user, form, data.schedule, selectedId, selectedItems]);

  const confirmBooking = async (file) => {
    setUi((p) => ({ ...p, loading: true }));
    try {
      const payload = new FormData();
      const submission = {
        ...user,
        ...form,
        guests: totalSeats,
        tableIds: JSON.stringify([selectedId, ...linkedIds]),
        selectedItems: JSON.stringify(selectedItems),
        status: "Confirmed",
        receipt: file,
      };
      Object.entries(submission).forEach(([k, v]) => payload.append(k, v));
      const res = await axios.post(`${API_BASE}/reservations/table`, payload);
      onSuccess(res.data.id);
    } catch (e) {
      console.error(e);
    } finally {
      setUi((p) => ({ ...p, loading: false }));
    }
  };

  const availableTablesForLinking = getAvailableTablesForLinking();

  return (
    <div className={`floor-plan-wrapper ${!form.date ? "init-state" : ""}`}>
      <button className="page-back-btn" onClick={onClose}>
        <ArrowLeft size={18} /> <span>Back</span>
      </button>

      {/* 1. ASIDE TAG (FORM) */}
      <aside
        className={`floor-sidebar ${!form.date ? "centered-form" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="res-panel fade-in">
          <h2 className="panel-title">
            {!form.date
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
                name="date"
                value={form.date}
                min={todayStr}
                onChange={(e) => {
                  handleInputChange(e);
                  setSelectedId(null);
                  setLinkedIds([]);
                }}
              />
            </div>

            {form.date && selectedId && (
              <>
                <div className="table-schedule-section">
                  <h4 className="schedule-header">
                    <Clock size={14} /> Occupied Slots for {primaryTable?.label}
                  </h4>
                  <div className="schedule-list">
                    {data.schedule.filter(
                      (r) => r.status !== "Done" && r.status !== "Completed",
                    ).length > 0 ? (
                      data.schedule
                        .filter(
                          (r) =>
                            r.status !== "Done" && r.status !== "Completed",
                        )
                        .map((res, i) => (
                          <div
                            key={i}
                            className={`schedule-item-3d ${getScheduleItemClass(res.status)}`}
                          >
                            <Clock size={12} />
                            <span className="schedule-time">
                              {formatTime(res.startTime)} -{" "}
                              {formatTime(res.endTime)}
                            </span>
                            <span className="schedule-status">
                              {getStatusDisplayText(res.status)}
                            </span>
                          </div>
                        ))
                    ) : (
                      <p className="no-res-text">Available all day</p>
                    )}
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>
                      <Clock size={12} /> START
                    </label>
                    <select
                      name="startTime"
                      className="res-input-dropdown"
                      value={form.startTime}
                      onChange={(e) => {
                        handleInputChange(e);
                        // Clear linked tables when time changes
                        setLinkedIds([]);
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
                      name="endTime"
                      value={form.endTime}
                      onChange={(e) => {
                        handleInputChange(e);
                        // Clear linked tables when time changes
                        setLinkedIds([]);
                      }}
                      disabled={!form.startTime}
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
                      className={`edit-toggle-icon ${ui.editing ? "active" : ""}`}
                      onClick={() =>
                        setUi((p) => ({ ...p, editing: !p.editing }))
                      }
                    />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={user.firstName}
                    onChange={handleInputChange}
                    disabled={!ui.editing}
                  />
                </div>
                <div className="input-group">
                  <label>LAST NAME</label>
                  <input
                    type="text"
                    name="lastName"
                    value={user.lastName}
                    onChange={handleInputChange}
                    disabled={!ui.editing}
                  />
                </div>
                <div className="input-group">
                  <label>
                    <Mail size={12} /> EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={user.email}
                    onChange={handleInputChange}
                    disabled={!ui.editing}
                  />
                </div>
                <div className="input-group">
                  <label>
                    <Phone size={12} /> CONTACT
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={user.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>
                      <MapPin size={12} /> CITY
                    </label>
                    <select
                      name="muni"
                      className="res-input-dropdown"
                      value={form.muni}
                      onChange={handleInputChange}
                    >
                      <option value="">Select City</option>
                      {addressData.municipalities.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>
                      <MapPin size={12} /> BRGY
                    </label>
                    <select
                      name="brgy"
                      className="res-input-dropdown"
                      value={form.brgy}
                      onChange={handleInputChange}
                      disabled={!form.muni}
                    >
                      <option value="">Select Brgy</option>
                      {addressData.barangays.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>GUESTS</label>
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
                          name="highChair"
                          value={opt}
                          checked={form.highChair === opt}
                          onChange={handleInputChange}
                        />{" "}
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
                    onClick={() => setUi((p) => ({ ...p, menu: true }))}
                  >
                    <Layers size={16} />{" "}
                    {selectedItems.length > 0
                      ? `${selectedItems.length} Selected`
                      : "View Packages"}
                  </button>
                  {selectedItems.length > 0 && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "12px",
                        backgroundColor: "#fff9f4",
                        border: "1px solid #fbd7b5",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Total:</span>
                        <strong>
                          ₱{orderSummary.totalOrderPrice.toFixed(2)}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          borderTop: "1px dashed #fbd7b5",
                          marginTop: "5px",
                          paddingTop: "5px",
                        }}
                      >
                        <span style={{ color: "#f38d31", fontWeight: "800" }}>
                          Downpayment (20%):
                        </span>
                        <strong style={{ color: "#f38d31" }}>
                          ₱{orderSummary.downpayment.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className={`btn-confirm ${isFormInvalid ? "btn-disabled" : ""}`}
                  onClick={() => setUi((p) => ({ ...p, terms: true }))}
                  disabled={isFormInvalid}
                >
                  Confirm
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN SECTION (TABLES) */}
      {form.date && (
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
                onClick={() => {
                  setIsLinkMode(!isLinkMode);
                  if (!isLinkMode && (!form.startTime || !form.endTime)) {
                    alert(
                      "Please select start time and end time before linking tables",
                    );
                  }
                }}
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

              {isLinkMode && form.startTime && form.endTime && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#f0f5ff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    textAlign: "center",
                  }}
                >
                  <strong>Available tables for linking:</strong>{" "}
                  {availableTablesForLinking.length} tables available
                  <br />
                  <small>
                    Only tables with no time conflict during {form.startTime} -{" "}
                    {form.endTime} can be linked
                  </small>
                </div>
              )}
            </div>
          )}
          <div className="table-selection-grid">
            {TABLES_DATA.map((t) => {
              const status = data.occupied[t.id];
              const isSelected = selectedId === t.id;
              const isLinked = linkedIds.includes(t.id);

              // Check if table has existing reservation status
              const hasReservation =
                status === "Confirmed" || status === "Pending";
              const isOccupied = status === "Seated";

              // Check if table is available for linking (only relevant in link mode)
              const isAvailableForLinking =
                isLinkMode &&
                form.startTime &&
                form.endTime &&
                isTableAvailableForTime(t.id, form.startTime, form.endTime) &&
                t.id !== selectedId &&
                !linkedIds.includes(t.id);

              // Determine card class - priority: selected > linked > reservation status
              let cardCls = "";
              if (isSelected) {
                cardCls = "selected";
              } else if (isLinked) {
                cardCls = "linked";
              } else if (!isLinkMode && hasReservation) {
                cardCls = "reserved";
              } else if (!isLinkMode && isOccupied) {
                cardCls = "occupied";
              } else {
                cardCls = "available";
              }

              // Determine dot class - show actual status even in link mode
              let dotCls = "available";
              if (isOccupied) {
                dotCls = "occupied";
              } else if (hasReservation) {
                dotCls = "reserved";
              }

              // In link mode, if table is not available for linking (time conflict), show as disabled
              const isDisabledInLinkMode =
                isLinkMode &&
                !isAvailableForLinking &&
                !isLinked &&
                t.id !== selectedId &&
                form.startTime &&
                form.endTime;

              return (
                <div
                  key={t.id}
                  className={`table-list-card ${cardCls}`}
                  onClick={() => onTableClick(t)}
                  style={{
                    opacity: isDisabledInLinkMode ? 0.5 : 1,
                    cursor: isDisabledInLinkMode ? "not-allowed" : "pointer",
                  }}
                >
                  <div className="table-card-content">
                    <div className="table-details">
                      <div className="table-title-row">
                        <Armchair size={16} />
                        <strong className="table-label-text">{t.label}</strong>
                      </div>
                      <span className="table-seats-text">{t.seats} Seats</span>
                    </div>
                  </div>
                  <div className={`status-dot ${dotCls}`} />
                </div>
              );
            })}
          </div>
          <div className="floor-legend-horizontal">
            {["available", "reserved", "occupied"].map((l) => (
              <div key={l} className="legend-item">
                <span className={`dot ${l}`}></span>{" "}
                {l === "occupied"
                  ? "Occupied (Ongoing)"
                  : l.charAt(0).toUpperCase() + l.slice(1)}
              </div>
            ))}
            {isLinkMode && (
              <div className="legend-item">
                <span
                  className="dot"
                  style={{ backgroundColor: "#3a86ff" }}
                ></span>{" "}
                Linked
              </div>
            )}
          </div>
        </div>
      )}

      <MenuModal
        isOpen={ui.menu}
        onClose={() => setUi((p) => ({ ...p, menu: false }))}
        onSelectedItemsChange={setSelectedItems}
        initialSelectedItems={selectedItems}
      />
      <TermsModal
        isOpen={ui.terms}
        onClose={() => setUi((p) => ({ ...p, terms: false }))}
        onAccept={() => {
          setUi((p) => ({ ...p, terms: false, summary: true }));
        }}
      />
      <ReservationSummary
        isOpen={ui.summary}
        onClose={() => setUi((p) => ({ ...p, summary: false }))}
        orderSummary={orderSummary}
        reservationData={fullReservationData}
        onConfirm={confirmBooking}
        loading={ui.loading}
      />
    </div>
  );
}

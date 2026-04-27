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

const timeToMin = (t) => {
  if (!t) return 0;
  const [time, period] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

const formatTime = (t) => {
  if (!t || t.includes("AM") || t.includes("PM")) return t || "";
  let [h, m] = t.split(":");
  let hours = parseInt(h, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${m} ${ampm}`;
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

  // --- ERROR VALIDATION LOGIC ---
  const fieldErrors = useMemo(() => {
    const errors = {};
    if (form.date && form.date < todayStr)
      errors.date = "Date cannot be in the past";
    if (form.startTime && form.endTime) {
      if (timeToMin(form.endTime) - timeToMin(form.startTime) < 60)
        errors.time = "Minimum 1 hour required";
    }
    if (user.email && !/^\S+@\S+\.\S+$/.test(user.email))
      errors.email = "Invalid email address";
    if (
      user.phone.length > 2 &&
      (user.phone.length !== 11 || !user.phone.startsWith("09"))
    )
      errors.phone = "Must be 11 digits starting with 09";
    return errors;
  }, [
    form.date,
    form.startTime,
    form.endTime,
    user.email,
    user.phone,
    todayStr,
  ]);

  const errorTextStyle = {
    color: "#e63946",
    fontSize: "10px",
    fontWeight: "bold",
    marginTop: "2px",
    marginLeft: "5px",
  };

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

  const totalSeats = useMemo(() => {
    if (!selectedId) return 0;
    const primary = TABLES_DATA.find((t) => t.id === selectedId);
    return (
      (primary?.seats || 0) +
      TABLES_DATA.filter((t) => linkedIds.includes(t.id)).reduce(
        (sum, t) => sum + t.seats,
        0,
      )
    );
  }, [selectedId, linkedIds]);

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
      tableLabel: TABLES_DATA.find((t) => t.id === selectedId)?.label,
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
    [user, form, totalSeats, selectedId, linkedIds, selectedItems, addressData],
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      let val = value.replace(/\D/g, "");
      if (!val.startsWith("09")) val = "09";
      if (val.length <= 11) setUser((p) => ({ ...p, phone: val }));
      return;
    }
    if (name in user) setUser((prev) => ({ ...prev, [name]: value }));
    else setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isFormInvalid = useMemo(() => {
    const s = timeToMin(form.startTime),
      e = timeToMin(form.endTime);
    const hasConflict = data.schedule.some(
      (r) =>
        r.status !== "Done" &&
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
      hasConflict
    );
  }, [user, form, data.schedule, selectedId, selectedItems]);

  return (
    <div className={`floor-plan-wrapper ${!form.date ? "init-state" : ""}`}>
      <button className="page-back-btn" onClick={onClose}>
        <ArrowLeft size={18} /> <span>Back</span>
      </button>

      <aside
        className={`floor-sidebar ${!form.date ? "centered-form" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="res-panel fade-in">
          <h2 className="panel-title">
            {!form.date
              ? "Select Reservation Date"
              : selectedId
                ? "Reservation Form"
                : "Select a Table"}
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
                }}
              />
              {fieldErrors.date && (
                <span style={errorTextStyle}>{fieldErrors.date}</span>
              )}
            </div>

            {form.date && selectedId && (
              <>
                <div className="table-schedule-section">
                  <h4 className="schedule-header">
                    <Clock size={14} /> Occupied Slots for{" "}
                    {fullReservationData.tableLabel}
                  </h4>
                  <div className="schedule-list">
                    {data.schedule.filter((r) => r.status !== "Done").length >
                    0 ? (
                      data.schedule
                        .filter((r) => r.status !== "Done")
                        .map((res, i) => (
                          <div key={i} className="schedule-item-3d">
                            <Clock size={12} /> {formatTime(res.startTime)} -{" "}
                            {formatTime(res.endTime)}
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
                      onChange={handleInputChange}
                    >
                      <option value="">--:-- --</option>
                      {timeOptions
                        .filter(
                          (t) =>
                            form.date !== todayStr ||
                            timeToMin(t) >=
                              new Date().getHours() * 60 +
                                new Date().getMinutes() +
                                15,
                        )
                        .map((t) => (
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
                      onChange={handleInputChange}
                      disabled={!form.startTime}
                    >
                      <option value="">--:-- --</option>
                      {timeOptions
                        .filter(
                          (t) => timeToMin(t) >= timeToMin(form.startTime) + 60,
                        )
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                {fieldErrors.time && (
                  <span style={errorTextStyle}>{fieldErrors.time}</span>
                )}

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
                  {!user.firstName.trim() && (
                    <span style={errorTextStyle}>First name is required</span>
                  )}
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
                  {!user.lastName.trim() && (
                    <span style={errorTextStyle}>Last name is required</span>
                  )}
                </div>
                <div className="input-group">
                  <label>
                    <Mail size={12} /> EMAIL
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={user.email}
                    onChange={handleInputChange}
                    disabled={!ui.editing}
                  />
                  {fieldErrors.email && (
                    <span style={errorTextStyle}>{fieldErrors.email}</span>
                  )}
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
                  {fieldErrors.phone && (
                    <span style={errorTextStyle}>{fieldErrors.phone}</span>
                  )}
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
                {(!form.muni || !form.brgy) && (
                  <span style={errorTextStyle}>Address is required</span>
                )}

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
                  <label>PACKAGES WE'RE OFFERING</label>
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
                  {selectedItems.length === 0 && (
                    <span style={errorTextStyle}>
                      Please select at least one package
                    </span>
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
            {TABLES_DATA.map((t) => {
              const status = data.occupied[t.id];
              let cls =
                status === "Confirmed" || status === "Seated"
                  ? "occupied"
                  : status === "Pending"
                    ? "reserved"
                    : selectedId === t.id
                      ? "selected"
                      : linkedIds.includes(t.id)
                        ? "linked"
                        : "available";
              return (
                <div
                  key={t.id}
                  className={`table-list-card ${cls}`}
                  onClick={() => {
                    if (["Confirmed", "Seated", "Pending"].includes(status)) {
                      setSelectedId(t.id);
                      setLinkedIds([]);
                      return;
                    }
                    if (isLinkMode) {
                      if (t.id === selectedId) return;
                      setLinkedIds((prev) =>
                        prev.includes(t.id)
                          ? prev.filter((id) => id !== t.id)
                          : [...prev, t.id],
                      );
                    } else {
                      setSelectedId(selectedId === t.id ? null : t.id);
                      setLinkedIds([]);
                    }
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
                  <div className={`status-dot ${cls}`} />
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
        onAccept={() => setUi((p) => ({ ...p, terms: false, summary: true }))}
      />
      <ReservationSummary
        isOpen={ui.summary}
        onClose={() => setUi((p) => ({ ...p, summary: false }))}
        orderSummary={orderSummary}
        reservationData={fullReservationData}
        onConfirm={onSuccess}
        loading={ui.loading}
      />
    </div>
  );
}

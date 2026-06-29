// TableReservation.jsx
import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Layers,
  Baby,
  Armchair,
  Mail,
  Phone,
  Link as LinkIcon,
  AlertCircle,
  PartyPopper,
} from "lucide-react";
import "../Style/TableReservation.css";
import { useToast } from "./ToastContext";
import PackageModal from "./PackageModal";
import ReservationSummary from "./ReservationSummary";
import TermsModal from "./TermsModal";
import {
  TABLES_DATA,
  ALLERGY_OPTIONS,
  OCCASION_OPTIONS,
} from "./TableReservationConstants";
import {
  sanitizeStringInput,
  timeToMin,
  formatTime,
  getScheduleItemClass,
  getStatusDisplayText,
  isReservationOngoing,
} from "./TableReservationUtils";
import {
  LoadingSpinner,
  DateLoadingSpinner,
  FormLoadingSpinner,
} from "./TableReservationSpinners";
import { useSocket, useAddressData } from "./TableReservationHooks";

const API_BASE = "https://yokaku-backend.onrender.com/api";

export default function TableReservation({ onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(null);
  const { showToast } = useToast();
  const [linkedIds, setLinkedIds] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [showOngoingWarning, setShowOngoingWarning] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [blockedDates, setBlockedDates] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDateLoading, setIsDateLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true); // New state for form loading
  const [tableSchedules, setTableSchedules] = useState({});
  const [data, setData] = useState({ occupied: {}, schedule: [] });

  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    muni: "",
    brgy: "",
    allergy: "",
    customAllergy: "",
    occasion: "",
    customOccasion: "",
  });

  const [user, setUser] = useState({
    firstName: localStorage.getItem("firstName") || "",
    lastName: localStorage.getItem("lastName") || "",
    email: localStorage.getItem("email") || "",
    phone: "09",
  });

  const [ui, setUi] = useState({
    loading: false,
    editing: false,
    menu: false,
    summary: false,
    terms: false,
  });

  const socket = useSocket();
  const { addressData, fetchBarangays } = useAddressData();

  const todayStr = new Date().toLocaleDateString("en-CA");

  // Simulate initial loading of the form
  useEffect(() => {
    // Show loading spinner for 1 second when component mounts
    const timer = setTimeout(() => {
      setIsFormLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Fetch barangays when municipality changes
  useEffect(() => {
    if (form.muni) {
      fetchBarangays(form.muni);
    }
  }, [form.muni, fetchBarangays]);

  // Fetch schedules for all tables when date changes
  useEffect(() => {
    const fetchAllTableSchedules = async () => {
      if (!form.date) return;
      setIsDateLoading(true);
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
          schedules[table.id] = [];
        }
      }
      setTableSchedules(schedules);
      setIsDateLoading(false);
    };
    fetchAllTableSchedules();
  }, [form.date]);

  // Fetch blocked dates
  useEffect(() => {
    axios
      .get(`${API_BASE}/admin/blocked-dates`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          const formatted = res.data.map((h) => {
            const d = new Date(h.block_date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          });
          setBlockedDates(formatted);
        }
      })
      .catch(console.error);
  }, []);

  // REAL-TIME POLLING
  useEffect(() => {
    const poll = async () => {
      if (!form.date) return;
      try {
        const statRes = await axios.get(
          `${API_BASE}/reservations/table-statuses`,
          {
            params: {
              date: form.date,
              startTime: form.startTime || "00:00",
              endTime: form.endTime || "23:59",
            },
          },
        );

        let schedRes = { data: [] };
        if (selectedId && form.date) {
          try {
            schedRes = await axios.get(
              `${API_BASE}/reservations/table-schedule`,
              {
                params: { tableId: selectedId, date: form.date },
              },
            );
          } catch (error) {
            schedRes = { data: [] };
          }
        }

        const processedSchedule = (schedRes.data || [])
          .filter((res) => res.status !== "Done" && res.status !== "Completed")
          .map((res) => {
            const processed = { ...res };
            if (
              (processed.status === "Confirmed" ||
                processed.status === "Pending") &&
              isReservationOngoing(processed.startTime, processed.endTime)
            ) {
              processed.status = "Ongoing";
            }
            return processed;
          });

        setData({ occupied: statRes.data || {}, schedule: processedSchedule });
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    poll();
    const pollInterval = setInterval(poll, 10000);
    return () => clearInterval(pollInterval);
  }, [form.date, form.startTime, form.endTime, selectedId]);

  const primaryTable = useMemo(
    () => TABLES_DATA.find((t) => t.id === selectedId),
    [selectedId],
  );

  const hasActiveReservationForTable = (tableId) => {
    const schedule = tableSchedules[tableId] || [];
    return schedule.length > 0;
  };

  const hasOngoingReservation = (tableId) => {
    const schedule = tableSchedules[tableId] || [];
    return schedule.some((r) => {
      const isOngoing = isReservationOngoing(r.startTime, r.endTime);
      return (
        (r.status === "Confirmed" ||
          r.status === "Pending" ||
          r.status === "Seated") &&
        isOngoing
      );
    });
  };

  const isTableAvailableForTime = (tableId, startTime, endTime) => {
    const schedule = tableSchedules[tableId] || [];
    const startM = timeToMin(startTime);
    const endM = timeToMin(endTime);
    return !schedule.some(
      (r) => startM < timeToMin(r.endTime) && endM > timeToMin(r.startTime),
    );
  };

  const handleDateSelection = (e) => {
    const selectedDate = e.target.value;
    if (blockedDates.includes(selectedDate)) {
      showToast("We are sorry, but the restaurant is closed on this date.");
      setForm((prev) => ({ ...prev, date: "" }));
      e.target.value = "";
      return true;
    } else {
      handleInputChange(e);
      return false;
    }
  };

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
    const rawTotal = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const total = Math.round(rawTotal * 100) / 100;
    return {
      totalOrderPrice: total,
      downpayment: Math.round(total * 0.2 * 100) / 100,
      balance: Math.round(total * 0.8 * 100) / 100,
    };
  }, [selectedItems]);

  const tableIdsArray = useMemo(
    () => [selectedId, ...linkedIds].filter((id) => id !== null),
    [selectedId, linkedIds],
  );

  const productDisplayName = useMemo(() => {
    if (selectedItems.length === 0) return "Table Reservation";
    if (selectedItems.length === 1) return selectedItems[0].name;
    return `${selectedItems[0].name} + ${selectedItems.length - 1} more`;
  }, [selectedItems]);

  const getFinalAllergy = useMemo(() => {
    if (form.allergy === "Other" && form.customAllergy)
      return `Other: ${form.customAllergy}`;
    return form.allergy || "None";
  }, [form.allergy, form.customAllergy]);

  const getFinalOccasion = useMemo(() => {
    if (form.occasion === "Other" && form.customOccasion)
      return `Other: ${form.customOccasion}`;
    return form.occasion || "Casual Dining";
  }, [form.occasion, form.customOccasion]);

  const fullReservationData = useMemo(
    () => ({
      ...user,
      ...form,
      userId: localStorage.getItem("userId"),
      guestCount: totalSeats,
      tableLabel: primaryTable?.label,
      linkedTables: linkedIds.map(
        (id) => TABLES_DATA.find((t) => t.id === id)?.label,
      ),
      selectedItems: selectedItems,
      packages: selectedItems,
      resDate: form.date,
      amount: orderSummary.downpayment,
      totalAmount: orderSummary.totalOrderPrice,
      downpayment: orderSummary.downpayment,
      paymentMethod: paymentMethod || "Gcash",
      municipality:
        addressData.municipalities.find((m) => m.code === form.muni)?.name ||
        "",
      barangay:
        addressData.barangays.find((b) => b.code === form.brgy)?.name || "",
      allergy: getFinalAllergy,
      occasion: getFinalOccasion,
    }),
    [
      user,
      form,
      totalSeats,
      primaryTable,
      linkedIds,
      selectedItems,
      orderSummary,
      paymentMethod,
      addressData,
      getFinalAllergy,
      getFinalOccasion,
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
    return filtered.filter((startTime) => {
      const startM = timeToMin(startTime);
      const endM = startM + 60;
      return !data.schedule.some((reservation) => {
        const resStartM = timeToMin(reservation.startTime);
        const resEndM = timeToMin(reservation.endTime);
        return startM < resEndM && endM > resStartM;
      });
    });
  }, [timeOptions, data.schedule, form.date, todayStr]);

  const filteredEndTimeOptions = useMemo(() => {
    if (!form.startTime) return [];
    const startM = timeToMin(form.startTime);
    return timeOptions.filter((endTime) => {
      const endM = timeToMin(endTime);
      if (endM < startM + 60) return false;
      return !data.schedule.some((reservation) => {
        const resStartM = timeToMin(reservation.startTime);
        const resEndM = timeToMin(reservation.endTime);
        return startM < resEndM && endM > resStartM;
      });
    });
  }, [form.startTime, timeOptions, data.schedule]);

  // Validation
  const isFirstNameValid = user.firstName && user.firstName.trim().length > 0;
  const isLastNameValid = user.lastName && user.lastName.trim().length > 0;
  const isEmailValid = /^\S+@\S+\.\S+$/.test(user.email);
  const isPhoneValid = user.phone.length === 11 && user.phone.startsWith("09");
  const isDateValid = form.date && form.date !== "";
  const isStartTimeValid = form.startTime && form.startTime !== "";
  const isEndTimeValid = form.endTime && form.endTime !== "";
  const isTimeValid = (() => {
    if (!form.startTime || !form.endTime) return false;
    const s = timeToMin(form.startTime);
    const e = timeToMin(form.endTime);
    return e - s >= 60;
  })();
  const isMuniValid = form.muni && form.muni !== "";
  const isBrgyValid = form.brgy && form.brgy !== "";
  const hasSelectedItems = selectedItems.length > 0;
  const hasNoConflict = !data.schedule.some((r) => {
    const s = timeToMin(form.startTime);
    const e = timeToMin(form.endTime);
    return s < timeToMin(r.endTime) && e > timeToMin(r.startTime);
  });

  const isFormInvalid = useMemo(() => {
    return (
      !selectedId ||
      !isFirstNameValid ||
      !isLastNameValid ||
      !isEmailValid ||
      !isPhoneValid ||
      !isDateValid ||
      !isStartTimeValid ||
      !isEndTimeValid ||
      !isTimeValid ||
      !hasSelectedItems ||
      !isMuniValid ||
      !isBrgyValid ||
      !hasNoConflict
    );
  }, [
    selectedId,
    isFirstNameValid,
    isLastNameValid,
    isEmailValid,
    isPhoneValid,
    isDateValid,
    isStartTimeValid,
    isEndTimeValid,
    isTimeValid,
    hasSelectedItems,
    isMuniValid,
    isBrgyValid,
    hasNoConflict,
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      let val = value.replace(/\D/g, "");
      if (!val.startsWith("09")) val = "09";
      if (val.length <= 11) setUser((p) => ({ ...p, phone: val }));
    } else if (name === "customAllergy" || name === "customOccasion") {
      const sanitized = sanitizeStringInput(value);
      setForm((prev) => ({ ...prev, [name]: sanitized }));
    } else if (name in user) {
      setUser((prev) => ({ ...prev, [name]: value }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onTableClick = (table) => {
    if (table.status === "maintenance") {
      showToast ("This table is currently under maintenance.");
      return;
    }

    if (isLinkMode) {
      if (table.id === selectedId) return;
      if (!form.startTime || !form.endTime) {
        showToast("Please select start time and end time first");
        return;
      }
      if (!isTableAvailableForTime(table.id, form.startTime, form.endTime)) {
        showToast("This table has a reservation during the selected time slot.");
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

  const confirmBooking = async (file, method) => {
    setIsProcessing(true);
    setUi((p) => ({ ...p, loading: true }));

    try {
      const payload = new FormData();
      const userId = localStorage.getItem("userId");

      const finalAllergy =
        form.allergy === "Other" && form.customAllergy
          ? `Other: ${form.customAllergy}`
          : form.allergy || "None";
      const finalOccasion =
        form.occasion === "Other" && form.customOccasion
          ? `Other: ${form.customOccasion}`
          : form.occasion || "Casual Dining";

      const submission = {
        ...user,
        ...form,
        userId: userId,
        guests: totalSeats,
        packageName: productDisplayName,
        totalAmount: orderSummary.totalOrderPrice,
        amount: orderSummary.downpayment,
        paymentMethod: method || paymentMethod || "Gcash",
        tableIds: JSON.stringify(tableIdsArray),
        selectedItems: JSON.stringify(selectedItems),
        status: "Confirmed",
        brgyCode: form.brgy,
        allergy: finalAllergy,
        occasion: finalOccasion,
      };

      if (file) payload.append("receipt", file);
      Object.entries(submission).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload.append(k, v);
      });

      const res = await axios.post(`${API_BASE}/reservations/table`, payload);

      if (socket) {
        socket.emit("new_reservation", {
          id: res.data.id,
          userId: userId,
          date: form.date,
          time: form.startTime,
          guests: totalSeats,
          packageName: productDisplayName,
        });
      }

      onSuccess(res.data.id);
    } catch (e) {
      console.error("Booking Error:", e.response?.data || e.message);
      showToast(e.response?.data?.message || "Table Selection Error.");
    } finally {
      setUi((p) => ({ ...p, loading: false }));
      setIsProcessing(false);
    }
  };

  const availableTablesForLinking = getAvailableTablesForLinking();

  // Show form loading spinner while initializing
  if (isFormLoading) {
    return (
      <div className="floor-plan-wrapper">
        <button className="page-back-btn" onClick={onClose}>
          <ArrowLeft size={18} /> <span>Back</span>
        </button>
        <FormLoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`floor-plan-wrapper ${!form.date ? "init-state" : ""}`}>
      {/* Loading Spinner Overlay for Booking */}
      {isProcessing && <LoadingSpinner />}

      {/* Date Loading Spinner */}
      {isDateLoading && <DateLoadingSpinner />}

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
                ? `Reserve ${primaryTable?.label}`
                : "Pick a Table"}
          </h2>
          <div className="res-form">
            <div className="input-group">
              <label>
                <Calendar size={12} /> DATE
              </label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  min={todayStr}
                  onChange={(e) => {
                    const isBlocked = handleDateSelection(e);
                    if (!isBlocked) {
                      setSelectedId(null);
                      setLinkedIds([]);
                    }
                  }}
                />
                <Calendar size={16} className="date-input-icon" />
              </div>
            </div>

            {form.date && selectedId && (
              <>
                <div className="table-schedule-section">
                  <h4 className="schedule-header">
                    <Clock size={14} /> Occupied Slots for {primaryTable?.label}
                  </h4>
                  <div className="schedule-list">
                    {data.schedule.length > 0 ? (
                      data.schedule.map((res, i) => (
                        <div
                          key={i}
                          className={`schedule-item-3d ${getScheduleItemClass(res)}`}
                        >
                          <Clock size={12} />
                          <span className="schedule-time">
                            {formatTime(res.startTime)} -{" "}
                            {formatTime(res.endTime)}
                          </span>
                          <span className="schedule-status">
                            {getStatusDisplayText(res)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="no-res-text">
                        No active reservations for this table
                      </p>
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
                      name="endTime"
                      className="res-input-dropdown"
                      value={form.endTime}
                      onChange={(e) => {
                        handleInputChange(e);
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
                    className={
                      !isFirstNameValid && user.firstName ? "input-error" : ""
                    }
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
                    className={
                      !isLastNameValid && user.lastName ? "input-error" : ""
                    }
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
                    className={!isEmailValid && user.email ? "input-error" : ""}
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
                    className={
                      !isPhoneValid && user.phone !== "09" ? "input-error" : ""
                    }
                  />
                  <small className="input-hint">
                    Must be 11 digits starting with 09
                  </small>
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

                {/* OCCASION DROPDOWN FIELD */}
                <div className="input-group">
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    <PartyPopper size={12} /> OCCASION
                  </label>
                  <select
                    name="occasion"
                    className="res-input-dropdown"
                    value={form.occasion}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1.5px solid #f2f2f2",
                      background: "#fafafa",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Select an occasion</option>
                    {OCCASION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  {form.occasion === "Other" && (
                    <input
                      type="text"
                      name="customOccasion"
                      className="custom-occasion-input"
                      placeholder="Please specify your occasion"
                      value={form.customOccasion}
                      onChange={handleInputChange}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "12px",
                        border: "1.5px solid #f2f2f2",
                        background: "#fafafa",
                        outline: "none",
                        fontSize: "14px",
                        marginTop: "10px",
                      }}
                    />
                  )}

                  <small className="input-hint">
                    Let us know if you're celebrating a special occasion
                  </small>
                </div>

                {/* ALLERGY DROPDOWN FIELD */}
                <div className="input-group">
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    <AlertCircle size={12} /> ALLERGIES / DIETARY RESTRICTIONS
                  </label>
                  <select
                    name="allergy"
                    className="res-input-dropdown"
                    value={form.allergy}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1.5px solid #f2f2f2",
                      background: "#fafafa",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Select an allergy</option>
                    {ALLERGY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  {form.allergy === "Other" && (
                    <input
                      type="text"
                      name="customAllergy"
                      className="custom-allergy-input"
                      placeholder="Please specify your allergy"
                      value={form.customAllergy}
                      onChange={handleInputChange}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "12px",
                        border: "1.5px solid #f2f2f2",
                        background: "#fafafa",
                        outline: "none",
                        fontSize: "14px",
                        marginTop: "10px",
                      }}
                    />
                  )}

                  <small className="input-hint">
                    Please select any food allergies or dietary restrictions
                  </small>
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
                    showToast (
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
              const hasAnyReservation = hasActiveReservationForTable(t.id);
              const hasOngoing = hasOngoingReservation(t.id);
              const isSelected = selectedId === t.id;
              const isLinked = linkedIds.includes(t.id);
              const showWarning = showOngoingWarning === t.id;
              const isMaintenance = t.status === "maintenance";

              let cardCls = "";
              if (isSelected) cardCls = "selected";
              else if (isLinked) cardCls = "linked";
              else if (isMaintenance) cardCls = "maintenance";
              else if (hasOngoing && !isLinkMode) cardCls = "occupied";
              else if (hasAnyReservation && !isLinkMode) cardCls = "reserved";
              else cardCls = "available";

              let dotCls = "available";
              if (isMaintenance) dotCls = "maintenance";
              else if (hasOngoing) dotCls = "occupied";
              else if (hasAnyReservation) dotCls = "reserved";

              return (
                <div
                  key={t.id}
                  className={`table-list-card ${cardCls}`}
                  onClick={() => onTableClick(t)}
                  style={{
                    cursor: isMaintenance ? "not-allowed" : "pointer",
                    position: "relative",
                    opacity: isMaintenance ? 0.7 : 1,
                  }}
                >
                  <div className="table-card-content">
                    <div className="table-details">
                      <div className="table-title-row">
                        <Armchair size={16} />
                        <strong className="table-label-text">{t.label}</strong>
                      </div>
                      <span className="table-seats-text">{t.seats} Seats</span>
                      {hasOngoing && !isLinkMode && !isMaintenance && (
                        <div className="ongoing-badge">
                          <AlertCircle size={12} />
                          <span>Ongoing Now</span>
                        </div>
                      )}
                      {hasAnyReservation &&
                        !hasOngoing &&
                        !isLinkMode &&
                        !isMaintenance && (
                          <div className="reserved-badge">
                            <Clock size={12} />
                            <span>Reserved</span>
                          </div>
                        )}
                      {isMaintenance && (
                        <div className="maintenance-badge">
                          <AlertCircle size={12} />
                          <span>Under Maintenance</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`status-dot ${dotCls}`} />
                  {showWarning && !isLinkMode && !isMaintenance && (
                    <div className="warning-tooltip">
                      <AlertCircle size={14} />
                      <span>This table has an ongoing reservation</span>
                    </div>
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
              <span className="dot reserved"></span> Reserved
            </div>
            <div className="legend-item">
              <span className="dot occupied"></span> Occupied/Ongoing
            </div>
            <div className="legend-item">
              <span className="dot maintenance"></span> Maintenance
            </div>
            <div className="legend-item">
              <span
                className="dot"
                style={{ backgroundColor: "#3a86ff" }}
              ></span>{" "}
              Selected
            </div>
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

      <PackageModal
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
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
      />
    </div>
  );
}

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
  AlertCircle,
  PartyPopper,
  Cake,
  GlassWater,
  Heart,
  Music,
} from "lucide-react";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
import "../Style/TableReservation.css";
import PackageModal from "./PackageModal";
import ReservationSummary from "./ReservationSummary";
import TermsModal from "./TermsModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TABLES_DATA = [
  { id: 1, label: "Table 1", seats: 5, status: "available" },
  { id: 2, label: "Table 2", seats: 2, status: "available" },
  { id: 3, label: "Table 3", seats: 4, status: "available" },
  { id: 4, label: "Table 4", seats: 4, status: "available" },
  { id: 5, label: "Table 5", seats: 4, status: "available" },
  { id: 6, label: "Table 6", seats: 4, status: "available" },
  { id: 7, label: "Table 7", seats: 4, status: "available" },
  { id: 8, label: "Table 8", seats: 4, status: "available" },
  { id: 9, label: "Table 9", seats: 4, status: "available" },
  { id: 10, label: "Table 10", seats: 3, status: "available" },
];

// Allergy options
const ALLERGY_OPTIONS = [
  "None",
  "Nuts",
  "Shellfish",
  "Dairy",
  "Eggs",
  "Soy",
  "Wheat/Gluten",
  "Fish",
  "Sesame",
  "Other",
];

// Occasion options
const OCCASION_OPTIONS = [
  "Casual Dining",
  "Birthday",
  "Anniversary",
  "Date Night",
  "Family Gathering",
  "Business Meeting",
  "Graduation",
  "Wedding Reception",
  "Reunion",
  "Holiday Celebration",
  "Other",
];

// Helper function to sanitize input (letters, spaces, and basic punctuation only)
const sanitizeStringInput = (value) => {
  return value.replace(/[^a-zA-Z\s\-'\.]/g, "");
};

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

// Helper function to check if a reservation is ongoing based on current time
const isReservationOngoing = (startTime, endTime) => {
  if (!startTime || !endTime) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const startM = timeToMin(startTime);
  const endM = timeToMin(endTime);

  return currentTime >= startM && currentTime <= endM;
};

// Helper function to check if a reservation is completed (should be hidden)
const isReservationCompleted = (reservation, selectedDate) => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const currentDate = now.toISOString().split("T")[0];

  if (reservation.status === "Done" || reservation.status === "Completed") {
    return true;
  }

  if (selectedDate === currentDate) {
    const endM = timeToMin(reservation.endTime);
    if (currentTime > endM) {
      return true;
    }
  }

  if (selectedDate < currentDate) {
    return true;
  }

  return false;
};

// Helper function to get schedule item class based on status and time
const getScheduleItemClass = (reservation) => {
  let status = reservation.status;

  if (
    (status === "Confirmed" || status === "Pending") &&
    isReservationOngoing(reservation.startTime, reservation.endTime)
  ) {
    return "ongoing";
  }

  if (status === "Seated") return "ongoing";
  if (status === "Confirmed" || status === "Pending") return "reserved";
  return "";
};

// Helper function to get status display text with real-time checking
const getStatusDisplayText = (reservation) => {
  let status = reservation.status;

  if (
    (status === "Confirmed" || status === "Pending") &&
    isReservationOngoing(reservation.startTime, reservation.endTime)
  ) {
    return "ONGOING";
  }

  if (status === "Seated") return "ONGOING";
  if (status === "Confirmed") return "CONFIRMED";
  if (status === "Pending") return "PENDING";
  return status.toUpperCase();
};

export default function TableReservation({ onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(null);
  const [linkedIds, setLinkedIds] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [showOngoingWarning, setShowOngoingWarning] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // Add this line
  const [blockedDates, setBlockedDates] = useState([]);
  const [existingReservation, setExistingReservation] = useState(null); // Add this

  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    highChair: "No",
    muni: "",
    brgy: "",
    allergy: "",
    customAllergy: "",
    occasion: "",
    customOccasion: "",
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

  // Fixed: Use toLocaleDateString to avoid timezone issues
  const todayStr = new Date().toLocaleDateString("en-CA");

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
    const checkExisting = async () => {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token"); // Get the token

      if (!userId || userId === "null") return;

      try {
        const res = await axios.get(
          `${API_BASE}/reservations/check-active/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }, // SEND THE TOKEN
        );

        // Now that we fixed the backend format, this line will work!
        if (res.data.hasActive) {
          setExistingReservation(res.data.reservation);
          setUi((prev) => ({ ...prev, showExistingModal: true }));
        }
      } catch (err) {
        console.error("Check active error:", err);
      }
    };

    checkExisting();
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
              params: {
                tableId: table.id,
                date: form.date,
              },
            },
          );
          schedules[table.id] = Array.isArray(response.data)
            ? response.data.filter((r) => !isReservationCompleted(r, form.date))
            : [];
        } catch (error) {
          console.warn(`Error fetching schedule for table ${table.id}:`, error);
          schedules[table.id] = [];
        }
      }
      setTableSchedules(schedules);
    };

    fetchAllTableSchedules();
  }, [form.date]);

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
                params: {
                  tableId: selectedId,
                  date: form.date,
                },
              },
            );
          } catch (error) {
            schedRes = { data: [] };
          }
        }

        const processedSchedule = (schedRes.data || [])
          .filter((res) => !isReservationCompleted(res, form.date))
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

        setData({
          occupied: statRes.data || {},
          schedule: processedSchedule,
        });
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    poll();
    const pollInterval = setInterval(poll, 10000);
    return () => clearInterval(pollInterval);
  }, [form.date, form.startTime, form.endTime, selectedId]);
  //BLOCKED DATES
  useEffect(() => {
    axios
      .get(`${API_BASE}/admin/blocked-dates`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          const formatted = res.data.map((h) => {
            // Convert to local date string to avoid timezone shifts
            const d = new Date(h.block_date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          });
          console.log("Verified Blocked Dates:", formatted); // CHECK YOUR CONSOLE
          setBlockedDates(formatted);
        }
      })
      .catch((err) => console.error("Error fetching blocked dates", err));
  }, []);

  // --- CALCULATIONS ---
  const primaryTable = useMemo(
    () => TABLES_DATA.find((t) => t.id === selectedId),
    [selectedId],
  );

  const hasActiveReservation = (tableId) => {
    const schedule = tableSchedules[tableId] || [];
    return schedule.length > 0;
  };

  const handleDateSelection = (e) => {
    const selectedDate = e.target.value;
    console.log("User selected:", selectedDate);
    console.log("Checking against:", blockedDates);

    if (blockedDates.includes(selectedDate)) {
      alert("We are sorry, but the restaurant is closed on this date.");

      // 1. Clear the state so it can't be submitted
      setForm((prev) => ({ ...prev, date: "" }));

      // 2. Clear the visual input
      e.target.value = "";
      return true;
    } else {
      // 3. Date is okay, update the state normally
      handleInputChange(e);
      return false;
    }
  };
  // Check if a table has ongoing reservation
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

    return !schedule.some((r) => {
      return startM < timeToMin(r.endTime) && endM > timeToMin(r.startTime);
    });
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
    // 1. Calculate the raw total
    const rawTotal = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // 2. Round everything to 2 decimal places to stop the "Malformed Packet" error
    const total = Math.round(rawTotal * 100) / 100;
    const downpayment = Math.round(total * 0.2 * 100) / 100;
    const balance = Math.round(total * 0.8 * 100) / 100;

    return {
      totalOrderPrice: total, // Will be 399.00
      downpayment: downpayment, // Will be 79.80
      balance: balance, // Will be 319.20
    };
  }, [selectedItems]);

  const tableIdsArray = useMemo(() => {
    return [selectedId, ...linkedIds].filter((id) => id !== null);
  }, [selectedId, linkedIds]);

  const productDisplayName = useMemo(() => {
    if (selectedItems.length === 0) return "Table Reservation";
    if (selectedItems.length === 1) return selectedItems[0].name;
    return `${selectedItems[0].name} + ${selectedItems.length - 1} more`;
  }, [selectedItems]);

  const getFinalAllergy = useMemo(() => {
    if (form.allergy === "Other" && form.customAllergy) {
      return `Other: ${form.customAllergy}`;
    }
    return form.allergy || "None";
  }, [form.allergy, form.customAllergy]);

  const getFinalOccasion = useMemo(() => {
    if (form.occasion === "Other" && form.customOccasion) {
      return `Other: ${form.customOccasion}`;
    }
    return form.occasion || "Casual Dining";
  }, [form.occasion, form.customOccasion]);

  const fullReservationData = useMemo(() => {
    return {
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
      paymentMethod: paymentMethod || "Maya",
      municipality:
        addressData.municipalities.find((m) => m.code === form.muni)?.name ||
        "",
      barangay:
        addressData.barangays.find((b) => b.code === form.brgy)?.name || "",
      allergy: getFinalAllergy,
      occasion: getFinalOccasion,
    };
  }, [
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
  ]);

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

  // FIXED: availableStartTimeOptions - properly filters overlapping reservations
  const availableStartTimeOptions = useMemo(() => {
    let filtered = timeOptions;

    // Filter out past times for today
    if (form.date === todayStr) {
      const thresh = new Date().getHours() * 60 + new Date().getMinutes() + 15;
      filtered = filtered.filter((t) => timeToMin(t) >= thresh);
    }

    // Filter out times that conflict with existing reservations
    return filtered.filter((startTime) => {
      const startM = timeToMin(startTime);
      // Need at least 1 hour duration
      const endM = startM + 60;

      // Check if this time slot conflicts with any existing reservation
      return !data.schedule.some((reservation) => {
        const resStartM = timeToMin(reservation.startTime);
        const resEndM = timeToMin(reservation.endTime);

        // Check for overlap: new slot overlaps with existing reservation
        return startM < resEndM && endM > resStartM;
      });
    });
  }, [timeOptions, data.schedule, form.date, todayStr]);

  // FIXED: filteredEndTimeOptions - properly filters based on conflicts
  const filteredEndTimeOptions = useMemo(() => {
    if (!form.startTime) return [];
    const startM = timeToMin(form.startTime);

    return timeOptions.filter((endTime) => {
      const endM = timeToMin(endTime);
      // Must be at least 1 hour after start
      if (endM < startM + 60) return false;

      // Check if this end time creates a conflict
      return !data.schedule.some((reservation) => {
        const resStartM = timeToMin(reservation.startTime);
        const resEndM = timeToMin(reservation.endTime);

        // The new reservation would be from startM to endM
        // Check if this overlaps with existing reservation
        return startM < resEndM && endM > resStartM;
      });
    });
  }, [form.startTime, timeOptions, data.schedule]);

  // --- FIELD VALIDATION ---
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

  // --- HANDLERS ---
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
      alert(
        "This table is currently under maintenance and cannot be reserved.",
      );
      return;
    }

    const hasActive = hasActiveReservation(table.id);
    const hasOngoing = hasOngoingReservation(table.id);

    if (hasOngoing && !isLinkMode) {
      setShowOngoingWarning(table.id);
      setTimeout(() => setShowOngoingWarning(null), 3000);
    }

    if (isLinkMode) {
      if (table.id === selectedId) return;

      if (!form.startTime || !form.endTime) {
        alert("Please select start time and end time first");
        return;
      }

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
      setSelectedId(selectedId === table.id ? null : table.id);
      setLinkedIds([]);
    }
  };

  const confirmBooking = async (file, method) => {
    // <--- Accept method here
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
        paymentMethod: method || paymentMethod || "Maya",
        tableIds: JSON.stringify(tableIdsArray),
        // THIS IS THE CRITICAL LINE: it contains your flavors/drinks!
        selectedItems: JSON.stringify(selectedItems),
        status: "Confirmed",
        brgyCode: form.brgy,
        allergy: finalAllergy,
        occasion: finalOccasion,
      };

      if (file) payload.append("receipt", file);

      Object.entries(submission).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          payload.append(k, v);
        }
      });

      const res = await axios.post(`${API_BASE}/reservations/table`, payload);
      onSuccess(res.data.id);
    } catch (e) {
      console.error("Booking Error:", e.response?.data || e.message);
      alert(
        e.response?.data?.message ||
          "Table Selection Error: One of the selected tables does not exist in the database or is already booked.",
      );
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
                readOnly
                onKeyDown={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onChange={(e) => {
                  const isBlocked = handleDateSelection(e);
                  if (!isBlocked) {
                    setSelectedId(null);
                    setLinkedIds([]);
                  }
                }}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
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
                      className="res-input-dropdown"
                      name="endTime"
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
                      placeholder="Please specify your occasion (e.g., Surprise Party, etc.)"
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
                      placeholder="Please specify your allergy (e.g., Peanuts, Strawberries, etc.)"
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
              const hasAnyReservation = hasActiveReservation(t.id);
              const hasOngoing = hasOngoingReservation(t.id);
              const isSelected = selectedId === t.id;
              const isLinked = linkedIds.includes(t.id);
              const showWarning = showOngoingWarning === t.id;
              const isMaintenance = t.status === "maintenance";

              let cardCls = "";
              if (isSelected) {
                cardCls = "selected";
              } else if (isLinked) {
                cardCls = "linked";
              } else if (isMaintenance) {
                cardCls = "maintenance";
              } else if (hasOngoing && !isLinkMode) {
                cardCls = "occupied";
              } else if (hasAnyReservation && !isLinkMode) {
                cardCls = "reserved";
              } else {
                cardCls = "available";
              }

              let dotCls = "available";
              if (isMaintenance) {
                dotCls = "maintenance";
              } else if (hasOngoing) {
                dotCls = "occupied";
              } else if (hasAnyReservation) {
                dotCls = "reserved";
              }

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

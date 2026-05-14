// ReservationSteps.jsx (Updated with REAL calendar data)
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
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Users,
  User,
} from "lucide-react";
import StepProgress from "./StepProgress";
import "../Style/TableReservation.css";
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

const STEPS = [
  "Choose Date",
  "Select Table & Time",
  "Your Details",
  "Choose Package",
  "Summary",
];

export default function ReservationSteps({ onClose, onSuccess }) {
  // ============ STATE ============
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [linkedIds, setLinkedIds] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [showOngoingWarning, setShowOngoingWarning] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [blockedDates, setBlockedDates] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDateLoading, setIsDateLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [tableSchedules, setTableSchedules] = useState({});
  const [data, setData] = useState({ occupied: {}, schedule: [] });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedReservationDate, setSelectedReservationDate] = useState(null);
  const [reservationsForDate, setReservationsForDate] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [dateReservationCounts, setDateReservationCounts] = useState({});
  const [allReservationsByDate, setAllReservationsByDate] = useState({});

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

  const [user, setUser] = useState({
    firstName: localStorage.getItem("firstName") || "",
    lastName: localStorage.getItem("lastName") || "",
    email: localStorage.getItem("email") || "",
    phone: "09",
  });

  const [ui, setUi] = useState({
    loading: false,
    editingFirstName: false,
    editingLastName: false,
    menu: false,
    summary: false,
    terms: false,
  });

  // Validation flags
  const isFirstNameValid = user.firstName && user.firstName.trim().length > 0;
  const isLastNameValid = user.lastName && user.lastName.trim().length > 0;
  const isEmailValid = /^\S+@\S+\.\S+$/.test(user.email);
  const isPhoneValid = user.phone.length === 11 && user.phone.startsWith("09");

  // ============ STEP TRACKING ============
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const socket = useSocket();
  const { addressData, fetchBarangays } = useAddressData();
  const todayStr = new Date().toLocaleDateString("en-CA");

  // ============ CLOSE PICKERS WHEN CLICKING OUTSIDE ============
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMonthPicker || showYearPicker) {
        const target = event.target;
        const isMonthPicker = target.closest(".calendar-month-picker");
        const isYearPicker = target.closest(".calendar-year-picker");
        const isMonthBtn = target.closest(".calendar-month-btn");
        const isYearBtn = target.closest(".calendar-year-btn");

        if (!isMonthPicker && !isMonthBtn && showMonthPicker) {
          setShowMonthPicker(false);
        }
        if (!isYearPicker && !isYearBtn && showYearPicker) {
          setShowYearPicker(false);
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showMonthPicker, showYearPicker]);

  // ============ FETCH ALL RESERVATIONS FOR CALENDAR ============
  // ============ FETCH ALL RESERVATIONS FOR CALENDAR ============
  const fetchAllReservationsForMonth = async (year, month) => {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const response = await axios.get(
        `${API_BASE}/reservations/by-date-range`,
        {
          params: { startDate, endDate },
        },
      );

      if (response.data && Array.isArray(response.data)) {
        // Group reservations by date
        const groupedByDate = {};
        const countsByDate = {};

        response.data.forEach((reservation) => {
          const date = reservation.date;
          if (date) {
            if (!groupedByDate[date]) {
              groupedByDate[date] = [];
              countsByDate[date] = 0;
            }
            groupedByDate[date].push(reservation);
            countsByDate[date]++;
          }
        });

        setAllReservationsByDate(groupedByDate);
        setDateReservationCounts(countsByDate);
      }
    } catch (error) {
      console.error("Error fetching reservations for month:", error);
    }
  };

  // Fetch reservations when month changes
  useEffect(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    fetchAllReservationsForMonth(year, month);
  }, [calendarMonth]);

  // ============ FETCH RESERVATIONS FOR SELECTED DATE ============
  const fetchReservationsForDate = async (date) => {
    if (!date) return;

    setIsLoadingReservations(true);
    try {
      // First check if we already have cached data
      if (allReservationsByDate[date]) {
        const formattedReservations = allReservationsByDate[date].map(
          (res) => ({
            ...res,
            tableLabel:
              TABLES_DATA.find((t) => t.id === res.table_id)?.label ||
              `Table ${res.table_id}`,
            startTimeFormatted: formatTime12Hour(res.startTime),
            endTimeFormatted: formatTime12Hour(res.endTime),
            duration: calculateDuration(res.startTime, res.endTime),
            customerName:
              res.customerName ||
              `${res.first_name || ""} ${res.last_name || ""}`.trim() ||
              "Guest",
            guests: res.guests,
            status: res.status || "Confirmed",
          }),
        );
        setReservationsForDate(formattedReservations);
      } else {
        // Fallback to API call
        const response = await axios.get(
          `${API_BASE}/reservations/by-date/${date}`,
        );

        if (response.data && Array.isArray(response.data)) {
          const formattedReservations = response.data.map((res) => {
            // Find table label from TABLES_DATA
            let tableLabel = `Table ${res.table_id}`;
            const foundTable = TABLES_DATA.find((t) => t.id === res.table_id);
            if (foundTable) {
              tableLabel = foundTable.label;
            }

            return {
              ...res,
              tableLabel: tableLabel,
              startTimeFormatted: formatTime12Hour(res.startTime),
              endTimeFormatted: formatTime12Hour(res.endTime),
              duration: calculateDuration(res.startTime, res.endTime),
              customerName:
                res.customerName ||
                `${res.first_name || ""} ${res.last_name || ""}`.trim() ||
                "Guest",
              guests: res.guests,
              status: res.status || "Confirmed",
            };
          });
          setReservationsForDate(formattedReservations);
        } else {
          setReservationsForDate([]);
        }
      }
    } catch (error) {
      console.error("Error fetching reservations for date:", error);
      setReservationsForDate([]);
    } finally {
      setIsLoadingReservations(false);
    }
  };

  // Helper function to convert 24-hour time to 12-hour format
  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to calculate duration between two times
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "";
    const start = timeToMin(startTime);
    const end = timeToMin(endTime);
    const durationMinutes = end - start;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
  };

  // Get reservation count for a date
  const getReservationCountForDate = (dateStr) => {
    return dateReservationCounts[dateStr] || 0;
  };

  // Get total tables count (excluding maintenance)
  const totalTablesCount = TABLES_DATA.filter(
    (t) => t.status !== "maintenance",
  ).length;

  // Check if date is fully booked
  const isDateFullyBooked = (dateStr) => {
    const count = getReservationCountForDate(dateStr);
    return count >= totalTablesCount;
  };

  // ============ STEP FUNCTIONS ============
  const markStepCompleted = (step) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  const goToNextStep = () => {
    if (validateCurrentStep()) {
      markStepCompleted(currentStep);
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const goToPrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (step) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  };

  // ============ STEP VALIDATION ============
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          form.date && form.date !== "" && !blockedDates.includes(form.date)
        );
      case 1:
        const isStartTimeValid = form.startTime && form.startTime !== "";
        const isEndTimeValid = form.endTime && form.endTime !== "";
        const isTimeValid = (() => {
          if (!form.startTime || !form.endTime) return false;
          const s = timeToMin(form.startTime);
          const e = timeToMin(form.endTime);
          return e - s >= 30;
        })();
        const hasNoConflict = !data.schedule.some((r) => {
          const s = timeToMin(form.startTime);
          const e = timeToMin(form.endTime);
          return s < timeToMin(r.endTime) && e > timeToMin(r.startTime);
        });
        return (
          selectedId !== null &&
          isStartTimeValid &&
          isEndTimeValid &&
          isTimeValid &&
          hasNoConflict
        );
      case 2:
        const isMuniValid = form.muni && form.muni !== "";
        const isBrgyValid = form.brgy && form.brgy !== "";
        return (
          isFirstNameValid &&
          isLastNameValid &&
          isEmailValid &&
          isPhoneValid &&
          isMuniValid &&
          isBrgyValid
        );
      case 3:
        return selectedItems.length > 0 && agreeToTerms;
      case 4:
        return true;
      default:
        return true;
    }
  };

  // Auto-mark step as completed
  useEffect(() => {
    if (currentStep === 0 && form.date && !blockedDates.includes(form.date)) {
      markStepCompleted(0);
    }
    if (
      currentStep === 1 &&
      selectedId &&
      form.startTime &&
      form.endTime &&
      validateCurrentStep()
    ) {
      markStepCompleted(1);
    }
    if (currentStep === 2 && validateCurrentStep()) {
      markStepCompleted(2);
    }
    if (currentStep === 3 && selectedItems.length > 0 && agreeToTerms) {
      markStepCompleted(3);
    }
  }, [
    currentStep,
    form.date,
    form.startTime,
    form.endTime,
    selectedId,
    selectedItems,
    agreeToTerms,
    blockedDates,
  ]);

  // ============ INITIAL LOADING ============
  useEffect(() => {
    const timer = setTimeout(() => setIsFormLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // ============ FETCH ADDRESS DATA ============
  useEffect(() => {
    if (form.muni) fetchBarangays(form.muni);
  }, [form.muni, fetchBarangays]);

  // ============ FETCH TABLE SCHEDULES ============
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

  // ============ FETCH BLOCKED DATES ============
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

  // ============ REAL-TIME POLLING ============
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
          .map((res) => ({ ...res }));
        setData({ occupied: statRes.data || {}, schedule: processedSchedule });

        // Refresh calendar data periodically
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        fetchAllReservationsForMonth(year, month);
      } catch (e) {
        console.error("Polling error:", e);
      }
    };
    poll();
    const pollInterval = setInterval(poll, 10000);
    return () => clearInterval(pollInterval);
  }, [form.date, form.startTime, form.endTime, selectedId, calendarMonth]);

  // ============ HELPER FUNCTIONS ============
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

  const isTableAvailableAtSelectedTime = (tableId) => {
    if (!form.startTime || !form.endTime) return true;
    return isTableAvailableForTime(tableId, form.startTime, form.endTime);
  };

  const handleDateSelection = (e) => {
    const selectedDate = e.target.value;
    if (blockedDates.includes(selectedDate)) {
      alert("We are sorry, but the restaurant is closed on this date.");
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
      paymentMethod: paymentMethod || "Maya",
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

  // ============ TIME OPTIONS ============
  const timeOptions = useMemo(() => {
    const opts = [];
    for (let h = 10; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 22 && m > 30) break;
        const hour12 = h % 12 || 12;
        const period = h < 12 ? "AM" : "PM";
        opts.push(
          `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`,
        );
      }
    }
    return opts;
  }, []);

  const maxEndTimeMinutes = 22 * 60 + 30;

  const availableStartTimeOptions = useMemo(() => {
    let filtered = timeOptions;
    if (form.date === todayStr) {
      const thresh = new Date().getHours() * 60 + new Date().getMinutes() + 15;
      filtered = filtered.filter((t) => timeToMin(t) >= thresh);
    }
    filtered = filtered.filter((startTime) => {
      const startM = timeToMin(startTime);
      if (startM > 22 * 60) return false;
      const minEndM = startM + 30;
      return minEndM <= maxEndTimeMinutes;
    });
    if (selectedId) {
      const schedule = tableSchedules[selectedId] || [];
      return filtered.filter((startTime) => {
        const startM = timeToMin(startTime);
        const minEndM = startM + 30;
        return !schedule.some((reservation) => {
          const resStartM = timeToMin(reservation.startTime);
          const resEndM = timeToMin(reservation.endTime);
          return startM < resEndM && minEndM > resStartM;
        });
      });
    }
    return filtered;
  }, [timeOptions, form.date, todayStr, selectedId, tableSchedules]);

  const filteredEndTimeOptions = useMemo(() => {
    if (!form.startTime) return [];
    const startM = timeToMin(form.startTime);

    if (startM >= 21 * 60 + 30) {
      if (maxEndTimeMinutes >= startM + 30) {
        const tenThirtyPM = timeOptions.find(
          (t) => t.includes("10:30") && t.includes("PM"),
        );
        return tenThirtyPM ? [tenThirtyPM] : [];
      }
      return [];
    }

    const absoluteMaxEnd = Math.min(maxEndTimeMinutes, startM + 180);

    if (!selectedId) {
      return timeOptions.filter((endTime) => {
        const endM = timeToMin(endTime);
        return endM >= startM + 30 && endM <= absoluteMaxEnd;
      });
    }
    const schedule = tableSchedules[selectedId] || [];
    return timeOptions.filter((endTime) => {
      const endM = timeToMin(endTime);
      if (endM < startM + 30) return false;
      if (endM > absoluteMaxEnd) return false;
      return !schedule.some((reservation) => {
        const resStartM = timeToMin(reservation.startTime);
        const resEndM = timeToMin(reservation.endTime);
        return startM < resEndM && endM > resStartM;
      });
    });
  }, [form.startTime, timeOptions, selectedId, tableSchedules]);

  // ============ HANDLERS ============
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
      alert("This table is currently under maintenance.");
      return;
    }

    if (
      form.startTime &&
      form.endTime &&
      !isTableAvailableForTime(table.id, form.startTime, form.endTime)
    ) {
      alert(
        "This table is not available during the selected time slot. Please choose a different time.",
      );
      return;
    }

    if (isLinkMode) {
      if (table.id === selectedId) return;
      if (!form.startTime || !form.endTime) {
        alert("Please select start time and end time first");
        return;
      }
      if (!isTableAvailableForTime(table.id, form.startTime, form.endTime)) {
        alert("This table has a reservation during the selected time slot.");
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
        paymentMethod: method || paymentMethod || "Maya",
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

      // Refresh calendar data after successful booking
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      await fetchAllReservationsForMonth(year, month);

      onSuccess(res.data.id);
    } catch (e) {
      console.error("Booking Error:", e.response?.data || e.message);
      alert(e.response?.data?.message || "Table Selection Error.");
    } finally {
      setUi((p) => ({ ...p, loading: false }));
      setIsProcessing(false);
    }
  };

  const availableTablesForLinking = getAvailableTablesForLinking();

  const getScheduleItemClassWithColor = (reservation) => {
    const status = reservation.status;
    const isOngoing = isReservationOngoing(
      reservation.startTime,
      reservation.endTime,
    );
    if ((status === "Confirmed" || status === "Pending") && isOngoing)
      return "ongoing";
    if (status === "Seated") return "ongoing";
    if (status === "Confirmed" || status === "Pending") return "reserved";
    return "";
  };

  // ============ RENDER STEP CONTENT ============
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="step-content step-date">
            <div className="calendar-container">
              <div className="calendar-header">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() => {
                    const newDate = new Date(calendarMonth);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCalendarMonth(newDate);
                  }}
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="calendar-month-year-container">
                  <div className="calendar-month-year">
                    <button
                      type="button"
                      className="calendar-month-btn"
                      onClick={() => {
                        setShowMonthPicker(!showMonthPicker);
                        setShowYearPicker(false);
                      }}
                    >
                      {calendarMonth.toLocaleString("default", {
                        month: "long",
                      })}
                      <span className="calendar-dropdown-arrow">▼</span>
                    </button>
                    <button
                      type="button"
                      className="calendar-year-btn"
                      onClick={() => {
                        setShowYearPicker(!showYearPicker);
                        setShowMonthPicker(false);
                      }}
                    >
                      {calendarMonth.getFullYear()}
                      <span className="calendar-dropdown-arrow">▼</span>
                    </button>
                  </div>

                  {showMonthPicker && (
                    <div className="calendar-month-picker">
                      {[
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                      ].map((month, index) => (
                        <button
                          key={month}
                          type="button"
                          className={`calendar-month-option ${calendarMonth.getMonth() === index ? "active" : ""}`}
                          onClick={() => {
                            const newDate = new Date(calendarMonth);
                            newDate.setMonth(index);
                            setCalendarMonth(newDate);
                            setShowMonthPicker(false);
                          }}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  )}

                  {showYearPicker && (
                    <div className="calendar-year-picker">
                      <div className="calendar-year-scroll">
                        {(() => {
                          const currentYear = new Date().getFullYear();
                          const years = [];
                          for (
                            let i = currentYear - 5;
                            i <= currentYear + 10;
                            i++
                          ) {
                            years.push(i);
                          }
                          return years.map((year) => (
                            <button
                              key={year}
                              type="button"
                              className={`calendar-year-option ${calendarMonth.getFullYear() === year ? "active" : ""}`}
                              onClick={() => {
                                const newDate = new Date(calendarMonth);
                                newDate.setFullYear(year);
                                setCalendarMonth(newDate);
                                setShowYearPicker(false);
                              }}
                            >
                              {year}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() => {
                    const newDate = new Date(calendarMonth);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCalendarMonth(newDate);
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Calendar Legend */}
              <div className="calendar-legend">
                <div className="calendar-legend-item">
                  <div className="calendar-legend-dot normal"></div>
                  <span>Available</span>
                </div>
                <div className="calendar-legend-item">
                  <div className="calendar-legend-dot has-reservations"></div>
                  <span>Has Reservation(s)</span>
                </div>
                <div className="calendar-legend-item">
                  <div className="calendar-legend-dot fully-booked"></div>
                  <span>Fully Booked</span>
                </div>
                <div className="calendar-legend-item">
                  <div className="calendar-legend-dot blocked"></div>
                  <span>Closed</span>
                </div>
                <div className="calendar-legend-item">
                  <div className="calendar-legend-dot selected"></div>
                  <span>Selected</span>
                </div>
              </div>

              <div className="calendar-weekdays">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div key={day} className="calendar-weekday">
                    {day}
                  </div>
                ))}
              </div>

              <div className="calendar-days">
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();

                  const firstDayOfMonth = new Date(year, month, 1);
                  const startDayOfWeek = firstDayOfMonth.getDay();

                  const daysInMonth = new Date(year, month + 1, 0).getDate();

                  const calendarDays = [];

                  // Previous month days
                  const prevMonthDays = new Date(year, month, 0).getDate();
                  for (let i = startDayOfWeek - 1; i >= 0; i--) {
                    const dayNum = prevMonthDays - i;
                    const date = new Date(year, month - 1, dayNum);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    calendarDays.push({
                      day: dayNum,
                      date: dateStr,
                      isCurrentMonth: false,
                      isToday: dateStr === today.toISOString().split("T")[0],
                      isSelected: form.date === dateStr,
                      isBlocked: blockedDates.includes(dateStr),
                      isPast: date < today,
                    });
                  }

                  // Current month days
                  for (let i = 1; i <= daysInMonth; i++) {
                    const date = new Date(year, month, i);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const reservationCount =
                      getReservationCountForDate(dateStr);
                    const isFullyBooked = isDateFullyBooked(dateStr);

                    calendarDays.push({
                      day: i,
                      date: dateStr,
                      isCurrentMonth: true,
                      isToday: dateStr === today.toISOString().split("T")[0],
                      isSelected: form.date === dateStr,
                      isBlocked: blockedDates.includes(dateStr),
                      isPast: date < today,
                      reservationCount: reservationCount,
                      isFullyBooked: isFullyBooked,
                      hasReservations: reservationCount > 0 && !isFullyBooked,
                    });
                  }

                  // Next month days
                  const remainingCells = 42 - calendarDays.length;
                  for (let i = 1; i <= remainingCells; i++) {
                    const date = new Date(year, month + 1, i);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    calendarDays.push({
                      day: i,
                      date: dateStr,
                      isCurrentMonth: false,
                      isToday: dateStr === today.toISOString().split("T")[0],
                      isSelected: form.date === dateStr,
                      isBlocked: blockedDates.includes(dateStr),
                      isPast: date < today,
                    });
                  }

                  return calendarDays.map((day, idx) => {
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`calendar-day 
                          ${day.isSelected ? "selected" : ""} 
                          ${day.isBlocked ? "blocked" : ""} 
                          ${day.isToday ? "today" : ""}
                          ${!day.isCurrentMonth ? "other-month" : ""}
                          ${day.isPast && !day.isSelected ? "past" : ""}
                          ${day.hasReservations && !day.isSelected && !day.isBlocked ? "has-reservations" : ""}
                          ${day.isFullyBooked && !day.isSelected && !day.isBlocked ? "fully-booked" : ""}
                        `}
                        disabled={
                          day.isBlocked || (day.isPast && !day.isSelected)
                        }
                        onClick={async () => {
                          if (
                            !day.isBlocked &&
                            !(day.isPast && !day.isSelected)
                          ) {
                            const syntheticEvent = {
                              target: {
                                name: "date",
                                value: day.date,
                              },
                            };
                            const isBlocked =
                              handleDateSelection(syntheticEvent);
                            if (!isBlocked) {
                              setSelectedId(null);
                              setLinkedIds([]);
                              setForm((prev) => ({
                                ...prev,
                                startTime: "",
                                endTime: "",
                              }));
                              setSelectedReservationDate(day.date);
                              await fetchReservationsForDate(day.date);
                            }
                          }
                        }}
                      >
                        <span className="calendar-day-number">{day.day}</span>
                        {day.hasReservations && day.reservationCount > 0 && (
                          <span className="calendar-reservation-badge">
                            {day.reservationCount}{" "}
                            {day.reservationCount === 1 ? "Res" : "Res"}
                          </span>
                        )}
                        {day.isFullyBooked && (
                          <span className="calendar-reservation-badge full">
                            Full
                          </span>
                        )}
                        {day.isBlocked && (
                          <span className="calendar-blocked-dot"></span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>

              <input type="hidden" name="date" value={form.date} />

              {/* Reservation Details Section */}
              {selectedReservationDate &&
                selectedReservationDate === form.date && (
                  <div className="reservation-details-container">
                    <div className="reservation-details-header">
                      <Clock size={16} />
                      <h4>
                        Reservations for{" "}
                        {new Date(selectedReservationDate).toLocaleDateString(
                          "default",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </h4>
                    </div>

                    {isLoadingReservations ? (
                      <div className="reservation-details-loading">
                        <div className="loading-spinner-small"></div>
                        <p>Loading reservations...</p>
                      </div>
                    ) : reservationsForDate.length > 0 ? (
                      <div className="reservation-details-list">
                        {reservationsForDate.map((res, index) => (
                          <div key={index} className="reservation-detail-card">
                            <div className="reservation-card-header">
                              <div className="table-badge">
                                <Armchair size={14} />
                                <strong>{res.tableLabel}</strong>
                              </div>
                              <span
                                className={`status-badge ${res.status?.toLowerCase()}`}
                              >
                                {res.status || "Confirmed"}
                              </span>
                            </div>

                            <div className="reservation-card-time">
                              <Clock size={14} />
                              <span>
                                {res.startTimeFormatted} -{" "}
                                {res.endTimeFormatted}
                              </span>
                            </div>

                            <div className="reservation-card-duration">
                              <AlertCircle size={14} />
                              <span>Duration: {res.duration}</span>
                            </div>

                            {res.customerName && (
                              <div className="reservation-card-customer">
                                <User size={14} />
                                <span>{res.customerName}</span>
                              </div>
                            )}

                            {res.guests && (
                              <div className="reservation-card-guests">
                                <Users size={14} />
                                <span>{res.guests} guests</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="reservation-details-empty">
                        <Calendar size={32} />
                        <p>No reservations for this date</p>
                        <span>
                          Click on a date with yellow highlight to view
                          reservations
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        );

      case 1:
        return form.date ? (
          <div className="step-content step-tables">
            <div className="time-selection-row">
              <div className="input-group">
                <label>
                  <Clock size={12} /> START TIME
                </label>
                <select
                  name="startTime"
                  className="res-input-dropdown"
                  value={form.startTime}
                  onChange={(e) => {
                    handleInputChange(e);
                    setLinkedIds([]);
                    setSelectedId(null);
                  }}
                >
                  <option value="">Select start time</option>
                  {availableStartTimeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>
                  <Clock size={12} /> END TIME
                </label>
                <select
                  name="endTime"
                  className="res-input-dropdown"
                  value={form.endTime}
                  onChange={(e) => {
                    handleInputChange(e);
                    setLinkedIds([]);
                    setSelectedId(null);
                  }}
                  disabled={!form.startTime}
                >
                  <option value="">Select end time</option>
                  {filteredEndTimeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedId && data.schedule && data.schedule.length > 0 && (
              <div className="table-schedule-section">
                <h4 className="schedule-header">
                  <Clock size={14} /> Occupied Slots for {primaryTable?.label}
                </h4>
                <div className="schedule-list">
                  {data.schedule.map((res, i) => {
                    const itemClass = getScheduleItemClassWithColor(res);
                    const displayText = getStatusDisplayText(res);
                    return (
                      <div key={i} className={`schedule-item-3d ${itemClass}`}>
                        <Clock size={12} />
                        <span className="schedule-time">
                          {formatTime(res.startTime)} -{" "}
                          {formatTime(res.endTime)}
                        </span>
                        <span className="schedule-status">{displayText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="table-legend">
              <div className="legend-item">
                <span className="legend-dot available"></span>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot reserved"></span>
                <span>Reserved</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot occupied"></span>
                <span>Occupied/Ongoing</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot selected"></span>
                <span>Selected</span>
              </div>
              {isLinkMode && (
                <div className="legend-item">
                  <span className="legend-dot linked"></span>
                  <span>Linked</span>
                </div>
              )}
            </div>

            <div className="table-selection-grid">
              {TABLES_DATA.map((t) => {
                const hasAnyReservation = hasActiveReservationForTable(t.id);
                const hasOngoing = hasOngoingReservation(t.id);
                const isSelected = selectedId === t.id;
                const isLinked = linkedIds.includes(t.id);
                const isMaintenance = t.status === "maintenance";
                const isAvailableAtTime = isTableAvailableAtSelectedTime(t.id);
                const hasTimeConflict =
                  form.startTime && form.endTime && !isAvailableAtTime;

                let cardCls = "",
                  dotColor = "";
                if (isSelected) {
                  cardCls = "selected";
                  dotColor = "selected";
                } else if (isLinked) {
                  cardCls = "linked";
                  dotColor = "linked";
                } else if (isMaintenance) {
                  cardCls = "maintenance";
                  dotColor = "maintenance";
                } else if (hasTimeConflict) {
                  cardCls = "reserved";
                  dotColor = "reserved";
                } else if (hasOngoing && !isLinkMode) {
                  cardCls = "occupied";
                  dotColor = "occupied";
                } else if (hasAnyReservation && !isLinkMode) {
                  cardCls = "reserved";
                  dotColor = "reserved";
                } else {
                  cardCls = "available";
                  dotColor = "available";
                }

                return (
                  <div
                    key={t.id}
                    className={`table-list-card ${cardCls}`}
                    onClick={() => onTableClick(t)}
                    style={{
                      cursor: isMaintenance ? "not-allowed" : "pointer",
                      opacity: hasTimeConflict && !isSelected ? 0.6 : 1,
                    }}
                  >
                    <div className="table-card-content">
                      <div className="table-details">
                        <div className="table-title-row">
                          <Armchair size={16} />
                          <strong>{t.label}</strong>
                        </div>
                        <span>{t.seats} Seats</span>
                        {hasOngoing && !isLinkMode && !isMaintenance && (
                          <div className="ongoing-badge">
                            <AlertCircle size={10} />
                            <span>Ongoing</span>
                          </div>
                        )}
                        {hasTimeConflict && !isSelected && !isLinkMode && (
                          <div className="reserved-badge">
                            <Clock size={10} />
                            <span>Time Conflict</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`status-dot ${dotColor}`}></div>
                  </div>
                );
              })}
            </div>

            {selectedId && (
              <button
                className={`btn-link-mode ${isLinkMode ? "active" : ""}`}
                onClick={() => {
                  setIsLinkMode(!isLinkMode);
                  if (!isLinkMode && (!form.startTime || !form.endTime)) {
                    alert("Please select start time and end time first");
                  }
                }}
                style={{ marginTop: "20px" }}
              >
                <LinkIcon size={18} />{" "}
                {isLinkMode ? "Finish Linking" : "Link Tables"}
              </button>
            )}
          </div>
        ) : (
          <div className="step-warning">Please select a date first</div>
        );

      case 2:
        return (
          <div className="step-content step-details">
            <div className="reservation-form-grid">
              <div className="input-group">
                <div className="label-with-icon">
                  <label>FIRST NAME</label>
                  <Pencil
                    size={16}
                    className={`edit-toggle-icon ${ui.editingFirstName ? "active" : ""}`}
                    onClick={() =>
                      setUi((p) => ({
                        ...p,
                        editingFirstName: !p.editingFirstName,
                      }))
                    }
                  />
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={user.firstName}
                  onChange={handleInputChange}
                  disabled={!ui.editingFirstName}
                  className={
                    !isFirstNameValid && user.firstName ? "input-error" : ""
                  }
                />
              </div>

              <div className="input-group">
                <div className="label-with-icon">
                  <label>LAST NAME</label>
                  <Pencil
                    size={16}
                    className={`edit-toggle-icon ${ui.editingLastName ? "active" : ""}`}
                    onClick={() =>
                      setUi((p) => ({
                        ...p,
                        editingLastName: !p.editingLastName,
                      }))
                    }
                  />
                </div>
                <input
                  type="text"
                  name="lastName"
                  value={user.lastName}
                  onChange={handleInputChange}
                  disabled={!ui.editingLastName}
                  className={
                    !isLastNameValid && user.lastName ? "input-error" : ""
                  }
                />
              </div>

              <div className="input-group">
                <label>
                  <Mail size={12} /> EMAIL
                </label>
                <input
                  type="email"
                  name="email"
                  value={user.email}
                  disabled
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
                <small className="input-hint">11 digits starting with 09</small>
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
                    <MapPin size={12} /> BARANGAY
                  </label>
                  <select
                    name="brgy"
                    className="res-input-dropdown"
                    value={form.brgy}
                    onChange={handleInputChange}
                    disabled={!form.muni}
                  >
                    <option value="">Select Barangay</option>
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
                <input type="text" value={totalSeats} readOnly />
              </div>

              <div className="input-group">
                <label>
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
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label>
                  <PartyPopper size={12} /> OCCASION (Optional)
                </label>
                <select
                  name="occasion"
                  className="res-input-dropdown"
                  value={form.occasion}
                  onChange={handleInputChange}
                >
                  <option value="">Select occasion</option>
                  {OCCASION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {form.occasion === "Other" && (
                  <input
                    type="text"
                    name="customOccasion"
                    placeholder="Specify occasion"
                    value={form.customOccasion}
                    onChange={handleInputChange}
                  />
                )}
              </div>

              <div className="input-group">
                <label>
                  <AlertCircle size={12} /> ALLERGIES (Optional)
                </label>
                <select
                  name="allergy"
                  className="res-input-dropdown"
                  value={form.allergy}
                  onChange={handleInputChange}
                >
                  <option value="">Select allergy</option>
                  {ALLERGY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {form.allergy === "Other" && (
                  <input
                    type="text"
                    name="customAllergy"
                    placeholder="Specify allergy"
                    value={form.customAllergy}
                    onChange={handleInputChange}
                  />
                )}
              </div>
            </div>
          </div>
        );

      case 3: // Choose Package
        return (
          <div className="step-content step-package">
            <button
              className="btn-link-mode"
              onClick={() => setUi((p) => ({ ...p, menu: true }))}
            >
              <Layers size={16} />{" "}
              {selectedItems.length > 0
                ? `${selectedItems.length} Selected`
                : "View Packages"}
            </button>
            {selectedItems.length > 0 && (
              <div className="package-summary">
                <h4>Selected Packages</h4>
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="package-item">
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="package-total">
                  <strong>
                    Total: ₱{orderSummary.totalOrderPrice.toFixed(2)}
                  </strong>
                </div>
                <div className="package-downpayment">
                  <span style={{ color: "#f38d31", fontWeight: "800" }}>
                    Downpayment (20%):
                  </span>
                  <strong style={{ color: "#f38d31" }}>
                    ₱{orderSummary.downpayment.toFixed(2)}
                  </strong>
                </div>
                <div className="package-balance">
                  <span style={{ color: "#666" }}>
                    Remaining Balance (80%):
                  </span>
                  <strong>₱{orderSummary.balance.toFixed(2)}</strong>
                </div>

                <div className="terms-checkbox-wrapper">
                  <label className="terms-checkbox-label">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                    />
                    <span>
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        className="terms-link-btn"
                        onClick={() => setUi((p) => ({ ...p, terms: true }))}
                      >
                        Terms and Conditions
                      </button>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        );

      case 4: // Summary
        return (
          <div className="step-content step-summary">
            <ReservationSummary
              isOpen={true}
              onClose={onClose}
              orderSummary={orderSummary}
              reservationData={fullReservationData}
              onConfirm={confirmBooking}
              loading={ui.loading}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // ============ RENDER ============
  if (isFormLoading) {
    return (
      <div className="floor-plan-wrapper">
        <button className="page-back-btn" onClick={onClose}>
          <ArrowLeft size={18} /> Back
        </button>
        <FormLoadingSpinner />
      </div>
    );
  }

  return (
    <div className="floor-plan-wrapper">
      {isProcessing && <LoadingSpinner />}
      {isDateLoading && <DateLoadingSpinner />}
      <button className="page-back-btn" onClick={onClose}>
        <ArrowLeft size={18} /> Cancel
      </button>
      <div className="reservation-flow-container">
        <StepProgress
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />
        <div className="step-content-container">{renderStepContent()}</div>
        <div className="step-navigation">
          <button
            className="nav-btn nav-btn-prev"
            onClick={goToPrevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={18} /> Previous
          </button>
          {currentStep === STEPS.length - 1 ? (
            <button
              className="nav-btn nav-btn-next"
              onClick={() => {
                if (validateCurrentStep())
                  setUi((p) => ({ ...p, summary: true }));
              }}
              disabled={!validateCurrentStep()}
            >
              Complete Reservation <CheckCircle size={18} />
            </button>
          ) : (
            <button
              className="nav-btn nav-btn-next"
              onClick={goToNextStep}
              disabled={!validateCurrentStep()}
            >
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
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
          setUi((p) => ({ ...p, terms: false }));
          goToNextStep();
        }}
      />
    </div>
  );
}

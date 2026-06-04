// ReservationSteps.jsx (Cleaned - Removed Event Reservation step entirely)

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  ShoppingBag,
  Table,
  Calendar as CalendarIcon,
  Gift,
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
  STORE_HOURS,
  isDateClosedByTime,
  isDateFullyClosed,
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

// Dynamic steps based on reservation type
const getSteps = (reservationType) => {
  const baseSteps = ["Reservation Type", "Choose Date"];

  if (reservationType === "event") {
    // Event flow: Skip Select Table, go directly to Your Details
    return [...baseSteps, "Your Details", "Order Menu", "Reservation Summary"];
  }
  // Default for "per_table" or null
  return [
    ...baseSteps,
    "Select Table",
    "Your Details",
    "Order Menu",
    "Reservation Summary",
  ];
};

export default function ReservationSteps({ onClose, onSuccess }) {
  // ============ STATE ============
  const [reservationType, setReservationType] = useState(null); // "per_table" or "event"
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
  const [receiptFile, setReceiptFile] = useState(null);

  // Add after other state declarations
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Dynamic steps based on selected reservation type
  const currentSteps = useMemo(
    () => getSteps(reservationType),
    [reservationType],
  );

  // Real-time clock effect to update minutes every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newCurrentMinutes = now.getHours() * 60 + now.getMinutes();
      setCurrentMinutes(newCurrentMinutes);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    highChair: "No",
    muni: "",
    brgy: "",
    allergy: "None",
    customAllergy: "",
    occasion: "Casual Dining",
    customOccasion: "",
    allergyCount: "",
    pax: "",
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

  // ============ RESERVATION TYPE SELECTION ============
  const handleReservationTypeSelect = (type) => {
    setReservationType(type);
    setSelectedId(null);
    setLinkedIds([]);
  };

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
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const todayStrDate = now.toISOString().split("T")[0];
      const isToday = date === todayStrDate;
      const checkDate = new Date(date);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const isPastDate = checkDate < todayDate;

      if (allReservationsByDate[date]) {
        let activeReservations = [...allReservationsByDate[date]];

        activeReservations = activeReservations.filter((res) => {
          if (
            res.status === "Cancelled" ||
            res.status === "Completed" ||
            res.status === "Done"
          ) {
            return false;
          }
          return true;
        });

        if (isToday) {
          activeReservations = activeReservations.filter((res) => {
            const endM = timeToMin(res.endTime);
            return endM > currentTime;
          });
        }

        if (isPastDate) {
          activeReservations = [];
        }

        const formattedReservations = activeReservations.map((res) => ({
          ...res,
          tableLabel:
            TABLES_DATA.find((t) => t.id === res.table_id)?.label ||
            `Table ${res.table_id}`,
          startTimeFormatted: formatTime12Hour(res.startTime),
          endTimeFormatted: formatTime12Hour(res.endTime),
          duration: calculateDuration(res.startTime, res.endTime),
          status: res.status || "Confirmed",
        }));
        setReservationsForDate(formattedReservations);
      } else {
        const response = await axios.get(
          `${API_BASE}/reservations/by-date/${date}`,
        );

        if (response.data && Array.isArray(response.data)) {
          let activeReservations = [...response.data];

          activeReservations = activeReservations.filter((res) => {
            if (
              res.status === "Cancelled" ||
              res.status === "Completed" ||
              res.status === "Done"
            ) {
              return false;
            }
            return true;
          });

          if (isToday) {
            activeReservations = activeReservations.filter((res) => {
              const endM = timeToMin(res.endTime);
              return endM > currentTime;
            });
          }

          if (isPastDate) {
            activeReservations = [];
          }

          const formattedReservations = activeReservations.map((res) => {
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

  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

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

  const getActiveReservationCountForDate = (dateStr) => {
    if (!allReservationsByDate[dateStr]) return 0;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const todayStrDate = now.toISOString().split("T")[0];
    const isToday = dateStr === todayStrDate;
    const checkDate = new Date(dateStr);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const isPastDate = checkDate < todayDate;

    if (isPastDate) return 0;

    let activeCount = allReservationsByDate[dateStr].filter((res) => {
      if (
        res.status === "Cancelled" ||
        res.status === "Completed" ||
        res.status === "Done"
      ) {
        return false;
      }

      if (isToday) {
        const endM = timeToMin(res.endTime);
        if (endM <= currentTime) return false;
      }

      return true;
    }).length;

    return activeCount;
  };

  const totalTablesCount = TABLES_DATA.filter(
    (t) => t.status !== "maintenance",
  ).length;

  const isDateFullyBooked = (dateStr) => {
    const activeCount = getActiveReservationCountForDate(dateStr);
    return activeCount >= totalTablesCount;
  };

  const isTimeSlotAvailableForSelectedTable = (startTime, endTime) => {
    if (!selectedId) return true;

    const schedules = tableSchedules[selectedId] || [];
    const startM = timeToMin(startTime);
    const endM = timeToMin(endTime);

    return !schedules.some((reservation) => {
      const resStartM = timeToMin(reservation.startTime);
      const resEndM = timeToMin(reservation.endTime);
      return startM < resEndM && endM > resStartM;
    });
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
      setCurrentStep((prev) => Math.min(prev + 1, currentSteps.length - 1));
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
    const isEventFlow = reservationType === "event";

    switch (currentStep) {
      case 0:
        return reservationType !== null;
      case 1:
        return (
          form.date && form.date !== "" && !blockedDates.includes(form.date)
        );
      case 2:
        if (isEventFlow) {
          // Your Details step for event flow
          const isStartTimeValid = form.startTime && form.startTime !== "";
          const isEndTimeValid = form.endTime && form.endTime !== "";
          const isTimeValid = (() => {
            if (!form.startTime || !form.endTime) return false;
            const s = timeToMin(form.startTime);
            const e = timeToMin(form.endTime);
            return e - s >= 30;
          })();
          const isMuniValid = form.muni && form.muni !== "";
          const isBrgyValid = form.brgy && form.brgy !== "";
          return (
            isFirstNameValid &&
            isLastNameValid &&
            isEmailValid &&
            isPhoneValid &&
            isMuniValid &&
            isBrgyValid &&
            isStartTimeValid &&
            isEndTimeValid &&
            isTimeValid
          );
        } else {
          // Validate Select Table step for per_table
          const isPaxValid =
            form.pax && parseInt(form.pax) >= 1 && parseInt(form.pax) <= 38;
          return selectedId !== null && isPaxValid;
        }
      case 3:
        if (isEventFlow) {
          // Order Menu step for event flow
          const hasItems = selectedItems.length > 0;
          const termsAgreed = agreeToTerms;
          let meetsDownpaymentRequirement = true;
          if (orderSummary.durationHours >= 2) {
            meetsDownpaymentRequirement =
              orderSummary.downpayment >=
              orderSummary.requiredMinimumDownpayment;
          }
          return hasItems && termsAgreed && meetsDownpaymentRequirement;
        } else {
          // Your Details step for per_table
          const isStartTimeValid = form.startTime && form.startTime !== "";
          const isEndTimeValid = form.endTime && form.endTime !== "";
          const isTimeValid = (() => {
            if (!form.startTime || !form.endTime) return false;
            const s = timeToMin(form.startTime);
            const e = timeToMin(form.endTime);
            return e - s >= 30;
          })();
          const isMuniValid = form.muni && form.muni !== "";
          const isBrgyValid = form.brgy && form.brgy !== "";
          return (
            isFirstNameValid &&
            isLastNameValid &&
            isEmailValid &&
            isPhoneValid &&
            isMuniValid &&
            isBrgyValid &&
            isStartTimeValid &&
            isEndTimeValid &&
            isTimeValid
          );
        }
      case 4:
        if (isEventFlow) {
          // Reservation Summary step for event flow
          const isPaymentMethodSelected = paymentMethod !== null;
          const isReceiptUploaded = receiptFile !== null;
          return isPaymentMethodSelected && isReceiptUploaded;
        } else {
          // Order Menu step for per_table
          const hasItems = selectedItems.length > 0;
          const termsAgreed = agreeToTerms;
          let meetsDownpaymentRequirement = true;
          if (orderSummary.durationHours >= 2) {
            meetsDownpaymentRequirement =
              orderSummary.downpayment >=
              orderSummary.requiredMinimumDownpayment;
          }
          return hasItems && termsAgreed && meetsDownpaymentRequirement;
        }
      case 5:
        // Reservation Summary step for per_table
        const isPaymentMethodSelected = paymentMethod !== null;
        const isReceiptUploaded = receiptFile !== null;
        return isPaymentMethodSelected && isReceiptUploaded;
      default:
        return true;
    }
  };

  // Auto-mark step as completed
  useEffect(() => {
    const isEventFlow = reservationType === "event";

    if (currentStep === 1 && form.date && !blockedDates.includes(form.date)) {
      markStepCompleted(1);
    }
    if (currentStep === 2) {
      if (isEventFlow) {
        const isValid =
          isFirstNameValid &&
          isLastNameValid &&
          isEmailValid &&
          isPhoneValid &&
          form.muni &&
          form.muni !== "" &&
          form.brgy &&
          form.brgy !== "" &&
          form.startTime &&
          form.startTime !== "" &&
          form.endTime &&
          form.endTime !== "";
        if (isValid) markStepCompleted(2);
      } else {
        if (selectedId && form.pax && parseInt(form.pax) > 0) {
          markStepCompleted(2);
        }
      }
    }
    if (currentStep === 3) {
      if (isEventFlow) {
        if (selectedItems.length > 0) markStepCompleted(3);
      } else {
        const isValid =
          isFirstNameValid &&
          isLastNameValid &&
          isEmailValid &&
          isPhoneValid &&
          form.muni &&
          form.muni !== "" &&
          form.brgy &&
          form.brgy !== "" &&
          form.startTime &&
          form.startTime !== "" &&
          form.endTime &&
          form.endTime !== "";
        if (isValid) markStepCompleted(3);
      }
    }
    if (currentStep === 4 && selectedItems.length > 0 && !isEventFlow) {
      markStepCompleted(4);
    }
  }, [
    currentStep,
    reservationType,
    form.date,
    form.startTime,
    form.endTime,
    selectedId,
    selectedItems,
    agreeToTerms,
    blockedDates,
    form.pax,
    form.muni,
    form.brgy,
    user,
  ]);

  // ============ INITIAL LOADING ============
  useEffect(() => {
    const timer = setTimeout(() => setIsFormLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // ============ FETCH ADDRESS DATA ============
  useEffect(() => {
    if (form.muni) {
      fetchBarangays(form.muni);
    }
  }, [form.muni]);

  // ============ FETCH TABLE SCHEDULES ============
  useEffect(() => {
    const fetchAllTableSchedules = async () => {
      if (!form.date) return;
      setIsDateLoading(true);
      const schedules = {};

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const todayStrDate = now.toISOString().split("T")[0];
      const isToday = form.date === todayStrDate;

      for (const table of TABLES_DATA) {
        try {
          const response = await axios.get(
            `${API_BASE}/reservations/table-schedule`,
            {
              params: { tableId: table.id, date: form.date },
            },
          );

          let activeSchedules = [];
          if (Array.isArray(response.data)) {
            let filtered = response.data.filter((res) => {
              return (
                res.status !== "Cancelled" &&
                res.status !== "Completed" &&
                res.status !== "Done"
              );
            });

            if (isToday) {
              filtered = filtered.filter((res) => {
                const endM = timeToMin(res.endTime);
                return endM > currentTime;
              });
            }
            activeSchedules = filtered;
          }
          schedules[table.id] = activeSchedules;
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
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const todayStrDate = now.toISOString().split("T")[0];
        const isToday = form.date === todayStrDate;

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
          .filter((res) => {
            if (
              res.status === "Cancelled" ||
              res.status === "Completed" ||
              res.status === "Done"
            ) {
              return false;
            }
            const endM = timeToMin(res.endTime);
            if (isToday) {
              return endM > currentTime;
            }
            return true;
          })
          .map((res) => ({ ...res }));

        setData({ occupied: statRes.data || {}, schedule: processedSchedule });

        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        fetchAllReservationsForMonth(year, month);

        if (selectedReservationDate) {
          await fetchReservationsForDate(selectedReservationDate);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    };
    poll();
    const pollInterval = setInterval(poll, 5000);
    return () => clearInterval(pollInterval);
  }, [
    form.date,
    form.startTime,
    form.endTime,
    selectedId,
    calendarMonth,
    selectedReservationDate,
  ]);

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

  const calculateDurationInHours = useMemo(() => {
    if (!form.startTime || !form.endTime) return 0;
    const start = timeToMin(form.startTime);
    const end = timeToMin(form.endTime);
    const durationMinutes = end - start;
    return durationMinutes / 60;
  }, [form.startTime, form.endTime]);

  const orderSummary = useMemo(() => {
    const rawTotal = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const total = Math.round(rawTotal * 100) / 100;

    const twentyPercentOfOrder = total * 0.2;

    let requiredMinimumDownpayment = 0;
    const durationHours = calculateDurationInHours;

    if (durationHours >= 2) {
      requiredMinimumDownpayment = 200;
      const additionalHours = Math.floor(durationHours - 2);
      requiredMinimumDownpayment += additionalHours * 50;
    }

    const needsMoreItems =
      durationHours >= 2 && twentyPercentOfOrder < requiredMinimumDownpayment;

    const actualDownpayment = twentyPercentOfOrder;

    return {
      totalOrderPrice: total,
      downpayment: Math.round(actualDownpayment * 100) / 100,
      requiredMinimumDownpayment: requiredMinimumDownpayment,
      balance: Math.round((total - actualDownpayment) * 100) / 100,
      durationHours: durationHours,
      needsMoreItems: needsMoreItems,
      minimumOrderNeeded: requiredMinimumDownpayment * 5,
    };
  }, [selectedItems, calculateDurationInHours]);

  const tableIdsArray = useMemo(
    () => [selectedId, ...linkedIds].filter((id) => id !== null),
    [selectedId, linkedIds],
  );

  const productDisplayName = useMemo(() => {
    if (selectedItems.length === 0)
      return reservationType === "event"
        ? "Event Reservation"
        : "Table Reservation";
    if (selectedItems.length === 1) return selectedItems[0].name;
    return `${selectedItems[0].name} + ${selectedItems.length - 1} more`;
  }, [selectedItems, reservationType]);

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
      reservationType: reservationType,
      userId: localStorage.getItem("userId"),
      guestCount: parseInt(form.pax) || totalSeats,
      tableLabel: primaryTable?.label,
      linkedTables: linkedIds.map(
        (id) => TABLES_DATA.find((t) => t.id === id)?.label,
      ),
      selectedItems: selectedItems,
      packages: selectedItems,
      resDate: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      durationHours: orderSummary.durationHours,
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
      allergyCount: form.allergyCount || "0",
      occasion: getFinalOccasion,
    }),
    [
      user,
      form,
      reservationType,
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

    if (selectedId && reservationType === "per_table") {
      filtered = filtered.filter((startTime) => {
        const possibleEndTimes = timeOptions.filter((endTime) => {
          const endM = timeToMin(endTime);
          const startM = timeToMin(startTime);
          const durationValid = endM >= startM + 30 && endM <= startM + 180;
          const withinBusinessHours = endM <= maxEndTimeMinutes;
          return (
            durationValid &&
            withinBusinessHours &&
            isTimeSlotAvailableForSelectedTable(startTime, endTime)
          );
        });
        return possibleEndTimes.length > 0;
      });
    }

    return filtered;
  }, [
    timeOptions,
    form.date,
    todayStr,
    selectedId,
    tableSchedules,
    reservationType,
  ]);

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
    let filtered = timeOptions.filter((endTime) => {
      const endM = timeToMin(endTime);
      return endM >= startM + 30 && endM <= absoluteMaxEnd;
    });

    if (selectedId && form.startTime && reservationType === "per_table") {
      filtered = filtered.filter((endTime) => {
        return isTimeSlotAvailableForSelectedTable(form.startTime, endTime);
      });
    }

    return filtered;
  }, [
    form.startTime,
    timeOptions,
    selectedId,
    tableSchedules,
    reservationType,
  ]);

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
    } else if (name === "pax") {
      if (value === "") {
        setForm((prev) => ({ ...prev, pax: "" }));
      } else {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 1 && numValue <= 38) {
          setForm((prev) => ({ ...prev, pax: value }));
        }
      }
    } else if (name in user) {
      setUser((prev) => ({ ...prev, [name]: value }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBackButton = () => {
    onClose();
  };

  const onTableClick = (table) => {
    if (table.status === "maintenance") {
      alert("This table is currently under maintenance.");
      return;
    }

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
      setForm((prev) => ({ ...prev, pax: "" }));
    }
  };

  const confirmBooking = async () => {
    setIsProcessing(true);
    setUi((p) => ({ ...p, loading: true }));

    try {
      const payload = new FormData();
      const userId = localStorage.getItem("userId");

      if (!receiptFile) {
        alert("Please upload your payment receipt.");
        setIsProcessing(false);
        setUi((p) => ({ ...p, loading: false }));
        return;
      }

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
        reservationType: reservationType,
        userId: userId,
        guests: parseInt(form.pax) || totalSeats,
        pax: form.pax || totalSeats,
        allergyCount: form.allergyCount || 0,
        packageName: productDisplayName,
        totalAmount: orderSummary.totalOrderPrice,
        amount: orderSummary.downpayment,
        downpayment: orderSummary.downpayment,
        durationHours: orderSummary.durationHours,
        paymentMethod: paymentMethod || "Maya",
        tableIds: JSON.stringify(tableIdsArray),
        selectedItems: JSON.stringify(selectedItems),
        status: "Confirmed",
        brgyCode: form.brgy,
        allergy: finalAllergy,
        occasion: finalOccasion,
      };

      if (receiptFile) {
        payload.append("receipt", receiptFile);
      }

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
          guests: parseInt(form.pax) || totalSeats,
          packageName: productDisplayName,
        });
      }

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

  // ============ RENDER RESERVATION TYPE STEP ============
  const renderReservationTypeStep = () => {
    return (
      <div className="step-content step-reservation-type">
        <div className="reservation-type-cards">
          <div
            className={`reservation-type-card ${reservationType === "per_table" ? "selected" : ""}`}
            onClick={() => handleReservationTypeSelect("per_table")}
          >
            <div className="card-icon">
              <Table size={48} />
            </div>
            <div className="card-content">
              <h3>Per Table</h3>
              <p className="card-description">
                Reserve a specific table for your group
              </p>
              <div className="card-badge">
                <span>Reservation per table</span>
              </div>
            </div>
          </div>

          <div
            className={`reservation-type-card ${reservationType === "event" ? "selected" : ""}`}
            onClick={() => handleReservationTypeSelect("event")}
          >
            <div className="card-icon">
              <CalendarIcon size={48} />
            </div>
            <div className="card-content">
              <h3>Event</h3>
              <p className="card-description">
                Reserve the store for a certain event or occasion
              </p>
              <div className="card-badge">
                <span>Reservation for Event/Occasion</span>
              </div>
            </div>
          </div>
        </div>

        {reservationType && (
          <div className="reservation-type-selected">
            <CheckCircle size={20} />
            <span>
              {reservationType === "per_table"
                ? "Per Table reservation selected"
                : "Event reservation selected"}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ============ RENDER STEP CONTENT ============
  const renderStepContent = () => {
    const isEventFlow = reservationType === "event";

    switch (currentStep) {
      case 0:
        return renderReservationTypeStep();

      case 1:
        return (
          <div className="step-content step-date">
            <div className="calendar-container">
              {/* Calendar content - keep your existing calendar code here */}
              {/* ... */}
            </div>
          </div>
        );

      case 2:
        if (isEventFlow) {
          // Your Details step for event flow (same as Your Details)
          return (
            <div className="step-content step-details">
              {/* Your existing Your Details form */}
            </div>
          );
        } else {
          // Select Table step for per_table
          return form.date ? (
            <div className="step-content step-tables">
              {/* Your existing Select Table content */}
            </div>
          ) : (
            <div className="step-warning">Please select a date first</div>
          );
        }

      case 3:
        if (isEventFlow) {
          // Order Menu step for event flow
          return (
            <div className="step-content step-package">
              {/* Your existing Order Menu content */}
            </div>
          );
        } else {
          // Your Details step for per_table
          return (
            <div className="step-content step-details">
              {/* Your existing Your Details form */}
            </div>
          );
        }

      case 4:
        if (isEventFlow) {
          // Reservation Summary for event flow
          return (
            <div className="step-content step-summary">
              <ReservationSummary
                orderSummary={orderSummary}
                reservationData={fullReservationData}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                onReceiptChange={(receipt) => setReceiptFile(receipt)}
              />
            </div>
          );
        } else {
          // Order Menu step for per_table
          return (
            <div className="step-content step-package">
              {/* Your existing Order Menu content */}
            </div>
          );
        }

      case 5:
        // Reservation Summary for per_table
        return (
          <div className="step-content step-summary">
            <ReservationSummary
              orderSummary={orderSummary}
              reservationData={fullReservationData}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              onReceiptChange={(receipt) => setReceiptFile(receipt)}
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

      {!ui.menu && (
        <button className="page-back-btn" onClick={handleBackButton}>
          <ArrowLeft size={18} /> Cancel
        </button>
      )}

      <div className="reservation-flow-container">
        <StepProgress
          steps={currentSteps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />
        <div className="step-content-container">{renderStepContent()}</div>

        {ui.menu && (
          <div className="package-inline-wrapper">
            <PackageModal
              onClose={() => setUi((p) => ({ ...p, menu: false }))}
              onSelectedItemsChange={setSelectedItems}
              initialSelectedItems={selectedItems}
            />
          </div>
        )}

        <div className="step-navigation">
          <button
            className="nav-btn nav-btn-prev"
            onClick={goToPrevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={18} /> Previous
          </button>
          {currentStep === currentSteps.length - 1 ? (
            <button
              className="nav-btn nav-btn-next"
              onClick={() => {
                if (validateCurrentStep()) {
                  confirmBooking();
                }
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

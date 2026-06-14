// ReservationSteps.jsx (Clean version - Event skips Select Table, all content preserved)

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
    // Event flow: Skip Select Table, keep Order Menu (5 steps total)
    return [...baseSteps, "Your Details", "Order Menu", "Reservation Summary"];
  }
  // Default for "per_table" - removed Order Menu step (5 steps total)
  return [...baseSteps, "Select Table", "Your Details", "Reservation Summary"];
};

export default function ReservationSteps({ onClose, onSuccess }) {
  // ============ STATE ============
  const [reservationType, setReservationType] = useState(null);
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
  const [downpaymentPercentage, setDownpaymentPercentage] = useState(20);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const currentSteps = useMemo(
    () => getSteps(reservationType),
    [reservationType],
  );

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

  const isFirstNameValid = user.firstName && user.firstName.trim().length > 0;
  const isLastNameValid = user.lastName && user.lastName.trim().length > 0;
  const isEmailValid = /^\S+@\S+\.\S+$/.test(user.email);
  const isPhoneValid = user.phone.length === 11 && user.phone.startsWith("09");

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const socket = useSocket();
  const { addressData, fetchBarangays } = useAddressData();
  const todayStr = new Date().toLocaleDateString("en-CA");

  const handleReservationTypeSelect = (type) => {
    setReservationType(type);
    setSelectedId(null);
    setLinkedIds([]);
  };

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

  const fetchAllReservationsForMonth = async (year, month) => {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const response = await axios.get(
        `${API_BASE}/reservations/by-date-range`,
        { params: { startDate, endDate } },
      );

      if (response.data && Array.isArray(response.data)) {
        const groupedByDate = {};
        const countsByDate = {};

        response.data.forEach((reservation) => {
          const date = reservation.date;
          if (date) {
            if (!groupedByDate[date]) groupedByDate[date] = [];
            groupedByDate[date].push(reservation);
            countsByDate[date] = (countsByDate[date] || 0) + 1;
          }
        });

        setAllReservationsByDate(groupedByDate);
        setDateReservationCounts(countsByDate);
      }
    } catch (error) {
      console.error("Error fetching reservations for month:", error);
    }
  };

  useEffect(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    fetchAllReservationsForMonth(year, month);
  }, [calendarMonth]);

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

        // Filter by reservation type to only show reservations that match current flow
        activeReservations = activeReservations.filter((res) => {
          // For EVENT flow, only show EVENT reservations
          // For PER TABLE flow, only show PER TABLE reservations
          if (reservationType === "event") {
            return (
              res.reservationType === "event" ||
              res.reservation_type === "event"
            );
          } else {
            return (
              res.reservationType === "per_table" ||
              res.reservation_type === "per_table"
            );
          }
        });

        activeReservations = activeReservations.filter((res) => {
          if (
            res.status === "Cancelled" ||
            res.status === "Completed" ||
            res.status === "Done"
          )
            return false;
          return true;
        });

        if (isToday) {
          activeReservations = activeReservations.filter((res) => {
            const endM = timeToMin(res.endTime);
            return endM > currentTime;
          });
        }
        if (isPastDate) activeReservations = [];

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
        // Similar filtering for API response
        const response = await axios.get(
          `${API_BASE}/reservations/by-date/${date}`,
        );
        if (response.data && Array.isArray(response.data)) {
          let activeReservations = [...response.data];

          // Filter by reservation type
          activeReservations = activeReservations.filter((res) => {
            if (reservationType === "event") {
              return (
                res.reservationType === "event" ||
                res.reservation_type === "event"
              );
            } else {
              return (
                res.reservationType === "per_table" ||
                res.reservation_type === "per_table"
              );
            }
          });

          activeReservations = activeReservations.filter((res) => {
            if (
              res.status === "Cancelled" ||
              res.status === "Completed" ||
              res.status === "Done"
            )
              return false;
            return true;
          });
          if (isToday) {
            activeReservations = activeReservations.filter((res) => {
              const endM = timeToMin(res.endTime);
              return endM > currentTime;
            });
          }
          if (isPastDate) activeReservations = [];

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
      // Filter by reservation type based on current flow
      if (reservationType === "event") {
        if (res.reservationType !== "event" && res.reservation_type !== "event")
          return false;
      } else {
        if (
          res.reservationType !== "per_table" &&
          res.reservation_type !== "per_table"
        )
          return false;
      }

      if (
        res.status === "Cancelled" ||
        res.status === "Completed" ||
        res.status === "Done"
      )
        return false;
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
    const isEventFlow = reservationType === "event";

    if (isEventFlow) {
      // For EVENT: Check if there's ANY event reservation on this date
      const reservations = allReservationsByDate[dateStr] || [];
      const eventReservations = reservations.filter(
        (res) =>
          res.reservationType === "event" || res.reservation_type === "event",
      );
      // If there's at least one event reservation, the date is fully booked
      return eventReservations.length > 0;
    } else {
      // For PER TABLE: Check if all tables are booked
      return getActiveReservationCountForDate(dateStr) >= totalTablesCount;
    }
  };

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
          // Select Table step for per_table
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
          // Reservation Summary step for EVENT - requires payment method and receipt
          return paymentMethod !== null && receiptFile !== null;
        } else {
          // Reservation Summary step for PER TABLE - NO payment method or receipt required
          return true;
        }
      default:
        return true;
    }
  };

  // Auto-mark step as completed
  useEffect(() => {
    const isEventFlow = reservationType === "event";

    if (currentStep === 1 && form.date && !blockedDates.includes(form.date))
      markStepCompleted(1);
    if (currentStep === 2) {
      if (isEventFlow) {
        // Your Details validation for event (unchanged)
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
        // Select Table validation for per_table (unchanged)
        if (selectedId && form.pax && parseInt(form.pax) > 0)
          markStepCompleted(2);
      }
    }
    if (currentStep === 3) {
      if (isEventFlow) {
        // Order Menu validation for event (unchanged)
        if (selectedItems.length > 0) markStepCompleted(3);
      } else {
        // Your Details validation for per_table (now step 3)
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

  useEffect(() => {
    const timer = setTimeout(() => setIsFormLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (form.muni) fetchBarangays(form.muni);
  }, [form.muni]);

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
            let filtered = response.data.filter(
              (res) =>
                res.status !== "Cancelled" &&
                res.status !== "Completed" &&
                res.status !== "Done",
            );
            if (isToday)
              filtered = filtered.filter(
                (res) => timeToMin(res.endTime) > currentTime,
              );
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
            )
              return false;
            const endM = timeToMin(res.endTime);
            if (isToday) return endM > currentTime;
            return true;
          })
          .map((res) => ({ ...res }));
        setData({ occupied: statRes.data || {}, schedule: processedSchedule });
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        fetchAllReservationsForMonth(year, month);
        if (selectedReservationDate)
          await fetchReservationsForDate(selectedReservationDate);
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

  const primaryTable = useMemo(
    () => TABLES_DATA.find((t) => t.id === selectedId),
    [selectedId],
  );
  const hasActiveReservationForTable = (tableId) =>
    (tableSchedules[tableId] || []).length > 0;
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
    return (end - start) / 60;
  }, [form.startTime, form.endTime]);

  const orderSummary = useMemo(() => {
    const rawTotal = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const total = Math.round(rawTotal * 100) / 100;

    // Calculate downpayment based on selected percentage (for EVENT flow)
    const selectedPercentage =
      reservationType === "event" ? downpaymentPercentage : 20;
    const calculatedDownpayment = total * (selectedPercentage / 100);

    let requiredMinimumDownpayment = 0;
    const durationHours = calculateDurationInHours;
    if (durationHours >= 2) {
      requiredMinimumDownpayment = 200;
      const additionalHours = Math.floor(durationHours - 2);
      requiredMinimumDownpayment += additionalHours * 50;
    }
    const needsMoreItems =
      durationHours >= 2 && calculatedDownpayment < requiredMinimumDownpayment;
    const actualDownpayment = calculatedDownpayment;
    return {
      totalOrderPrice: total,
      downpayment: Math.round(actualDownpayment * 100) / 100,
      requiredMinimumDownpayment: requiredMinimumDownpayment,
      balance: Math.round((total - actualDownpayment) * 100) / 100,
      durationHours: durationHours,
      needsMoreItems: needsMoreItems,
      minimumOrderNeeded: requiredMinimumDownpayment * 5,
      selectedPercentage: selectedPercentage,
    };
  }, [
    selectedItems,
    calculateDurationInHours,
    reservationType,
    downpaymentPercentage,
  ]);

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

  const timeOptions = useMemo(() => {
    const opts = [];
    const isPerTable = reservationType === "per_table";
    const isEventFlow = reservationType === "event";
    const stepMinutes = isEventFlow ? 60 : 15;
    // For Per Table: start at 2:00 PM (14:00), end at 10:00 PM (22:00)
    // For EVENT: start at 10:00 AM (10:00), end at 9:00 PM (21:00) so end time is 12:00 AM
    const actualStartHour = isPerTable ? 14 : 10;
    const actualEndHour = isPerTable ? 22 : 21; // EVENT ends at 9:00 PM

    for (let h = actualStartHour; h <= actualEndHour; h++) {
      for (let m = 0; m < 60; m += stepMinutes) {
        if (h === actualEndHour && m > 30) break;
        const hour12 = h % 12 || 12;
        const period = h < 12 ? "AM" : "PM";
        opts.push(
          `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`,
        );
      }
    }
    return opts;
  }, [reservationType]);

  // Update maxEndTimeMinutes - for EVENT allow up to 12:00 AM (24:00)
  const maxEndTimeMinutes = useMemo(() => {
    const isEventFlow = reservationType === "event";
    // For EVENT: allow up to 12:00 AM (24:00 or 1440 minutes)
    // For Per Table: keep at 10:30 PM (22:30 or 1350 minutes)
    return isEventFlow ? 24 * 60 : 22 * 60 + 30;
  }, [reservationType]);

  const availableStartTimeOptions = useMemo(() => {
    let filtered = timeOptions;

    const isPerTable = reservationType === "per_table";
    const isEventFlow = reservationType === "event";
    const minStartTimeMinutes = isPerTable ? 14 * 60 : 10 * 60;
    const currentMaxEndTime = isEventFlow ? 24 * 60 : 22 * 60 + 30;

    if (form.date === todayStr) {
      const thresh = new Date().getHours() * 60 + new Date().getMinutes() + 15;
      filtered = filtered.filter(
        (t) => timeToMin(t) >= Math.max(thresh, minStartTimeMinutes),
      );
    } else {
      filtered = filtered.filter((t) => timeToMin(t) >= minStartTimeMinutes);
    }

    if (isEventFlow) {
      filtered = filtered.filter((startTime) => {
        const startM = timeToMin(startTime);
        const endM = startM + 180; // 3 hours later

        // Add 1 hour buffer (60 minutes) for cleanup/setup between events
        const bufferedStartM = startM;
        const bufferedEndM = endM;

        // Check if this time slot (with buffer) conflicts with any existing reservation
        const reservations = allReservationsByDate[form.date] || [];

        const isOverlapping = reservations.some((reservation) => {
          if (
            reservation.status === "Cancelled" ||
            reservation.status === "Completed" ||
            reservation.status === "Done"
          ) {
            return false;
          }

          const resStartM = timeToMin(reservation.startTime);
          const resEndM = timeToMin(reservation.endTime);

          // Add 1 hour buffer AFTER each existing reservation
          // So if reservation ends at 1:00 PM, next available is 2:00 PM (1:00 PM + 60 min)
          const resEndWithBuffer = resEndM + 60; // 1 hour buffer

          // Check if new slot overlaps with existing reservation OR its buffer zone
          return startM < resEndWithBuffer && endM > resStartM;
        });

        return !isOverlapping;
      });
    } else {
      filtered = filtered.filter((startTime) => {
        const startM = timeToMin(startTime);
        if (startM > 22 * 60) return false;
        const minEndM = startM + 30;
        return minEndM <= currentMaxEndTime;
      });
    }

    if (selectedId && reservationType === "per_table") {
      filtered = filtered.filter((startTime) => {
        const possibleEndTimes = timeOptions.filter((endTime) => {
          const endM = timeToMin(endTime);
          const startM = timeToMin(startTime);
          const durationValid = endM >= startM + 30 && endM <= startM + 180;
          const withinBusinessHours = endM <= currentMaxEndTime;
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
    allReservationsByDate,
  ]);

  const filteredEndTimeOptions = useMemo(() => {
    if (!form.startTime) return [];
    const startM = timeToMin(form.startTime);
    const isEventFlow = reservationType === "event";
    const currentMaxEndTime = isEventFlow ? 24 * 60 : 22 * 60 + 30;

    if (isEventFlow) {
      const endM = startM + 180;

      const reservations = allReservationsByDate[form.date] || [];
      const isOverlapping = reservations.some((reservation) => {
        if (
          reservation.status === "Cancelled" ||
          reservation.status === "Completed" ||
          reservation.status === "Done"
        ) {
          return false;
        }
        const resStartM = timeToMin(reservation.startTime);
        const resEndM = timeToMin(reservation.endTime);
        return startM < resEndM && endM > resStartM;
      });

      if (isOverlapping) return [];

      const endHour = Math.floor(endM / 60);
      const endMinute = endM % 60;
      const endHour12 = endHour % 12 === 0 ? 12 : endHour % 12;
      const endPeriod = endHour >= 12 ? "AM" : "AM";
      // Handle 12:00 AM display
      const displayHour = endHour === 0 || endHour === 24 ? 12 : endHour12;
      const displayPeriod =
        endHour === 0 || endHour === 24 ? "AM" : endHour >= 12 ? "PM" : "AM";
      const endTimeString = `${displayHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")} ${displayPeriod}`;

      return [endTimeString];
    }

    if (startM >= 21 * 60 + 30) {
      if (currentMaxEndTime >= startM + 30) {
        const tenThirtyPM = timeOptions.find(
          (t) => t.includes("10:30") && t.includes("PM"),
        );
        return tenThirtyPM ? [tenThirtyPM] : [];
      }
      return [];
    }

    let filtered = timeOptions.filter((endTime) => {
      const endM = timeToMin(endTime);
      return endM >= startM + 30 && endM <= currentMaxEndTime;
    });

    if (selectedId && form.startTime && reservationType === "per_table") {
      filtered = filtered.filter((endTime) =>
        isTimeSlotAvailableForSelectedTable(form.startTime, endTime),
      );
    }
    return filtered;
  }, [
    form.startTime,
    timeOptions,
    selectedId,
    tableSchedules,
    reservationType,
    allReservationsByDate,
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

  // Auto-set end time for EVENT when start time changes
  useEffect(() => {
    if (reservationType === "event" && form.startTime) {
      const startM = timeToMin(form.startTime);
      const endM = startM + 180;
      const endHour = Math.floor(endM / 60);
      const endMinute = endM % 60;
      // Handle 12:00 AM display (hour 0 or 24 should show as 12)
      const displayHour =
        endHour === 0 || endHour === 24 ? 12 : endHour % 12 || 12;
      const displayPeriod =
        endHour === 0 || endHour === 24 ? "AM" : endHour >= 12 ? "PM" : "AM";
      const endTimeString = `${displayHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")} ${displayPeriod}`;

      setForm((prev) => ({
        ...prev,
        endTime: endTimeString,
      }));
    }
  }, [form.startTime, reservationType]);

  const handleBackButton = () => onClose();

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
        tableIds: JSON.stringify(tableIdsArray),
        selectedItems: JSON.stringify(selectedItems),
        status: "Confirmed",
        brgyCode: form.brgy,
        allergy: finalAllergy,
        occasion: finalOccasion,
      };

      // For PER TABLE, send default payment method (no receipt needed)
      if (reservationType === "per_table") {
        submission.paymentMethod = "Cash";
        // No receipt for PER TABLE
      } else {
        // For EVENT, require payment method and receipt
        if (!receiptFile) {
          alert("Please upload your payment receipt.");
          setIsProcessing(false);
          setUi((p) => ({ ...p, loading: false }));
          return;
        }
        submission.paymentMethod = paymentMethod || "Maya";
        payload.append("receipt", receiptFile);
      }

      Object.entries(submission).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload.append(k, v);
      });

      // Also append snake_case variant to be explicit for backend form parsers
      if (reservationType) {
        try {
          payload.append(
            "reservation_type",
            String(reservationType).toLowerCase(),
          );
        } catch (err) {
          // ignore FormData append failures silently
        }
      }

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
  const renderReservationTypeStep = () => (
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
            <h3>Private Event</h3>
            <p className="card-description">
              Book our entire venue for your next party or gathering.
            </p>
            <div className="card-badge">
              <span>Book now</span>
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

  const renderStepContent = () => {
    const isEventFlow = reservationType === "event";

    switch (currentStep) {
      case 0:
        return renderReservationTypeStep();
      case 1:
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
                          )
                            years.push(i);
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
                  const prevMonthDays = new Date(year, month, 0).getDate();

                  const isPerTable = reservationType === "per_table";
                  const isEventFlow = reservationType === "event";

                  // Calculate min allowed date for EVENT (2 weeks from today)
                  const minEventDate = new Date();
                  minEventDate.setHours(0, 0, 0, 0);
                  minEventDate.setDate(minEventDate.getDate() + 14); // 2 weeks from now

                  for (let i = startDayOfWeek - 1; i >= 0; i--) {
                    const dayNum = prevMonthDays - i;
                    const date = new Date(year, month - 1, dayNum);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const isTimeClosed = isDateClosedByTime(
                      dateStr,
                      currentMinutes,
                    );
                    const currentDate = new Date(dateStr);
                    currentDate.setHours(0, 0, 0, 0);
                    const isFutureDate = currentDate > today;
                    const isEventDateValid = isEventFlow
                      ? currentDate >= minEventDate
                      : true;
                    const isDisabledForPerTable = isPerTable && isFutureDate;
                    const isDisabledForEvent = isEventFlow && !isEventDateValid;
                    const isDisabled =
                      isDisabledForPerTable || isDisabledForEvent;

                    calendarDays.push({
                      day: dayNum,
                      date: dateStr,
                      isCurrentMonth: false,
                      isToday: dateStr === today.toISOString().split("T")[0],
                      isSelected: form.date === dateStr,
                      isBlocked: blockedDates.includes(dateStr) || isTimeClosed,
                      isPast: date < today,
                      isTimeClosed,
                      isDisabled,
                    });
                  }
                  for (let i = 1; i <= daysInMonth; i++) {
                    const date = new Date(year, month, i);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const reservationCount =
                      getActiveReservationCountForDate(dateStr);
                    const isFullyBooked = isDateFullyBooked(dateStr);
                    const isTimeClosed = isDateClosedByTime(
                      dateStr,
                      currentMinutes,
                    );
                    const currentDate = new Date(dateStr);
                    currentDate.setHours(0, 0, 0, 0);
                    const isFutureDate = currentDate > today;
                    const isEventDateValid = isEventFlow
                      ? currentDate >= minEventDate
                      : true;
                    const isDisabledForPerTable = isPerTable && isFutureDate;
                    const isDisabledForEvent = isEventFlow && !isEventDateValid;
                    const isDisabled =
                      isDisabledForPerTable || isDisabledForEvent;

                    calendarDays.push({
                      day: i,
                      date: dateStr,
                      isCurrentMonth: true,
                      isToday: dateStr === today.toISOString().split("T")[0],
                      isSelected: form.date === dateStr,
                      isBlocked: blockedDates.includes(dateStr) || isTimeClosed,
                      isPast: date < today,
                      isTimeClosed,
                      reservationCount,
                      isFullyBooked,
                      hasReservations: reservationCount > 0 && !isFullyBooked,
                      isDisabled,
                    });
                  }
                  const remainingCells = 42 - calendarDays.length;
                  for (let i = 1; i <= remainingCells; i++) {
                    const date = new Date(year, month + 1, i);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const isTimeClosed = isDateClosedByTime(
                      dateStr,
                      currentMinutes,
                    );
                    const currentDate = new Date(dateStr);
                    currentDate.setHours(0, 0, 0, 0);
                    const isFutureDate = currentDate > today;
                    const isEventDateValid = isEventFlow
                      ? currentDate >= minEventDate
                      : true;
                    const isDisabledForPerTable = isPerTable && isFutureDate;
                    const isDisabledForEvent = isEventFlow && !isEventDateValid;
                    const isDisabled =
                      isDisabledForPerTable || isDisabledForEvent;

                    calendarDays.push({
                      day: i,
                      date: dateStr,
                      isCurrentMonth: false,
                      isToday: dateStr === today.toISOString().split("T")[0],
                      isSelected: form.date === dateStr,
                      isBlocked: blockedDates.includes(dateStr) || isTimeClosed,
                      isPast: date < today,
                      isTimeClosed,
                      isDisabled,
                    });
                  }
                  return calendarDays.map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`calendar-day ${day.isSelected ? "selected" : ""} ${day.isBlocked ? "blocked" : ""} ${day.isToday ? "today" : ""} ${!day.isCurrentMonth ? "other-month" : ""} ${day.isPast && !day.isSelected ? "past" : ""} ${day.isTimeClosed && !day.isSelected ? "time-closed" : ""} ${day.hasReservations && !day.isSelected && !day.isBlocked ? "has-reservations" : ""} ${day.isFullyBooked && !day.isSelected && !day.isBlocked ? "fully-booked" : ""} ${day.isDisabled && reservationType === "per_table" ? "per-table-disabled" : ""} ${day.isDisabled && reservationType === "event" ? "event-disabled" : ""}`}
                      disabled={
                        day.isBlocked ||
                        (day.isPast && !day.isSelected) ||
                        day.isTimeClosed ||
                        day.isDisabled
                      }
                      onClick={async () => {
                        if (
                          !day.isBlocked &&
                          !(day.isPast && !day.isSelected) &&
                          !day.isTimeClosed &&
                          !day.isDisabled
                        ) {
                          const syntheticEvent = {
                            target: { name: "date", value: day.date },
                          };
                          const isBlocked = handleDateSelection(syntheticEvent);
                          if (!isBlocked) {
                            setSelectedId(null);
                            setLinkedIds([]);
                            setForm((prev) => ({
                              ...prev,
                              startTime: "",
                              endTime: "",
                              pax: "",
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
                  ));
                })()}
              </div>
              <input type="hidden" name="date" value={form.date} />
              {selectedReservationDate &&
                selectedReservationDate === form.date && (
                  <div className="reservation-details-container">
                    <div className="reservation-details-header">
                      <Clock size={16} />
                      <h4>
                        Reservations for{" "}
                        {new Date(selectedReservationDate).toLocaleDateString(
                          "default",
                          { month: "long", day: "numeric", year: "numeric" },
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
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="reservation-details-empty">
                        <Calendar size={32} />
                        <p>No active reservations for this date</p>
                        <span>
                          Click on a date with yellow highlight to view active
                          reservations
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        );
      case 2:
        if (isEventFlow) {
          // Your Details step for EVENT with disabled end time
          return (
            <div className="step-content step-details">
              <div className="reservation-form-grid">
                <div className="time-selection-row">
                  <div className="input-group">
                    <label>
                      <Clock size={12} /> START TIME
                    </label>
                    <select
                      name="startTime"
                      className="res-input-dropdown"
                      value={form.startTime}
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
                      disabled={true}
                    >
                      <option value="">Select end time</option>
                      {filteredEndTimeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <small
                      className="end-time-hint"
                      style={{
                        display: "block",
                        marginTop: "5px",
                        color: "#f38d31",
                        fontSize: "11px",
                      }}
                    >
                      End time is automatically set to 3 hours after start time
                    </small>
                  </div>
                </div>
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
                  <small className="input-hint">
                    11 digits starting with 09
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
                <div className="input-group guests-auto-field">
                  <label>
                    <Users size={12} /> GUESTS
                  </label>
                  <div className="guests-auto-display">
                    <input
                      type="text"
                      value="35 guest(s)"
                      readOnly
                      className="guests-auto-input"
                      style={{
                        backgroundColor: "#f5f5f5",
                        cursor: "not-allowed",
                      }}
                    />
                    <div className="guests-hint-success">
                      <CheckCircle size={14} />
                      <span>
                        Event reservation: Fixed at 35 guests (maximum capacity)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="input-group">
                  <label>
                    <PartyPopper size={12} /> OCCASION
                  </label>
                  <select
                    name="occasion"
                    className="res-input-dropdown"
                    value={form.occasion}
                    onChange={handleInputChange}
                  >
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
                    <AlertCircle size={12} /> ALLERGIES
                  </label>
                  <select
                    name="allergy"
                    className="res-input-dropdown"
                    value={form.allergy}
                    onChange={handleInputChange}
                  >
                    {ALLERGY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {form.allergy === "Specify all Allergy" && (
                    <small className="allergy-hint">
                      Please specify all allergies in your group
                    </small>
                  )}
                  {form.allergy === "Specify all Allergy" && (
                    <input
                      type="text"
                      name="customAllergy"
                      placeholder="Please specify all allergies (e.g., Peanuts, Shellfish, Dairy)"
                      value={form.customAllergy}
                      onChange={handleInputChange}
                      className="custom-allergy-input"
                    />
                  )}
                  {form.allergy !== "None" && (
                    <div className="allergy-count-field">
                      <label className="allergy-count-label">
                        <Users size={14} /> How many people have this allergy?
                      </label>
                      <div className="allergy-count-input-wrapper">
                        <input
                          type="number"
                          name="allergyCount"
                          className="allergy-count-input"
                          min="1"
                          max={35}
                          value={form.allergyCount}
                          onChange={handleInputChange}
                          placeholder="Enter number (1-35)"
                        />
                        <span className="allergy-count-hint">
                          Out of 35 total guest(s)
                        </span>
                      </div>
                    </div>
                  )}
                  {form.allergy !== "None" && (
                    <div className="allergy-disclaimer">
                      <AlertCircle size={12} className="disclaimer-icon" />
                      <span>
                        Disclaimer: If you have allergies related to certain
                        ingredients, substitutions or ingredient removals may be
                        necessary, which can slightly change the taste, texture,
                        or overall flavor compared to the original product.
                        Hangout Resto Bar will not be held responsible if a
                        customer consumes food that may cause allergic
                        reactions, including food ordered by or shared with
                        their companions or friends.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          // Select Table step for PER TABLE
          return form.date ? (
            <div className="step-content step-tables">
              <div className="pax-field-container">
                <div className="input-group pax-input-group">
                  <label>
                    <Users size={12} /> NUMBER OF GUESTS (PAX)
                    {!selectedId && (
                      <span className="pax-field-hint">
                        {" "}
                        (Select a table first)
                      </span>
                    )}
                  </label>
                  <div className="pax-input-wrapper">
                    <button
                      type="button"
                      className="pax-btn pax-btn-decrease"
                      onClick={() => {
                        const currentPax = parseInt(form.pax) || 0;
                        if (currentPax > 1)
                          setForm((prev) => ({
                            ...prev,
                            pax: String(currentPax - 1),
                          }));
                      }}
                      disabled={
                        !selectedId || !form.pax || parseInt(form.pax) <= 1
                      }
                    >
                      -
                    </button>
                    <input
                      type="number"
                      name="pax"
                      className="pax-input"
                      min="1"
                      max="38"
                      value={form.pax}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "")
                          setForm((prev) => ({ ...prev, pax: "" }));
                        else {
                          const numValue = parseInt(value);
                          if (
                            !isNaN(numValue) &&
                            numValue >= 1 &&
                            numValue <= 38
                          )
                            setForm((prev) => ({ ...prev, pax: value }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === "e" ||
                          e.key === "E" ||
                          e.key === "-" ||
                          e.key === "+" ||
                          e.key === "."
                        )
                          e.preventDefault();
                      }}
                      placeholder={
                        selectedId
                          ? "Enter number of guests (1-38)"
                          : "Select a table first"
                      }
                      disabled={!selectedId}
                    />
                    <button
                      type="button"
                      className="pax-btn pax-btn-increase"
                      onClick={() => {
                        const currentPax = parseInt(form.pax) || 0;
                        if (currentPax < 38)
                          setForm((prev) => ({
                            ...prev,
                            pax: String(currentPax + 1),
                          }));
                      }}
                      disabled={
                        !selectedId || !form.pax || parseInt(form.pax) >= 38
                      }
                    >
                      +
                    </button>
                  </div>
                  {!selectedId && (
                    <div className="pax-warning">
                      <AlertCircle size={12} />
                      <span>
                        Please select a table before entering number of guests
                      </span>
                    </div>
                  )}
                  {selectedId && (
                    <div className="pax-hint">
                      <Users size={12} />
                      <span>Minimum 1 guest, Maximum 38 guests</span>
                    </div>
                  )}
                </div>
              </div>
              {selectedId && data.schedule && data.schedule.length > 0 && (
                <div className="table-schedule-section">
                  <h4 className="schedule-header">
                    <Clock size={14} /> Active Slots for {primaryTable?.label}
                  </h4>
                  <div className="schedule-list">
                    {data.schedule
                      .filter((res) => {
                        const endM = timeToMin(res.endTime);
                        const now = new Date();
                        const currentTime =
                          now.getHours() * 60 + now.getMinutes();
                        const todayStrDate = now.toISOString().split("T")[0];
                        const isToday = form.date === todayStrDate;
                        if (isToday) return endM > currentTime;
                        return true;
                      })
                      .map((res, i) => {
                        const itemClass = getScheduleItemClassWithColor(res);
                        const displayText = getStatusDisplayText(res);
                        return (
                          <div
                            key={i}
                            className={`schedule-item-3d ${itemClass}`}
                          >
                            <Clock size={12} />
                            <span className="schedule-time">
                              {formatTime(res.startTime)} -{" "}
                              {formatTime(res.endTime)}
                            </span>
                            <span className="schedule-status">
                              {displayText}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  {data.schedule.filter((res) => {
                    const endM = timeToMin(res.endTime);
                    const now = new Date();
                    const currentTime = now.getHours() * 60 + now.getMinutes();
                    const todayStrDate = now.toISOString().split("T")[0];
                    const isToday = form.date === todayStrDate;
                    if (isToday) return endM > currentTime;
                    return true;
                  }).length === 0 && (
                    <div className="no-active-slots">
                      <CheckCircle size={16} />
                      <span>No active reservations for this table</span>
                    </div>
                  )}
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
                  onClick={() => setIsLinkMode(!isLinkMode)}
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
        }
      case 3:
        if (isEventFlow) {
          // Order Menu step for EVENT with package selection cards
          const meetsDownpaymentRequirement = () => {
            if (orderSummary.durationHours >= 2) {
              return (
                orderSummary.downpayment >=
                orderSummary.requiredMinimumDownpayment
              );
            }
            return true;
          };
          const isDownpaymentRequirementMet = meetsDownpaymentRequirement();

          const percentageOptions = [20, 30, 40, 50, 60, 70, 80, 90, 100];

          // Package options
          const packageOptions = [
            {
              id: "standard",
              name: "Standard Package",
              price: 10000,
              description: "₱10,000 Consume",
            },
            {
              id: "premium",
              name: "Premium Package",
              price: 12500,
              description: "₱12,500 Consume",
            },
          ];

          return (
            <div className="step-content step-package">
              {/* Package Selection Cards */}
              <div className="event-package-cards">
                {packageOptions.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`package-card ${selectedPackage === pkg.id ? "selected" : ""}`}
                    onClick={() => {
                      const newSelectedPackage =
                        selectedPackage === pkg.id ? null : pkg.id;
                      setSelectedPackage(newSelectedPackage);
                      if (newSelectedPackage) {
                        const packageItem = {
                          name: pkg.name,
                          price: pkg.price,
                          quantity: 1,
                          id: pkg.id,
                        };
                        setSelectedItems([packageItem]);
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  >
                    <div className="package-card-header">
                      <h3>{pkg.name}</h3>
                    </div>
                    <div className="package-card-price">
                      <span className="price">
                        ₱{pkg.price.toLocaleString()}
                      </span>
                      <span className="price-type">Consume</span>
                    </div>
                    {selectedPackage === pkg.id && (
                      <div className="package-card-check">
                        <CheckCircle size={24} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedPackage && (
                <div className="package-summary">
                  <div className="order-summary-header">
                    <h4>Selected Package</h4>
                  </div>

                  <div className="package-item">
                    <span>
                      {selectedPackage === "standard"
                        ? "Standard Package"
                        : "Premium Package"}{" "}
                      x1
                    </span>
                    <span>
                      ₱
                      {(selectedPackage === "standard" ? 10000 : 12500).toFixed(
                        2,
                      )}
                    </span>
                  </div>

                  <div className="package-total">
                    <strong>
                      Total: ₱
                      {(selectedPackage === "standard" ? 10000 : 12500).toFixed(
                        2,
                      )}
                    </strong>
                  </div>

                  {orderSummary.durationHours >= 2 && (
                    <div className="duration-info">
                      <Clock size={14} />
                      <span>
                        Reservation Duration: {orderSummary.durationHours}{" "}
                        hour(s)
                      </span>
                    </div>
                  )}

                  <div className="downpayment-percentage-section">
                    <label className="percentage-label">
                      <span style={{ fontWeight: "600", color: "#f38d31" }}>
                        Select Downpayment Percentage:
                      </span>
                    </label>
                    <div className="percentage-buttons">
                      {percentageOptions.map((percent) => (
                        <button
                          key={percent}
                          type="button"
                          className={`percentage-btn ${downpaymentPercentage === percent ? "active" : ""}`}
                          onClick={() => setDownpaymentPercentage(percent)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            border:
                              downpaymentPercentage === percent
                                ? "2px solid #f38d31"
                                : "1px solid #ddd",
                            background:
                              downpaymentPercentage === percent
                                ? "#fff8f0"
                                : "#fff",
                            color:
                              downpaymentPercentage === percent
                                ? "#f38d31"
                                : "#666",
                            cursor: "pointer",
                            fontWeight:
                              downpaymentPercentage === percent ? "600" : "400",
                            transition: "all 0.2s",
                          }}
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="package-downpayment">
                    <div className="downpayment-row">
                      <span style={{ color: "#f38d31", fontWeight: "800" }}>
                        Downpayment ({orderSummary.selectedPercentage}%):
                      </span>
                      <strong style={{ color: "#f38d31" }}>
                        ₱{orderSummary.downpayment.toFixed(2)}
                      </strong>
                    </div>

                    {orderSummary.durationHours >= 2 &&
                      orderSummary.requiredMinimumDownpayment >
                        orderSummary.downpayment && (
                        <div className="required-minimum-warning">
                          <span className="required-label">
                            Minimum Required:
                          </span>
                          <span className="required-amount">
                            ₱
                            {orderSummary.requiredMinimumDownpayment.toFixed(2)}
                          </span>
                        </div>
                      )}
                  </div>

                  <div className="package-balance">
                    <span style={{ color: "#666" }}>Remaining Balance:</span>
                    <strong>₱{orderSummary.balance.toFixed(2)}</strong>
                  </div>

                  {orderSummary.durationHours >= 2 && (
                    <div
                      className={`duration-requirement ${!isDownpaymentRequirementMet ? "warning" : "success"}`}
                    >
                      <AlertCircle size={14} />
                      <span>
                        {!isDownpaymentRequirementMet ? (
                          <>
                            ⚠️ Minimum downpayment of ₱
                            {orderSummary.requiredMinimumDownpayment} required
                            for {orderSummary.durationHours} hour reservation.
                            Please select a higher percentage.
                          </>
                        ) : (
                          <>
                            ✓ Downpayment requirement met for{" "}
                            {orderSummary.durationHours} hour reservation
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {orderSummary.durationHours >= 2 &&
                    !isDownpaymentRequirementMet && (
                      <div className="requirement-blocked-warning">
                        <AlertCircle size={16} />
                        <span>
                          You cannot proceed until the minimum downpayment
                          requirement is met.
                        </span>
                      </div>
                    )}

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
        } else {
          // Your Details step for PER TABLE
          return (
            <div className="step-content step-details">
              <div className="reservation-form-grid">
                <div className="time-selection-row">
                  <div className="input-group">
                    <label>
                      <Clock size={12} /> START TIME
                    </label>
                    <select
                      name="startTime"
                      className="res-input-dropdown"
                      value={form.startTime}
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
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
                  <small className="input-hint">
                    11 digits starting with 09
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
                <div className="input-group guests-auto-field">
                  <label>
                    <Users size={12} /> GUESTS
                  </label>
                  <div className="guests-auto-display">
                    <input
                      type="text"
                      value={
                        form.pax && parseInt(form.pax) > 0
                          ? `${form.pax} guest(s)`
                          : "Not specified yet"
                      }
                      readOnly
                      className={`guests-auto-input ${!form.pax || parseInt(form.pax) <= 0 ? "empty-value" : ""}`}
                    />
                    {!form.pax || parseInt(form.pax) <= 0 ? (
                      <div className="guests-hint-warning">
                        <AlertCircle size={14} />
                        <span>
                          Please enter number of guests in Step 2 (Select Table)
                        </span>
                      </div>
                    ) : (
                      <div className="guests-hint-success">
                        <CheckCircle size={14} />
                        <span>
                          Auto-populated from Pax field in previous step
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="input-group">
                  <label>
                    <PartyPopper size={12} /> OCCASION
                  </label>
                  <select
                    name="occasion"
                    className="res-input-dropdown"
                    value={form.occasion}
                    onChange={handleInputChange}
                  >
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
                    <AlertCircle size={12} /> ALLERGIES
                  </label>
                  <select
                    name="allergy"
                    className="res-input-dropdown"
                    value={form.allergy}
                    onChange={handleInputChange}
                  >
                    {ALLERGY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {form.allergy === "Specify all Allergy" && (
                    <small className="allergy-hint">
                      Please specify all allergies in your group
                    </small>
                  )}
                  {form.allergy === "Specify all Allergy" && (
                    <input
                      type="text"
                      name="customAllergy"
                      placeholder="Please specify all allergies (e.g., Peanuts, Shellfish, Dairy)"
                      value={form.customAllergy}
                      onChange={handleInputChange}
                      className="custom-allergy-input"
                    />
                  )}
                  {form.allergy !== "None" && (
                    <div className="allergy-count-field">
                      <label className="allergy-count-label">
                        <Users size={14} /> How many people have this allergy?
                      </label>
                      <div className="allergy-count-input-wrapper">
                        <input
                          type="number"
                          name="allergyCount"
                          className="allergy-count-input"
                          min="1"
                          max={parseInt(form.pax) || totalSeats || 10}
                          value={form.allergyCount}
                          onChange={handleInputChange}
                          placeholder={`Enter number (1-${parseInt(form.pax) || totalSeats || 10})`}
                        />
                        <span className="allergy-count-hint">
                          Out of {parseInt(form.pax) || totalSeats || 0} total
                          guest(s)
                        </span>
                      </div>
                    </div>
                  )}
                  {form.allergy !== "None" && (
                    <div className="allergy-disclaimer">
                      <AlertCircle size={12} className="disclaimer-icon" />
                      <span>
                        Disclaimer: If you have allergies related to certain
                        ingredients, substitutions or ingredient removals may be
                        necessary, which can slightly change the taste, texture,
                        or overall flavor compared to the original product.
                        Hangout Resto Bar will not be held responsible if a
                        customer consumes food that may cause allergic
                        reactions, including food ordered by or shared with
                        their companions or friends.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }
      case 4:
        if (isEventFlow) {
          // EVENT - full summary with payment method and receipt upload
          return (
            <div className="step-content step-summary">
              <ReservationSummary
                orderSummary={orderSummary}
                reservationData={fullReservationData}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                onReceiptChange={(receipt) => setReceiptFile(receipt)}
                showOrderDetails={true}
              />
            </div>
          );
        } else {
          // PER TABLE - simplified summary without payment method and receipt upload
          return (
            <div className="step-content step-summary">
              <ReservationSummary
                orderSummary={orderSummary}
                reservationData={fullReservationData}
                showOrderDetails={false}
              />
            </div>
          );
        }
      default:
        return null;
    }
  };

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
                if (validateCurrentStep()) confirmBooking();
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

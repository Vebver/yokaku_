// TableReservationUtils.js
export const sanitizeStringInput = (value) => {
  return value.replace(/[^a-zA-Z\s\-'\.]/g, "");
};

export const timeToMin = (t) => {
  if (!t) return 0;
  const [time, period] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

export const formatTime = (timeStr) => {
  if (!timeStr || timeStr.includes("AM") || timeStr.includes("PM"))
    return timeStr || "";
  const parts = timeStr.split(":");
  let hours = parseInt(parts[0], 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${parts[1]} ${ampm}`;
};

export const isReservationOngoing = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Handle both time formats
  let startM, endM;

  // Check if time is in 24-hour format (e.g., "17:15:00")
  if (
    startTime.includes(":") &&
    !startTime.includes("AM") &&
    !startTime.includes("PM")
  ) {
    const [startHour, startMinute] = startTime.split(":");
    startM = parseInt(startHour) * 60 + parseInt(startMinute);
    const [endHour, endMinute] = endTime.split(":");
    endM = parseInt(endHour) * 60 + parseInt(endMinute);
  } else {
    // 12-hour format with AM/PM
    const [startHour, startMinute] = startTime.split(" ")[0].split(":");
    const startPeriod = startTime.split(" ")[1];
    let startHour24 = parseInt(startHour);
    if (startPeriod === "PM" && startHour24 !== 12) startHour24 += 12;
    if (startPeriod === "AM" && startHour24 === 12) startHour24 = 0;
    startM = startHour24 * 60 + parseInt(startMinute);

    const [endHour, endMinute] = endTime.split(" ")[0].split(":");
    const endPeriod = endTime.split(" ")[1];
    let endHour24 = parseInt(endHour);
    if (endPeriod === "PM" && endHour24 !== 12) endHour24 += 12;
    if (endPeriod === "AM" && endHour24 === 12) endHour24 = 0;
    endM = endHour24 * 60 + parseInt(endMinute);
  }

  const isOngoing = currentTime >= startM && currentTime <= endM;

  // Debug log - remove after fixing
  console.log(
    `[isReservationOngoing] start: ${startTime}, end: ${endTime}, current: ${currentTime}, startM: ${startM}, endM: ${endM}, ongoing: ${isOngoing}`,
  );

  return isOngoing;
};

export const isReservationCompleted = (reservation, selectedDate) => {
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

export const getScheduleItemClass = (reservation) => {
  let status = reservation.status;

  // Debug log - remove after fixing
  console.log(
    `[getScheduleItemClass] ID: ${reservation.reservation_id}, status: ${status}, startTime: ${reservation.startTime}, endTime: ${reservation.endTime}, isOngoing: ${isReservationOngoing(reservation.startTime, reservation.endTime)}`,
  );

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

export const getStatusDisplayText = (reservation) => {
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

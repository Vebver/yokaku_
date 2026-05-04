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
  const startM = timeToMin(startTime);
  const endM = timeToMin(endTime);
  return currentTime >= startM && currentTime <= endM;
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

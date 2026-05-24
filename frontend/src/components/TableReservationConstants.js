// TableReservationConstants.js
export const TABLES_DATA = [
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

export const ALLERGY_OPTIONS = ["None", "Specify all Allergy"];

export const OCCASION_OPTIONS = [
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

// Store hours configuration
export const STORE_HOURS = {
  openingTime: "10:00", // 10:00 AM
  closingTime: "22:00", // 10:00 PM
  closingTimeMinutes: 22 * 60, // 1320 minutes
};

// Check if a date is closed due to time passed
export const isDateClosedByTime = (dateStr, currentMinutes) => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Only check for today's date
  if (dateStr !== todayStr) return false;

  // If current time is past closing time (10:00 PM)
  return currentMinutes >= STORE_HOURS.closingTimeMinutes;
};

// Check if date is fully closed (past date OR past closing time)
export const isDateFullyClosed = (dateStr, currentMinutes) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(dateStr);
  checkDate.setHours(0, 0, 0, 0);

  // Past dates are closed
  if (checkDate < today) return true;

  // Current day after closing time is closed
  return isDateClosedByTime(dateStr, currentMinutes);
};

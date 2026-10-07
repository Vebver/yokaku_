// Shared, data-driven ordering helpers for the admin lists.
//
// Every admin list (Online Bookings, Walk-ins, Payments) must show the most
// recent record first. Sorting is done on real timestamps (booking date + time,
// or payment date + time) rather than on names or the display order returned by
// the API, and returns -1/0/1 so Array.prototype.sort stays stable.

/**
 * Turn a "HH:MM" / "HH:MM:SS" / "h:mm AM" time value into minutes since
 * midnight. Returns null when the value cannot be parsed.
 */
export const timeToMinutes = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  // 12-hour form, e.g. "07:30 PM" or "7:30:00 pm"
  const ampm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp])\.?[Mm]\.?$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    if (hour < 1 || hour > 12) return null;
    if (ampm[3].toLowerCase() === "p" && hour !== 12) hour += 12;
    if (ampm[3].toLowerCase() === "a" && hour === 12) hour = 0;
    return hour * 60 + Number(ampm[2]);
  }

  // 24-hour form, e.g. "19:30" or "19:30:00"
  const plain = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (plain) {
    const hour = Number(plain[1]);
    const minute = Number(plain[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  return null;
};

/** "YYYY-MM-DD" -> sortable integer, or null. */
const dateToDayNumber = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const day = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(day) ? null : Math.floor(day / 86400000);
};

/** Epoch milliseconds of a "YYYY-MM-DD HH:MM[:SS]" style value, or null. */
export const parseDateTime = (dateValue, timeValue) => {
  const day = dateToDayNumber(dateValue);
  if (day === null) return null;
  const minutes = timeToMinutes(timeValue);
  // A booking without a time still orders correctly by its date.
  const offset = minutes === null ? 12 * 60 : minutes;
  return day * 86400000 + offset * 60000;
};

/**
 * Comparator factory: newest first by the given date/time field pair.
 * Falls back to created_at, then to the numeric part of the id, so equal or
 * missing values still produce a deterministic order.
 */
export const byNewestFirst = (pickTimestamp) => (a, b) => {
  const at = pickTimestamp(a);
  const bt = pickTimestamp(b);
  const aValid = typeof at === "number" && !Number.isNaN(at);
  const bValid = typeof bt === "number" && !Number.isNaN(bt);
  if (aValid && bValid && at !== bt) return bt - at;
  // Rows without a usable timestamp sink to the bottom.
  if (aValid !== bValid) return aValid ? -1 : 1;

  const aCreated = new Date(a?.created_at || 0).getTime();
  const bCreated = new Date(b?.created_at || 0).getTime();
  if (!Number.isNaN(aCreated) && !Number.isNaN(bCreated) && aCreated !== bCreated) {
    return bCreated - aCreated;
  }

  const aNum = parseInt(String(a?.reservation_id ?? a?.payment_id ?? "").replace(/\D/g, ""), 10);
  const bNum = parseInt(String(b?.reservation_id ?? b?.payment_id ?? "").replace(/\D/g, ""), 10);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return bNum - aNum;

  return 0;
};

/** Newest booking first, using reservation date + reservation time. */
export const compareByBookingRecency = byNewestFirst((row) =>
  parseDateTime(row?.reservation_date, row?.reservation_time ?? row?.created_at),
);

/** Newest payment first, using the payment/transaction timestamp. */
export const compareByPaymentRecency = byNewestFirst((row) => {
  const stamp = row?.paid_at || row?.payment_date || row?.created_at || row?.reservation_date;
  const time = row?.paid_at
    ? null
    : row?.payment_time || row?.reservation_time || null;
  if (stamp && !dateToDayNumber(stamp)) return new Date(stamp).getTime();
  return parseDateTime(stamp, time);
});
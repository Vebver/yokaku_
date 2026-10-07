export const getReservationStatusMeta = (status, { walkIn = false } = {}) => {
  const normalized = String(status || "pending").toLowerCase();
  const labels = {
    pending: "Pending Reservation",
    confirmed: "Confirmed Reservation",
    seated: "Arrived / Checked In",
    arrived: "Arrived / Checked In",
    completed: "Completed Reservation",
    cancelled: "Cancelled Reservation",
    canceled: "Cancelled Reservation",
    no_show: "No-Show Reservation",
    "no show": "No-Show Reservation",
    verified: "Confirmed Reservation",
  };
  const colors = {
    pending: "bg-warning text-dark",
    confirmed: "bg-success text-white",
    verified: "bg-success text-white",
    seated: "bg-info text-white",
    arrived: "bg-info text-white",
    completed: "bg-secondary text-white",
    cancelled: "bg-danger text-white",
    canceled: "bg-danger text-white",
    no_show: "bg-dark text-white",
    "no show": "bg-dark text-white",
  };
  return {
    label: `${walkIn ? "Walk-In · " : ""}${labels[normalized] || "Reservation Status: " + normalized}`,
    className: colors[normalized] || "bg-danger text-white",
  };
};

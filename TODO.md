# TODO

- [x] Update `OnlineReservations.jsx` high-chair rendering to normalize stored values ("Yes"/"No" vs boolean) so admin display is correct.

- [x] Update `OnlineReservations.jsx` timeline section to be derived from `reservation_time`, `end_time`, and `status` (instead of `time_started/time_ended`).

- [x] Fix walk-in “Session Time” display to avoid timezone/format mismatch for CURTIME-based walk-in reservations.

- [x] Align WALK-in DB stored time to Asia/Manila in `backend/models/TableStatus.js` (uses CONVERT_TZ from UTC).

- [ ] Verify in UI:
  - Walk-in session shows correct local time (e.g., 1:00 AM).
  - The “- Now” part still correct until checkout.
  - Online reservations still show correct High Chair value.


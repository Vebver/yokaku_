# Task Implementation Plan

## Goal
1. Fix Today's Timeline so active kiosk reservations (even with far-future reserve dates) are recognized.
2. Add a Stop button in Table Status to stop kiosks.
3. Add a 3-hour event timer in Table Status when a customer reserves an event.

## Steps
- [x] Explore codebase (AdminDashboard.jsx, TableStatus.jsx, TableStatus.js, Reservation.js, admin controller/routes, kiosk components).
- [x] Backend: Modify `getTodaySchedule()` in `TableStatus.js` to include active kiosk reservations (already present — includes `r.is_kiosk_active = 1`).
- [x] Backend: Modify `getTableStatus()` in `TableStatus.js` to include event/kiosk/end-time fields (already present — reservation_type, is_kiosk_active, end_time, check_in_time).
- [x] Backend: Add `stopKiosk()` method in `TableStatus.js` (already present).
- [x] Backend: Add `stopKiosk` handler in `adminController.js`.
- [x] Backend: Add `POST /admin/stop-kiosk` route in `adminRoutes.js` (already present, wired to handler).
- [x] Frontend: Add Stop button + 3-hour event timer in `TableStatus.jsx`.
- [x] Verify AdminDashboard today timeline reflects kiosk reservations.


const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");
const upload = require("../middleware/upload");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Check if user has active reservation - IMPORTANT: Place this BEFORE any /:id routes
router.get("/check-active/:userId", reservationController.checkUserActive);

// Check table availability
router.get("/check-availability", reservationController.checkAvailability);

// Get table schedule
router.get("/table-schedule", reservationController.getSpecificTableSchedule);

// Get table statuses
router.get("/table-statuses", reservationController.getTableStatuses);

// Update ongoing reservations (cron job endpoint)
router.get("/update-ongoing", reservationController.updateOngoingReservations);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Get user's active reservation details - Place this BEFORE /:id routes
router.get(
  "/user-active/:userId",
  protect,
  reservationController.getUserActiveReservation,
);

// Get all reservations for a specific user
router.get("/user/:userId", protect, reservationController.getUserReservations);

// Get all reservations (admin only)
router.get("/", protect, adminOnly, reservationController.getReservations);

// Get reservation items by ID
router.get("/:id/items", protect, reservationController.getReservationItems);

// Create new reservation
router.post(
  "/table",
  upload.single("receipt"),
  reservationController.createReservation,
);

// Update reservation status (admin only)
router.put(
  "/:id/status",
  protect,
  adminOnly,
  reservationController.updateStatus,
);

// Delete reservation (admin only)
router.delete(
  "/:id",
  protect,
  adminOnly,
  reservationController.deleteReservation,
);

// Get specific reservation by ID - MUST BE LAST to avoid conflicts with /check-active/:userId
router.get("/:id", protect, reservationController.checkReservationId);

module.exports = router;

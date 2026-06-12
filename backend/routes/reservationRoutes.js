const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");
const upload = require("../middleware/upload");
const uploadReceiptToCloudinary = require("../middleware/receiptUploadCloudinary");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// ==================== PUBLIC ROUTES ====================
router.get("/check-active/:userId", reservationController.checkUserActive);
router.get("/check-availability", reservationController.checkAvailability);
router.get("/table-schedule", reservationController.getSpecificTableSchedule);
router.get("/table-statuses", reservationController.getTableStatuses);
router.get("/update-ongoing", reservationController.updateOngoingReservations);

// ==================== PROTECTED ROUTES ====================
router.get(
  "/user-active/:userId",
  protect,
  reservationController.getUserActiveReservation,
);
router.get("/user/:userId", protect, reservationController.getUserReservations);

// Add these lines after the existing routes (around line 20)

// ==================== CALENDAR ROUTES ====================
router.get("/by-date-range", reservationController.getReservationsByDateRange);
router.get("/by-date/:date", reservationController.getReservationsByDate);
router.get(
  "/user/:userId/cancellation-count",
  protect,
  reservationController.getCancellationCount,
);
router.post(
  "/record-cancellation",
  protect,
  reservationController.recordCancellation,
);

// ==================== ADMIN ROUTES ====================
router.get("/", protect, adminOnly, reservationController.getReservations);
router.put("/:id/status", protect, reservationController.updateStatus);
router.delete(
  "/:id",
  protect,
  adminOnly,
  reservationController.deleteReservation,
);

// ==================== GENERAL PROTECTED ROUTES ====================
//router.get("/:id/items", protect, reservationController.getReservationItems);
router.post(
  "/table",
  // Cloudinary-backed upload so we store a secure_url in reservations.receipt_path
  uploadReceiptToCloudinary.single("receipt"),
  reservationController.createReservation,
);

router.get("/:id", reservationController.checkReservationId);

module.exports = router;

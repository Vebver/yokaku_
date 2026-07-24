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
router.get("/all-tables", reservationController.getAllTables);
router.get("/details/:id", reservationController.getReservationById);
router.get(
  "/user/:userId/all",
  protect,
  reservationController.getAllUserReservations,
);
// ==================== PROTECTED ROUTES ====================
router.get(
  "/user-active/:userId",
  protect,
  reservationController.getUserActiveReservation,
);
router.get("/user/:userId", protect, reservationController.getUserReservations);

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
router.post("/:id/refund", protect, reservationController.processRefund);

// ==================== ADMIN ROUTES ====================
router.get("/", protect, adminOnly, reservationController.getReservations);
router.post("/", protect, adminOnly, reservationController.createReservation);
router.put("/:id/status", protect, reservationController.updateStatus);
router.delete(
  "/:id",
  protect,
  adminOnly,
  reservationController.deleteReservation,
);

// ==================== GENERAL PROTECTED ROUTES ====================

// 1. Static and Specific routes first
router.get("/active-kiosk", reservationController.getActiveKiosk);
router.get("/:id/items", protect, reservationController.getReservationItems);

// 2. POST actions
router.post(
  "/table",
  uploadReceiptToCloudinary.single("receipt"),
  reservationController.createReservation,
);

router.get("/active-kiosk", reservationController.getActiveKiosk);
router.get("/:id", reservationController.checkReservationId);

module.exports = router;

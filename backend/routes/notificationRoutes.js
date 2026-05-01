const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// All notification routes require authentication
router.use(protect);

// Get all notifications for the logged-in user
router.get("/", notificationController.getUserNotifications);

// Get deleted notifications (trash)
router.get("/deleted", notificationController.getDeletedNotifications);

// Get unread notification count
router.get("/unread-count", notificationController.getUnreadCount);

// Mark all notifications as read (before individual routes)
router.put("/read-all", notificationController.readAllNotifications);

// Permanently delete a notification - MUST come before /:id routes
router.delete(
  "/:id/permanent",
  notificationController.permanentDeleteNotification,
);

// Restore a notification from trash
router.put("/:id/restore", notificationController.restoreNotification);

// Soft delete a notification (move to trash)
router.delete("/:id", notificationController.deleteNotification);

// Mark a specific notification as read
router.put("/:id/read", notificationController.readNotification);

// Delete all notifications (permanent)
router.delete("/", notificationController.deleteAllNotifications);

module.exports = router;

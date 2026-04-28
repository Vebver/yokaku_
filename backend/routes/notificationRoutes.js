const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// All notification routes require authentication
router.use(protect);

// Get all notifications for the logged-in user
router.get("/", notificationController.getUserNotifications);

// Get unread notification count
router.get("/unread-count", notificationController.getUnreadCount);

// Mark a specific notification as read
router.put("/:id/read", notificationController.readNotification);

// Mark all notifications as read
router.put("/read-all", notificationController.readAllNotifications);

// Delete a specific notification
router.delete("/:id", notificationController.deleteNotification);

// Delete all notifications
router.delete("/", notificationController.deleteAllNotifications);

module.exports = router;

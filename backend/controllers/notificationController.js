const Notification = require("../models/Notification");

const notificationController = {
  getUserNotifications: async (req, res) => {
    try {
      const userId = req.user.userId;
      const notifications = await Notification.getByUserId(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.userId;
      const count = await Notification.getUnreadCount(userId);
      res.json({ unreadCount: count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: error.message });
    }
  },

  readNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const result = await Notification.markAsRead(id, userId);

      if (result === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: error.message });
    }
  },

  readAllNotifications: async (req, res) => {
    try {
      const userId = req.user.userId;
      const count = await Notification.markAllAsRead(userId);
      res.json({
        message: "All notifications marked as read",
        updatedCount: count,
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: error.message });
    }
  },

  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const result = await Notification.delete(id, userId);

      if (result === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: error.message });
    }
  },

  deleteAllNotifications: async (req, res) => {
    try {
      const userId = req.user.userId;
      const count = await Notification.deleteAll(userId);
      res.json({
        message: "All notifications deleted successfully",
        deletedCount: count,
      });
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = notificationController;

const Notification = require('../models/Notification');

exports.getUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.getByUser(req.user.userId);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.readNotification = async (req, res) => {
    try {
        await Notification.markAsRead(req.params.id, req.user.userId);
        res.json({ message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.readAllNotifications = async (req, res) => {
    try {
        await Notification.markAllAsRead(req.user.userId);
        res.json({ message: "All marked as read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
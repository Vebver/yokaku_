const db = require('../config/db');

const Notification = {
    // Get all notifications for a specific user
    getByUser: async (userId) => {
        const [rows] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', 
            [userId]
        );
        return rows;
    },

    // Mark one as read
    markAsRead: async (id, userId) => {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?', 
            [id, userId]
        );
    },

    // Mark all as read
    markAllAsRead: async (userId) => {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?', 
            [userId]
        );
    }
};

module.exports = Notification;
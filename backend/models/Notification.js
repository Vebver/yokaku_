const db = require('../config/db');

const Notification = {
    // NEW: Create a notification
    // We pass 'conn' so it can stay part of the Reservation Transaction
    create: async (conn, data) => {
        const sql = `
            INSERT INTO notifications 
            (user_id, reservation_id, title, message, type, is_read) 
            VALUES (?, ?, ?, ?, ?, 0)`;
        await conn.execute(sql, [
            data.userId, 
            data.reservationId, 
            data.title, 
            data.message, 
            data.type || 'info'
        ]);
    },

    getByUser: async (userId) => {
        const [rows] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', 
            [userId]
        );
        return rows;
    },

    markAsRead: async (id, userId) => {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?', 
            [id, userId]
        );
    },

    markAllAsRead: async (userId) => {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?', 
            [userId]
        );
    }
};

module.exports = Notification;
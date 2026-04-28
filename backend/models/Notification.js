const db = require("../config/db");

// Get io instance (will be set from index.js)
let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
};

const Notification = {
  setIo,

  create: async (connection, data) => {
    const conn = connection || db;

    const sql = `
      INSERT INTO notifications (user_id, reservation_id, title, message, type, is_read, created_at) 
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `;

    const values = [
      data.userId,
      data.reservationId,
      data.title,
      data.message,
      data.type || "reservation", // This will now work after fixing the ENUM
    ];

    const [result] = await conn.execute(sql, values);
    console.log(
      `✅ Notification created for user ${data.userId}: ${data.title}`,
    );

    // Emit real-time notification if socket.io is available
    if (ioInstance && data.userId) {
      const notificationData = {
        notification_id: result.insertId,
        user_id: data.userId,
        reservation_id: data.reservationId,
        title: data.title,
        message: data.message,
        type: data.type || "reservation",
        is_read: 0,
        created_at: new Date().toISOString(),
      };

      // Emit to user's room
      ioInstance
        .to(`user_${data.userId}`)
        .emit("new_notification", notificationData);
      console.log(`📨 Real-time notification sent to user ${data.userId}`);
    }

    return result.insertId;
  },

  getByUserId: async (userId) => {
    const sql = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;
    const [rows] = await db.execute(sql, [userId]);
    return rows;
  },

  getUnreadCount: async (userId) => {
    const sql = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `;
    const [rows] = await db.execute(sql, [userId]);
    return rows[0].count;
  },

  markAsRead: async (notificationId, userId) => {
    const sql = `
      UPDATE notifications 
      SET is_read = 1, read_at = NOW() 
      WHERE notification_id = ? AND user_id = ? AND is_read = 0
    `;
    const [result] = await db.execute(sql, [notificationId, userId]);

    // Emit unread count update
    if (ioInstance && result.affectedRows > 0) {
      const unreadCount = await Notification.getUnreadCount(userId);
      ioInstance
        .to(`user_${userId}`)
        .emit("unread_count_updated", { unreadCount });
    }

    return result.affectedRows;
  },

  markAllAsRead: async (userId) => {
    const sql = `
      UPDATE notifications 
      SET is_read = 1, read_at = NOW() 
      WHERE user_id = ? AND is_read = 0
    `;
    const [result] = await db.execute(sql, [userId]);

    if (ioInstance && result.affectedRows > 0) {
      ioInstance
        .to(`user_${userId}`)
        .emit("unread_count_updated", { unreadCount: 0 });
    }

    return result.affectedRows;
  },

  delete: async (notificationId, userId) => {
    const sql = `
      DELETE FROM notifications 
      WHERE notification_id = ? AND user_id = ?
    `;
    const [result] = await db.execute(sql, [notificationId, userId]);
    return result.affectedRows;
  },

  deleteAll: async (userId) => {
    const sql = `
      DELETE FROM notifications 
      WHERE user_id = ?
    `;
    const [result] = await db.execute(sql, [userId]);
    return result.affectedRows;
  },
};

module.exports = Notification;

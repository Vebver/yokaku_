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
        VALUES (?, ?, ?, ?, 'reservation', 0, NOW())
      `;

    const values = [
      data.userId,
      data.reservationId,
      data.title,
      data.message,
      data.type || "info",
    ];

    const [result] = await conn.execute(sql, values);
    console.log(
      `✅ Notification created for user ${data.userId}: ${data.title}`,
    );

    if (ioInstance && data.userId) {
      const notificationData = {
        notification_id: result.insertId,
        user_id: data.userId,
        reservation_id: data.reservationId,
        title: data.title,
        message: data.message,
        type: data.type || "info",
        is_read: 0,
        created_at: new Date().toISOString(),
      };

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
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const [rows] = await db.execute(sql, [userId]);
    return rows;
  },

  getDeletedNotifications: async (userId) => {
    const sql = `
      SELECT * FROM notifications 
      WHERE user_id = ? AND deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `;
    const [rows] = await db.execute(sql, [userId]);
    return rows;
  },

  getUnreadCount: async (userId) => {
    const sql = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL
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
      WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL
    `;
    const [result] = await db.execute(sql, [userId]);

    if (ioInstance && result.affectedRows > 0) {
      ioInstance
        .to(`user_${userId}`)
        .emit("unread_count_updated", { unreadCount: 0 });
    }

    return result.affectedRows;
  },

  softDelete: async (notificationId, userId) => {
    const sql = `
      UPDATE notifications 
      SET deleted_at = NOW(), deleted_by = 'user'
      WHERE notification_id = ? AND user_id = ? AND deleted_at IS NULL
    `;
    const [result] = await db.execute(sql, [notificationId, userId]);
    return result.affectedRows;
  },

  restore: async (notificationId, userId) => {
    const sql = `
      UPDATE notifications 
      SET deleted_at = NULL, deleted_by = NULL
      WHERE notification_id = ? AND user_id = ? AND deleted_at IS NOT NULL
    `;
    const [result] = await db.execute(sql, [notificationId, userId]);
    return result.affectedRows;
  },

  permanentlyDeleteExpired: async () => {
    const sql = `
      DELETE FROM notifications 
      WHERE deleted_at IS NOT NULL 
      AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    const [result] = await db.execute(sql);
    return result.affectedRows;
  },

  // Permanent delete - removes from database completely
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

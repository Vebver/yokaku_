const db = require("../config/db");

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

    const dbType = "info"; 

    // FIX: If this is strictly an admin alert, ignore any customer userId passed in data.userId
    let targetUserId = data.isAdminAlert === true ? null : data.userId;

    // If no target user is specified (or it was cleared because it is an admin alert)
    if (!targetUserId) {
      try {
        // Look for the first Admin or Manager to act as the primary recipient
        const [adminRows] = await conn.execute(
          "SELECT user_id FROM users WHERE LOWER(role) IN ('admin', 'manager') LIMIT 1"
        );
        if (adminRows.length > 0) {
          targetUserId = adminRows[0].user_id;
        } else {
          const [firstUser] = await conn.execute("SELECT user_id FROM users LIMIT 1");
          if (firstUser.length > 0) targetUserId = firstUser[0].user_id;
        }
      } catch (fallbackErr) {
        console.error("Failed to resolve fallback admin ID:", fallbackErr);
      }
    }

    if (!targetUserId) {
      targetUserId = 1; 
    }

    const values = [
      targetUserId,
      data.reservationId || null,
      data.title,
      data.message,
      dbType,
    ];

    // 1. Insert original notification (Now guaranteed to be an Admin if isAdminAlert is true)
    const [result] = await conn.execute(sql, values);
    const mainInsertId = result.insertId;

    if (ioInstance && targetUserId) {
      const notificationData = {
        notification_id: mainInsertId,
        id: mainInsertId,
        user_id: targetUserId,
        reservation_id: data.reservationId,
        title: data.title,
        message: data.message,
        type: data.type || "reservation",
        is_read: 0,
        created_at: new Date().toISOString(),
      };

      ioInstance
        .to(`user_${targetUserId}`)
        .emit("new_notification", notificationData);
    }

    // 2. Replicate to other admins/managers
    if (data.isAdminAlert === true) {
      try {
        let adminIds = [];
        try {
          const [rows] = await conn.execute(
            "SELECT user_id FROM users WHERE LOWER(role) IN ('admin', 'manager')"
          );
          adminIds = rows.map((r) => r.user_id).filter(Boolean);
        } catch (colErr) {
          console.error("Failed to resolve admin list:", colErr.message);
        }

        for (const adminId of adminIds) {
          // Skip the primary admin to avoid duplicate database entries
          if (adminId === targetUserId) continue;

          const [adminResult] = await conn.execute(sql, [
            adminId,
            data.reservationId || null,
            data.title,
            data.message,
            dbType,
          ]);

          if (ioInstance) {
            const adminNotificationData = {
              notification_id: adminResult.insertId,
              id: adminResult.insertId,
              user_id: adminId,
              reservation_id: data.reservationId,
              title: data.title,
              message: data.message,
              type: data.type || "reservation",
              is_read: 0,
              created_at: new Date().toISOString(),
            };

            ioInstance
              .to(`user_${adminId}`)
              .emit("new_notification", adminNotificationData);
          }
        }
      } catch (err) {
        console.error("Error replicating system notification to admins:", err);
      }
    }

    return mainInsertId;
  },

  getByUserId: async (userId) => {
    // Isolated lookup query: only fetches notifications intended for the specific user
    const sql = `
      SELECT 
        notification_id, 
        notification_id AS id,
        user_id, 
        reservation_id, 
        title, 
        message, 
        type, 
        is_read, 
        created_at 
      FROM notifications 
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const [rows] = await db.execute(sql, [userId]);
    console.log(`Found ${rows.length} notifications for user ${userId}`);
    return rows;
  },

  getDeletedNotifications: async (userId) => {
    const sql = `
      SELECT 
        notification_id, 
        notification_id AS id,
        user_id, 
        reservation_id, 
        title, 
        message, 
        type, 
        is_read, 
        created_at, 
        deleted_at 
      FROM notifications 
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
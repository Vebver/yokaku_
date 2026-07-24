const db = require("../config/db");

const generateRandomId = (prefix = "RES") => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
};

const Reservation = {
  // ==================== USER METHODS ====================
  checkActiveByUserId: async (userId) => {
    const sql = `
          SELECT r.reservation_id 
          FROM reservations r
          LEFT JOIN payments p ON r.reservation_id = p.reservation_id
          WHERE r.user_id = ? 
          AND (
            (r.status IN ('Pending', 'Confirmed', 'Seated')
              AND (r.reservation_date > CURDATE() OR (r.reservation_date = CURDATE() AND r.end_time > CURTIME())))
            OR (p.payment_status = 'rejected')
          )
          LIMIT 1
        `;
    const [rows] = await db.execute(sql, [userId]);
    return rows.length > 0;
  },

  findActiveDetailsByUserId: async (userId) => {
    const sql = `
          SELECT 
            r.reservation_id,
            DATE_FORMAT(r.reservation_date, '%Y-%m-%d') as reservation_date,
            TIME_FORMAT(r.reservation_time, '%h:%i %p') as reservation_time,
            TIME_FORMAT(r.end_time, '%h:%i %p') as end_time,
            r.num_guests,
            r.status,
            p.payment_status,
            p.rejection_reason,
            GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ', ') as assigned_tables
          FROM reservations r
          LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
          LEFT JOIN tables t ON rt.table_id = t.table_id
          LEFT JOIN payments p ON r.reservation_id = p.reservation_id
          WHERE r.user_id = ? 
          AND (
            (r.status IN ('Pending', 'Confirmed', 'Seated')
              AND (r.reservation_date > CURDATE() OR (r.reservation_date = CURDATE() AND r.end_time > CURTIME())))
            OR (p.payment_status = 'rejected')
          )
          GROUP BY r.reservation_id
          ORDER BY r.created_at DESC LIMIT 1`;
    const [rows] = await db.execute(sql, [userId]);
    return rows[0];
  },

  // ===== NEW: Get ALL reservations for a user (including history) =====
  findAllByUserId: async (userId) => {
    const sql = `
    SELECT 
      r.reservation_id, 
      r.status, 
      r.package_name, 
      r.allergy,
      r.cancellation_reason,
      r.cancelled_at,
      DATE_FORMAT(r.reservation_date, '%Y-%m-%d') as reservation_date,
      TIME_FORMAT(r.reservation_time, '%h:%i %p') as reservation_time,
      TIME_FORMAT(r.end_time, '%h:%i %p') as end_time,
      p.payment_status, 
      p.amount,
      p.payment_method,
      GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ', ') as assigned_tables,
      CONCAT(IFNULL(b.brgy_name, 'N/A'), ', ', IFNULL(m.muni_name, 'N/A')) AS full_address
    FROM reservations r
    LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
    LEFT JOIN tables t ON rt.table_id = t.table_id
    LEFT JOIN payments p ON r.reservation_id = p.reservation_id
    LEFT JOIN barangays b ON r.brgy_code = b.brgy_code
    LEFT JOIN municipalities m ON b.muni_code = m.muni_code
    WHERE r.user_id = ?
    GROUP BY r.reservation_id
    ORDER BY r.created_at DESC
  `;
    const [rows] = await db.execute(sql, [userId]);
    return rows;
  },

  findAllActiveByUserId: async (userId) => {
    const sql = `
          SELECT 
            r.reservation_id, r.status, r.package_name, r.allergy,
            DATE_FORMAT(r.reservation_date, '%Y-%m-%d') as reservation_date,
            TIME_FORMAT(r.reservation_time, '%h:%i %p') as reservation_time,
            TIME_FORMAT(r.end_time, '%h:%i %p') as end_time,
            p.payment_status, p.amount,
            GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ', ') as assigned_tables,
            CONCAT(IFNULL(b.brgy_name, 'N/A'), ', ', IFNULL(m.muni_name, 'N/A')) AS full_address
          FROM reservations r
          LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
          LEFT JOIN tables t ON rt.table_id = t.table_id
          LEFT JOIN payments p ON r.reservation_id = p.reservation_id
          LEFT JOIN barangays b ON r.brgy_code = b.brgy_code
          LEFT JOIN municipalities m ON b.muni_code = m.muni_code
          WHERE r.user_id = ?
          AND r.status NOT IN ('Completed', 'Rejected', 'Cancelled')
          AND (r.reservation_date > CURDATE() OR (r.reservation_date = CURDATE() AND r.end_time > CURTIME()))
          GROUP BY r.reservation_id
          ORDER BY r.created_at DESC`;
    const [rows] = await db.execute(sql, [userId]);
    return rows;
  },

  // ==================== TABLE METHODS ====================
  getTableOccupancyMap: async (date, startTime, endTime) => {
    let sql = `
          SELECT rt.table_id, r.status 
          FROM reservations r 
          JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id 
          WHERE r.reservation_date = ? AND r.status IN ('Pending', 'Confirmed', 'Seated')`;
    let params = [date];
    if (startTime && endTime) {
      sql += ` AND r.reservation_time < ? AND r.end_time > ?`;
      params.push(endTime, startTime);
    }
    const [rows] = await db.execute(sql, params);
    const map = {};
    rows.forEach((row) => {
      map[row.table_id] = row.status;
    });
    return map;
  },

  getSlotsByTableAndDate: async (date, tableId) => {
    const sql = `SELECT r.reservation_time FROM reservations r JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id WHERE r.reservation_date = ? AND rt.table_id = ? AND r.status != 'Rejected'`;
    const [rows] = await db.execute(sql, [date, tableId]);
    return rows.map((row) => row.reservation_time);
  },

  getSpecificTableSchedule: async (tableId, date) => {
    const sql = `
          SELECT r.reservation_time AS startTime, r.end_time AS endTime, r.status
          FROM reservations r
          JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
          WHERE rt.table_id = ? AND r.reservation_date = ? 
          AND r.status IN ('Pending', 'Confirmed', 'Seated')`;
    const [rows] = await db.execute(sql, [tableId, date]);
    return rows;
  },

  // ==================== STATUS MANAGEMENT ====================
  updateStatus: async (id, status, cancellationReason = null) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const bStatus = status.toLowerCase();

      if (bStatus === "cancelled") {
        await conn.execute(
          `UPDATE reservations 
              SET status = ?, cancellation_reason = ?, cancelled_at = NOW() 
              WHERE reservation_id = ?`,
          [status, cancellationReason, id],
        );

        try {
          const [admins] = await conn.execute(
            "SELECT user_id FROM users WHERE role = 'admin'",
          );
          const notifMessage = `Reservation ${id} has been cancelled by the customer. Reason: ${cancellationReason || "No reason specified."}`;

          for (const admin of admins) {
            await conn.execute(
              `INSERT INTO notifications (user_id, reservation_id, title, message, is_read, created_at) 
                  VALUES (?, ?, 'Reservation Cancelled', ?, 0, NOW())`,
              [admin.user_id, id, notifMessage],
            );
          }
        } catch (notifErr) {
          console.error(
            "Non-blocking Admin Notification error inside model:",
            notifErr.message,
          );
        }
      } else {
        await conn.execute(
          "UPDATE reservations SET status = ? WHERE reservation_id = ?",
          [status, id],
        );
      }

      await conn.execute(
        "UPDATE reservation_tables SET status = ? WHERE reservation_id = ?",
        [bStatus, id],
      );

      // Updates status of all linked tables to occupied/available
      if (bStatus === "seated") {
        await conn.execute(
          `UPDATE tables t 
              JOIN reservation_tables rt ON t.table_id = rt.table_id 
              SET t.status = 'occupied' WHERE rt.reservation_id = ?`,
          [id],
        );
      } else if (["completed", "rejected", "cancelled"].includes(bStatus)) {
        await conn.execute(
          `UPDATE tables t 
              JOIN reservation_tables rt ON t.table_id = rt.table_id 
              SET t.status = 'available', t.available_seats = t.capacity 
              WHERE rt.reservation_id = ?`,
          [id],
        );
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  syncAllStatuses: async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const now = new Date().toTimeString().slice(0, 8);
      const today = new Date().toISOString().split("T")[0];

      const [seated] = await conn.execute(
        `
            UPDATE reservations r JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
            SET r.status = 'Seated', rt.status = 'seated'
            WHERE r.reservation_date = ? AND r.status = 'Confirmed' AND r.reservation_time <= ? AND r.end_time >= ?
          `,
        [today, now, now],
      );

      const [completed] = await conn.execute(
        `
            UPDATE reservations r JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
            SET r.status = 'Completed', rt.status = 'completed'
            WHERE (r.reservation_date < ?) OR (r.reservation_date = ? AND r.end_time < ?)
            AND r.status IN ('Seated', 'Confirmed', 'Pending')
          `,
        [today, today, now],
      );

      await conn.commit();
      return { seated: seated.affectedRows, completed: completed.affectedRows };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  getActiveKioskReservation: async (tableId) => {
    // Force date and time to align with Asia/Manila local timezone
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
    const now = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      timeZone: "Asia/Manila",
    });

    // 1. Check if there is an active event reservation scheduled for right now
    const eventSql = `
          SELECT r.* 
          FROM reservations r
          WHERE r.reservation_type = 'event' 
            AND r.status IN ('Confirmed', 'Seated', 'Pending')
            AND r.reservation_date = ?
            AND r.reservation_time <= ? 
            AND r.end_time >= ?
          LIMIT 1
        `;
    const [events] = await db.execute(eventSql, [today, now, now]);

    if (events.length > 0) {
      const event = events[0];
      if (event.is_kiosk_active === 1) {
        return { mode: "event_active", reservation: event };
      } else {
        return { mode: "event_waiting", reservation: event };
      }
    }
    // 2. Check globally if there is any reservation actively pushed to the kiosk by the admin (fail-safe version)
    const activeSql = `
          SELECT r.* 
          FROM reservations r
          WHERE r.is_kiosk_active = 1
          LIMIT 1
        `;
    const [actives] = await db.execute(activeSql);
    if (actives.length > 0) {
      return { mode: "table_assigned", reservation: actives[0] };
    }

    return { mode: "table_default" };
  },

  // models/Reservation.js
  createAdminNotification: async (title, message, type, createdAt) => {
    try {
      // Get all admin users
      const [admins] = await db.execute(
        "SELECT user_id FROM users WHERE role = 'admin'",
      );

      let notificationId = null;

      // Insert notification for each admin
      for (const admin of admins) {
        const [result] = await db.execute(
          `INSERT INTO notifications (user_id, title, message, type, is_read, created_at) 
         VALUES (?, ?, ?, ?, 0, ?)`,
          [admin.user_id, title, message, type, createdAt],
        );
        notificationId = result.insertId;
        console.log(`✅ Notification saved for admin ${admin.user_id}`);
      }

      // If no admins, create global notification
      if (admins.length === 0) {
        const [result] = await db.execute(
          `INSERT INTO notifications (title, message, type, is_read, created_at) 
         VALUES (?, ?, ?, 0, ?)`,
          [title, message, type, createdAt],
        );
        notificationId = result.insertId;
      }

      return notificationId;
    } catch (error) {
      console.error("Error creating admin notification:", error);
      return null;
    }
  },

  // Fetch reservations within a date range
  getByDateRange: async (startDate, endDate) => {
    const sql = `
      SELECT 
        r.reservation_id,
        r.reservation_type,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d') as date,
        TIME_FORMAT(r.reservation_time, '%H:%i') as startTime,
        TIME_FORMAT(r.end_time, '%H:%i') as endTime,
        r.num_guests as guests,
        r.first_name,
        r.last_name,
        r.status,
        rt.table_id
      FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE r.reservation_date BETWEEN ? AND ?
        AND r.status IN ('Confirmed', 'Pending', 'Seated')
      ORDER BY r.reservation_date ASC, r.reservation_time ASC
    `;
    const [rows] = await db.execute(sql, [startDate, endDate]);
    return rows;
  },

  // Fetch reservations on a specific date
  getByDate: async (date) => {
    const sql = `
      SELECT 
        r.reservation_id,
        r.reservation_type,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d') as date,
        TIME_FORMAT(r.reservation_time, '%H:%i') as startTime,
        TIME_FORMAT(r.end_time, '%H:%i') as endTime,
        r.num_guests as guests,
        r.first_name,
        r.last_name,
        CONCAT(r.first_name, ' ', r.last_name) as customerName,
        r.status,
        rt.table_id
      FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE r.reservation_date = ?
        AND r.status IN ('Confirmed', 'Pending', 'Seated')
      ORDER BY r.reservation_time ASC
    `;
    const [rows] = await db.execute(sql, [date]);
    return rows;
  },

  // ==================== CRUD OPERATIONS ====================

  create: async (data) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const idPrefix = data.isWalkin ? "WALK" : "RES";
      const customId = generateRandomId(idPrefix);

      // Walk-ins and manual entries start as 'Confirmed'
      const finalStatus = "Confirmed";
      const bridgeStatus = "confirmed";

      // ===== FIX: Safely get reservation type with string conversion =====
      let finalReservationType = "per_table";

      // Check if reservation_type exists and is valid
      if (
        data.reservation_type !== undefined &&
        data.reservation_type !== null
      ) {
        finalReservationType = String(data.reservation_type).toLowerCase();
      } else if (
        data.reservationType !== undefined &&
        data.reservationType !== null
      ) {
        finalReservationType = String(data.reservationType).toLowerCase();
      }

      if (
        String(data.bookingType || "")
          .toLowerCase()
          .trim() === "takeout"
      ) {
        finalReservationType = "takeout";
      }

      console.log(
        "📊 Model: Creating reservation with type:",
        finalReservationType,
      );
      console.log("📊 Model: Data received:", {
        reservation_type: data.reservation_type,
        reservationType: data.reservationType,
        finalReservationType,
        packageName: data.packageName,
      });

      // 1. Insert into reservations
      const resQuery = `INSERT INTO reservations (
        reservation_id, user_id, first_name, last_name, email, phone, 
        reservation_date, reservation_time, end_time, num_guests, 
        package_name, status, receipt_path, brgy_code, allergy, 
        allergy_count, occasion, duration_hours, downpayment_amount,
        reservation_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await conn.query(resQuery, [
        customId,
        data.userId === "null" || !data.userId ? null : data.userId,
        data.firstName,
        data.lastName || "",
        data.email || "",
        data.phone || "",
        data.date,
        data.startTime,
        data.endTime,
        data.pax || data.guests || data.num_guests || 1,
        data.packageName,
        finalStatus,
        data.receiptPath,
        data.brgyCode,
        data.allergy,
        data.allergyCount || 0,
        data.occasion || "Casual Dining",
        data.durationHours || 1.0,
        data.downpayment || 0,
        finalReservationType,
      ]);

      // 2. Handle Table Assignments
      let finalTableIds = [];

      const isEvent =
        data.reservation_type === "event" ||
        data.reservationType === "event" ||
        finalReservationType === "event";

      if (isEvent) {
        const [allTables] = await conn.query(
          "SELECT table_id FROM tables WHERE status != 'maintenance'",
        );
        finalTableIds = allTables.map((t) => t.table_id);
        console.log(
          "✅ EVENT reservation - assigning all tables:",
          finalTableIds.length,
        );
      } else if (data.tableIds?.length > 0) {
        finalTableIds = data.tableIds;
      }

      if (finalTableIds.length > 0) {
        for (const tid of finalTableIds) {
          if (tid !== "takeout" && tid !== 0) {
            await conn.query(
              `INSERT INTO reservation_tables 
              (reservation_id, table_id, customer_name, status, check_in_time) 
              VALUES (?, ?, ?, ?, NOW())`,
              [
                customId,
                tid,
                `${data.firstName} ${data.lastName || ""}`,
                bridgeStatus,
              ],
            );

            if (bridgeStatus === "seated") {
              await conn.query(
                "UPDATE tables SET status = 'occupied', available_seats = 0 WHERE table_id = ?",
                [tid],
              );
            }
          }
        }
      }

      // 3. Insert payment record
      const payStatus = data.isWalkin ? "verified" : "pending";
      await conn.query(
        `INSERT INTO payments 
        (reservation_id, amount, total_bill, payment_method, payment_status, paid_at) 
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          customId,
          data.downpayment || 0,
          data.totalAmount || data.amount || 0,
          data.paymentMethod || "Cash",
          payStatus,
        ],
      );

      // ==================== INSERT MANUAL ORDER MENU ITEMS ====================
      let itemsToInsert = [];
      if (data.selectedItems) {
        try {
          itemsToInsert =
            typeof data.selectedItems === "string"
              ? JSON.parse(data.selectedItems)
              : data.selectedItems;
        } catch (err) {
          console.error(
            "Error parsing selectedItems in Reservation.create:",
            err,
          );
        }
      }

      if (Array.isArray(itemsToInsert) && itemsToInsert.length > 0) {
        for (const item of itemsToInsert) {
          let itemId = item.product_id || item.item_id || item.id;

          const itemName = String(item.name || item.item_name || "")
            .trim()
            .toLowerCase();

          if (
            itemName === "standard package" ||
            itemName === "premium package"
          ) {
            console.log(
              `[Safe Skip] Skipping kiosk_orders entry for reservation package: ${item.name}`,
            );
            continue;
          }

          const qty = item.quantity || 1;
          const customizations = item.customizations || "";

          await conn.query(
            `INSERT INTO kiosk_orders 
            (reservation_id, item_id, quantity, kitchen_status, customizations, is_refill) 
            VALUES (?, ?, ?, 'pending', ?, 0)`,
            [customId, itemId, qty, customizations],
          );
        }
      }
      // ==============================================================================

      // Notification
      if (data.userId && data.userId !== "null") {
        const notifSql = `
          INSERT INTO notifications 
          (user_id, reservation_id, title, message, type, is_read, created_at) 
          VALUES (?, ?, ?, ?, 'success', 0, NOW())
        `;
        await conn.query(notifSql, [
          data.userId,
          customId,
          "Reservation Confirmed",
          `Your reservation for ${data.date} at ${data.startTime} has been successfully placed. Downpayment: ₱${(data.downpayment || 0).toFixed(2)}`,
        ]);
      }

      await conn.commit();

      const io = data.io;
      if (io) io.emit("table_updated");

      console.log("✅ Reservation created successfully:", {
        id: customId,
        type: finalReservationType,
        package: data.packageName,
      });

      return customId;
    } catch (err) {
      await conn.rollback();
      console.error("Transaction Error:", err);
      throw err;
    } finally {
      conn.release();
    }
  },

  getItemsByReservationId: async (id) => {
    const sql = `
      SELECT 
        mi.menu_name AS item_name, 
        mi.menu_name AS menu_name,
        ko.quantity, 
        mi.price, 
        ko.customizations 
      FROM kiosk_orders ko
      LEFT JOIN menu_items mi ON ko.item_id = mi.item_id 
      WHERE ko.reservation_id = ?

      UNION ALL

      SELECT 
        package_name AS item_name, 
        package_name AS package_name,
        1 AS quantity, 
        downpayment_amount AS price, 
        'Reservation Fee' AS customizations 
      FROM reservations 
      WHERE reservation_id = ? AND downpayment_amount > 0
    `;
    const [rows] = await db.execute(sql, [id, id]);
    return rows;
  },

  getAll: async () => {
    const sql = `SELECT r.*, p.payment_status, p.amount, GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ' + ') AS assigned_tables FROM reservations r LEFT JOIN payments p ON r.reservation_id = p.reservation_id LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id LEFT JOIN tables t ON rt.table_id = t.table_id GROUP BY r.reservation_id ORDER BY r.created_at DESC`;
    const [rows] = await db.execute(sql);
    return rows;
  },

  findById: async (id) => {
    const sql = `SELECT r.*, p.payment_status, p.amount FROM reservations r LEFT JOIN payments p ON r.reservation_id = p.reservation_id WHERE r.reservation_id = ?`;
    const [rows] = await db.execute(sql, [id]);
    return rows[0];
  },

  delete: async (id) => {
    await db.execute("DELETE FROM reservations WHERE reservation_id = ?", [id]);
  },
};

module.exports = Reservation;

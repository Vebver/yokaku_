const db = require("../config/db");

const generateRandomId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RES-${result}`;
};

const Reservation = {
  // ==================== USER METHODS ====================
  checkActiveByUserId: async (userId) => {
    const sql = `
      SELECT reservation_id FROM reservations 
      WHERE user_id = ? 
      AND status IN ('Pending', 'Confirmed', 'Seated')
      AND (reservation_date > CURDATE() OR (reservation_date = CURDATE() AND end_time > CURTIME()))
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
        GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ', ') as assigned_tables
      FROM reservations r
      LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      LEFT JOIN tables t ON rt.table_id = t.table_id
      WHERE r.user_id = ? 
      AND r.status IN ('Pending', 'Confirmed', 'Seated')
      AND (r.reservation_date > CURDATE() OR (r.reservation_date = CURDATE() AND r.end_time > CURTIME()))
      GROUP BY r.reservation_id
      ORDER BY r.created_at DESC LIMIT 1`;
    const [rows] = await db.execute(sql, [userId]);
    return rows[0];
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
  updateStatus: async (id, status) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const bStatus = status.toLowerCase();
      await conn.execute(
        "UPDATE reservations SET status = ? WHERE reservation_id = ?",
        [status, id],
      );
      await conn.execute(
        "UPDATE reservation_tables SET status = ? WHERE reservation_id = ?",
        [bStatus, id],
      );

      if (bStatus === "seated") {
        await conn.execute(
          `
          UPDATE tables t JOIN reservation_tables rt ON t.table_id = rt.table_id 
          SET t.status = 'occupied' WHERE rt.reservation_id = ?`,
          [id],
        );
      } else if (["completed", "rejected", "cancelled"].includes(bStatus)) {
        await conn.execute(
          `
          UPDATE tables t JOIN reservation_tables rt ON t.table_id = rt.table_id 
          SET t.status = 'available', t.available_seats = t.capacity WHERE rt.reservation_id = ?`,
          [id],
        );
      }
      await conn.commit();
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

  // ==================== CRUD OPERATIONS ====================
  getItemsByReservationId: async (id) => {
    const sql = `
      SELECT mi.name, ri.quantity, mi.price, ri.customizations FROM reservation_items ri
      JOIN menu_items mi ON ri.product_id = mi.item_id WHERE ri.reservation_id = ?
      UNION ALL
      SELECT mi.name, ko.quantity, mi.price, ko.customizations FROM kiosk_orders ko
      JOIN menu_items mi ON ko.item_id = mi.item_id WHERE ko.reservation_id = ?
      UNION ALL
      SELECT package_name AS name, 1, 0, NULL FROM reservations WHERE reservation_id = ? 
      AND NOT EXISTS (SELECT 1 FROM reservation_items WHERE reservation_id = ?) 
      AND NOT EXISTS (SELECT 1 FROM kiosk_orders WHERE reservation_id = ?)`;
    const [rows] = await db.execute(sql, [id, id, id, id, id]);
    return rows;
  },

  create: async (data) => {
    const conn = await db.getConnection();
    try {
      const customId = generateRandomId();

      // 1. Insert into reservations
      const resQuery = `INSERT INTO reservations (
      reservation_id, user_id, first_name, last_name, email, phone, 
      reservation_date, reservation_time, end_time, num_guests, 
      package_name, status, receipt_path, brgy_code, allergy, 
      allergy_count, occasion, high_chair
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await conn.query(resQuery, [
        customId,
        data.userId === "null" || !data.userId ? null : data.userId,
        data.firstName,
        data.lastName,
        data.email,
        data.phone,
        data.date,
        data.startTime,
        data.endTime,
        data.pax || data.guests || data.num_guests, // PAX value (number of guests)
        data.packageName,
        "Confirmed",
        data.receiptPath,
        data.brgyCode,
        data.allergy,
        data.allergyCount || 0, // Number of people with allergy
        data.occasion || "Casual Dining", // Occasion type
        data.highChair || "No", // High chair needed
      ]);

      // 2. Insert tables (reservation_tables junction table)
      if (data.tableIds?.length > 0) {
        for (const tid of data.tableIds) {
          await conn.query(
            `INSERT INTO reservation_tables 
           (reservation_id, table_id, customer_name, status, check_in_time) 
           VALUES (?, ?, ?, 'confirmed', NOW())`,
            [customId, tid, `${data.firstName} ${data.lastName}`],
          );
        }
      }

      // 3. Insert selected items (reservation_items)
      if (data.selectedItems?.length > 0) {
        for (const item of data.selectedItems) {
          await conn.query(
            `INSERT INTO reservation_items 
           (reservation_id, product_id, quantity, price, customizations) 
           VALUES (?, ?, ?, ?, ?)`,
            [
              customId,
              item.item_id || item.id,
              item.quantity,
              item.price,
              JSON.stringify(item.customizations),
            ],
          );
        }
      }

      // 4. Insert payment record
      await conn.query(
        `INSERT INTO payments 
       (reservation_id, amount, total_bill, payment_method, payment_status, paid_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          customId,
          data.amount,
          data.totalAmount || data.amount,
          data.paymentMethod || "Gcash",
          "pending",
        ],
      );

      // 5. Insert notification (only for registered users)
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
          `Your reservation for ${data.date} at ${data.startTime} has been successfully placed.`,
        ]);
      }

      // Commit all changes
      await conn.commit();
      return customId;
    } catch (err) {
      await conn.rollback();
      console.error("Transaction Error:", err);
      throw err;
    } finally {
      conn.release();
    }
  },
  // counting customers no show
  countNoShows: async (userId) => {
    if (!userId || userId === "null") return 0;
    const sql = `SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND status = 'no-show'`;
    const [rows] = await db.execute(sql, [userId]);
    return rows[0].count;
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

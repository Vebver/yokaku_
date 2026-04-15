const db = require("../config/db");
const generateRandomId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded similar looking O, 0, I, 1
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RES-${result}`;
};

const Reservation = {
  checkActiveByUserId: async (userId) => {
    const sql =
      "SELECT reservation_id FROM reservations WHERE user_id = ? AND status IN ('Pending', 'Confirmed') LIMIT 1";
    const [rows] = await db.execute(sql, [userId]);
    return rows.length > 0;
  },

  getSlotsByTableAndDate: async (date, tableId) => {
    const sql = `
      SELECT r.reservation_time FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE r.reservation_date = ? AND rt.table_id = ? AND r.status != 'Rejected'
    `;
    const [rows] = await db.execute(sql, [date, tableId]);
    return rows.map((row) => row.reservation_time);
  },

  getOccupiedTablesByTime: async (date, startTime, endTime) => {
    const sql = `
      SELECT rt.table_id, r.status 
      FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE r.reservation_date = ? 
      AND r.status IN ('Pending', 'Confirmed', 'Seated')
      AND r.reservation_time <= ? AND r.end_time > ?`;
    const [rows] = await db.execute(sql, [date, endTime, startTime]);
    return rows;
  },

  checkTableConflicts: async (date, requestedTables, startTime, endTime) => {
    const placeholders = requestedTables.map(() => "?").join(",");
    const sql = `
      SELECT rt.table_id FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE r.reservation_date = ? 
      AND r.status IN ('Pending', 'Confirmed', 'Seated')
      AND rt.table_id IN (${placeholders})
      AND r.reservation_time < ? AND r.end_time > ?`;
    const [rows] = await db.execute(sql, [
      date,
      ...requestedTables,
      endTime,
      startTime,
    ]);
    return rows;
  },

  // --- CREATE RESERVATION + AUTOMATIC BILLING ---
create: async (data) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const customId = generateRandomId();

      // 1. Core Reservation Insert (15 Fields Total)
      const resQuery = `
        INSERT INTO reservations 
        (reservation_id, user_id, first_name, last_name, email, phone, 
         reservation_date, reservation_time, end_time, num_guests, 
         package_name, status, receipt_path, brgy_code, allergy) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await conn.execute(resQuery, [
        customId,
        data.userId || null,
        data.firstName,
        data.lastName,
        data.email,
        data.phone,
        data.date,
        data.startTime,
        data.endTime,
        data.guests,
        data.packageName || 'None',
        "Pending",
        data.receiptPath,
        data.brgyCode,
        data.allergy
      ]);

      // 2. Link Tables (reservation_tables)
      if (data.tableIds) {
        const tableIdsArray = typeof data.tableIds === 'string' ? JSON.parse(data.tableIds) : data.tableIds;
        const tableLinkQuery = "INSERT INTO reservation_tables (reservation_id, table_id) VALUES (?, ?)";
        for (const tid of tableIdsArray) {
          await conn.execute(tableLinkQuery, [customId, tid]);
        }
      }

      // 3. Create Payment entry
      const paymentQuery = "INSERT INTO payments (reservation_id, amount, payment_status) VALUES (?, ?, ?)";
      await conn.execute(paymentQuery, [customId, data.downpayment || 500, 'pending']);

      // 4. Create Notification
      if (data.userId && data.userId !== "null") {
        const notifSql = `
            INSERT INTO notifications (user_id, reservation_id, title, message, type, is_read) 
            VALUES (?, ?, ?, ?, ?, 0)`;
        await conn.execute(notifSql, [
            data.userId, 
            customId, 
            "Booking Received! ⏳", 
            `Your reservation ${customId} is awaiting verification.`, 
            "info"
        ]);
      }

      await conn.commit();
      return customId;
    } catch (err) {
      await conn.rollback();
      // THIS LOG WILL SHOW IN YOUR BACKEND TERMINAL
      console.error("CRITICAL SQL ERROR:", err.message); 
      throw err;
    } finally {
      conn.release();
    }
  },


  getAll: async () => {
    const sql = `
      SELECT r.*, p.payment_status, p.amount,
      CONCAT(b.brgy_name, ', ', m.muni_name) AS full_address,
      GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ' + ') AS assigned_tables
      FROM reservations r
      LEFT JOIN payments p ON r.reservation_id = p.reservation_id
      LEFT JOIN barangays b ON r.brgy_code = b.brgy_code
      LEFT JOIN municipalities m ON b.muni_code = m.muni_code
      LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      LEFT JOIN tables t ON rt.table_id = t.table_id
      GROUP BY r.reservation_id ORDER BY r.created_at DESC`;
    const [rows] = await db.execute(sql);
    return rows;
  },

  findById: async (id) => {
    const sql = `
      SELECT r.*, p.payment_status, p.amount, p.payment_id,
      CONCAT(IFNULL(b.brgy_name, 'N/A'), ', ', IFNULL(m.muni_name, 'N/A')) AS full_address,
      GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ' + ') AS assigned_tables
      FROM reservations r
      LEFT JOIN payments p ON r.reservation_id = p.reservation_id
      LEFT JOIN barangays b ON r.brgy_code = b.brgy_code
      LEFT JOIN municipalities m ON b.muni_code = m.muni_code
      LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      LEFT JOIN tables t ON rt.table_id = t.table_id
      WHERE r.reservation_id = ? GROUP BY r.reservation_id`;
    const [rows] = await db.execute(sql, [id]);
    return rows[0];
  },

  updateStatus: async (id, status) => {
    await db.execute(
      "UPDATE reservations SET status = ? WHERE reservation_id = ?",
      [status, id],
    );
  },

  delete: async (id) => {
    await db.execute("DELETE FROM reservations WHERE reservation_id = ?", [id]);
  },
};

module.exports = Reservation;

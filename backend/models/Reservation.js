const db = require("../config/db");

const Reservation = {
  // Check if user has an active booking
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
    return rows.map(row => row.reservation_time);
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

  // Get statuses for map colors
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

  // Check for specific table conflicts before booking
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

  // Create Reservation (using a Transaction)
  create: async (data) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction(); // if one of the table inserts fails, we can rollback the entire reservation

      // 1. Insert Core Reservation
      const resQuery = `
        INSERT INTO reservations 
        (user_id, first_name, last_name, email, phone, reservation_date, reservation_time, end_time, num_guests, allergy, brgy_code, status, receipt_path) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const [resResult] = await conn.execute(resQuery, [
        data.userId || null,
        data.firstName,
        data.lastName,
        data.email,
        data.phone,
        data.date,
        data.startTime,
        data.endTime,
        data.guests,
        data.allergy,
        data.brgyCode,
        "Confirmed",
        data.receiptPath,
      ]);

      const newReservationId = resResult.insertId;

      // 2. Link Tables in Junction Table
      const tableLinkQuery =
        "INSERT INTO reservation_tables (reservation_id, table_id) VALUES (?, ?)";
      for (const tid of data.tableIds) {
        await conn.execute(tableLinkQuery, [newReservationId, tid]);
      }

      // 3. Optional: Create Notification Query
      if (data.userId && data.userId !== "null") {
        const notifQuery =
          "INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)";
        const tableStr = data.tableIds.join(", ");
        await conn.execute(notifQuery, [
          data.userId,
          "Reservation Confirmed! ✅",
          `Your reservation for ${data.date} at Table ${tableStr} has been approved.`,
          "success",
          0,
        ]);
      }

      await conn.commit();
      return newReservationId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // Logic for Admin View (already provided by you)
  getAll: async () => {
    const sql = `
      SELECT r.*, p.payment_status,
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
      SELECT r.*, CONCAT(IFNULL(b.brgy_name, 'N/A'), ', ', IFNULL(m.muni_name, 'N/A')) AS full_address,
      GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ' + ') AS assigned_tables
      FROM reservations r
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

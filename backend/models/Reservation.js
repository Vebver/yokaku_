const db = require("../config/db");
const Notification = require("./Notification");

const generateRandomId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RES-${result}`;
};

const Reservation = {
  // --- EXISTING METHODS ---
  checkActiveByUserId: async (userId) => {
    const sql =
      "SELECT reservation_id FROM reservations WHERE user_id = ? AND status IN ('Pending', 'Confirmed') LIMIT 1";
    const [rows] = await db.execute(sql, [userId]);
    return rows.length > 0;
  },

  getSlotsByTableAndDate: async (date, tableId) => {
    const sql = `SELECT r.reservation_time FROM reservations r JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id WHERE r.reservation_date = ? AND rt.table_id = ? AND r.status != 'Rejected'`;
    const [rows] = await db.execute(sql, [date, tableId]);
    return rows.map((row) => row.reservation_time);
  },

  getOccupiedTablesByTime: async (date, startTime, endTime) => {
    const sql = `SELECT rt.table_id, r.status FROM reservations r JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id WHERE r.reservation_date = ? AND r.status IN ('Pending', 'Confirmed', 'Seated') AND r.reservation_time <= ? AND r.end_time > ?`;
    const [rows] = await db.execute(sql, [date, endTime, startTime]);
    return rows;
  },

  checkTableConflicts: async (date, requestedTables, startTime, endTime) => {
    const placeholders = requestedTables.map(() => "?").join(",");
    const sql = `SELECT rt.table_id FROM reservations r JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id WHERE r.reservation_date = ? AND r.status IN ('Pending', 'Confirmed', 'Seated') AND rt.table_id IN (${placeholders}) AND r.reservation_time < ? AND r.end_time > ?`;
    const [rows] = await db.execute(sql, [
      date,
      ...requestedTables,
      endTime,
      startTime,
    ]);
    return rows;
  },

  // --- MOVED: GET SPECIFIC TABLE SCHEDULE ---
  getSpecificTableSchedule: async (tableId, date) => {
    const cleanId = String(tableId).replace(/\D/g, ""); // Standardize ID format
    const sql = `
      SELECT r.reservation_time AS startTime, r.end_time AS endTime, r.status
      FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE rt.table_id = ? AND r.reservation_date = ? 
      AND r.status IN ('Pending', 'Confirmed', 'Seated')`;

    const [rows] = await db.execute(sql, [cleanId, date]);
    return rows;
  },

  // --- MOVED: GET ITEMS BY RESERVATION ID ---
  // --- GET ITEMS BY RESERVATION ID (With Price Lookup) ---
  getItemsByReservationId: async (reservationId) => {
    const sql = `
      SELECT 
        r.package_name AS name, 
        1 AS quantity, 
        IFNULL(mi.price, 0) AS price 
      FROM reservations r
      LEFT JOIN menu_items mi ON 
        (r.package_name = mi.name OR REPLACE(r.package_name, ' (x1)', '') = mi.name)
      WHERE r.reservation_id = ?

      UNION ALL

      SELECT 
        mi.name, 
        ri.quantity, 
        ri.price
      FROM reservation_items ri
      JOIN menu_items mi ON ri.product_id = mi.item_id
      WHERE ri.reservation_id = ?`;

    const [rows] = await db.execute(sql, [reservationId, reservationId]);
    return rows;
  },
  // --- CREATE METHOD ---
create: async (data) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const customId = generateRandomId();

      const resQuery = `INSERT INTO reservations (reservation_id, user_id, first_name, last_name, email, phone, reservation_date, reservation_time, end_time, num_guests, package_name, status, receipt_path, brgy_code, allergy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const resValues = [
        customId,
        (data.userId && data.userId !== "null") ? data.userId : null,
        data.firstName || null,
        data.lastName || null,
        data.email || null,
        data.phone || null,
        data.date || null,
        data.startTime || null,
        data.endTime || null,
        data.guests || 0,
        data.packageName || "Table Reservation",
        data.status || "Confirmed",
        data.receiptPath || null, // Ensure this matches the key in the controller
        data.brgyCode || null,
        data.allergy || "None",
      ];

      await conn.execute(resQuery, resValues);

      // Handle Tables
      let tableIdsArray = data.tableIds || [];
      if (typeof tableIdsArray === "string") tableIdsArray = JSON.parse(tableIdsArray);
      
      if (tableIdsArray.length > 0) {
        const tableLinkQuery = "INSERT INTO reservation_tables (reservation_id, table_id) VALUES (?, ?)";
        for (const tid of tableIdsArray) {
          const cleanTid = parseInt(String(tid).replace(/\D/g, ""));
          await conn.execute(tableLinkQuery, [customId, cleanTid || 0]);
        }
      }

      // Handle Items (This is a common place for 'undefined' errors)
      if (data.selectedItems && data.selectedItems.length > 0) {
        const itemQuery = `INSERT INTO reservation_items (reservation_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`;

        for (const item of data.selectedItems) {
          await conn.execute(itemQuery, [
            customId,
            item.item_id || item.id || null, // Fallback if ID is named differently
            item.quantity || 0,
            item.price || 0
          ]);
        }
      }

      // Handle Notification
      if (data.userId) {
        await Notification.create(conn, {
          userId: data.userId,
          reservationId: customId,
          title: "Reservation Confirmed",
          message: `Your reservation for ${data.guests} guest(s) on ${data.date} at ${data.startTime} has been confirmed.`,
          type: "reservation"
        });
      }

      // Handle Payment
      const paymentQuery = "INSERT INTO payments (reservation_id, amount, payment_status) VALUES (?, ?, ?)";
      await conn.execute(paymentQuery, [
        customId,
        data.downpayment || 0,
        "pending",
      ]);

      await conn.commit();
      return customId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
  getAll: async () => {
    const sql = `SELECT r.*, p.payment_status, p.amount, CONCAT(b.brgy_name, ', ', m.muni_name) AS full_address, GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ' + ') AS assigned_tables FROM reservations r LEFT JOIN payments p ON r.reservation_id = p.reservation_id LEFT JOIN barangays b ON r.brgy_code = b.brgy_code LEFT JOIN municipalities m ON b.muni_code = m.muni_code LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id LEFT JOIN tables t ON rt.table_id = t.table_id GROUP BY r.reservation_id ORDER BY r.created_at DESC`;
    const [rows] = await db.execute(sql);
    return rows;
  },

  findById: async (id) => {
    const sql = `SELECT r.*, p.payment_status, p.amount, p.payment_id, CONCAT(IFNULL(b.brgy_name, 'N/A'), ', ', IFNULL(m.muni_name, 'N/A')) AS full_address, GROUP_CONCAT(DISTINCT t.table_number SEPARATOR ' + ') AS assigned_tables FROM reservations r LEFT JOIN payments p ON r.reservation_id = p.reservation_id LEFT JOIN barangays b ON r.brgy_code = b.brgy_code LEFT JOIN municipalities m ON b.muni_code = m.muni_code LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id LEFT JOIN tables t ON rt.table_id = t.table_id WHERE r.reservation_id = ? GROUP BY r.reservation_id`;
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

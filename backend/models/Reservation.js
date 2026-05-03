const db = require("../config/db");
const Notification = require("./Notification");
const TableStatus = require("./TableStatus");

const formatTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  // Handles HH:mm:ss or HH:mm
  let [hours, minutes] = timeStr.split(":");
  let period = "AM";
  hours = parseInt(hours, 10);
  if (hours >= 12) {
    period = "PM";
    if (hours > 12) hours -= 12;
  }
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
};

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
  // models/Reservation.js

checkActiveByUserId: async (userId) => {
  // CHANGE: Remove 'Seated' from this query.
  // Now, if a user is already 'Seated', this returns false, 
  // allowing them to create a new reservation.
  const sql = `
    SELECT reservation_id FROM reservations 
    WHERE user_id = ? 
    AND status IN ('Pending', 'Confirmed', 'Seated') 
    LIMIT 1
  `;
  const [rows] = await db.execute(sql, [userId]);
  return rows.length > 0;
},

  getSlotsByTableAndDate: async (date, tableId) => {
    const sql = `SELECT r.reservation_time FROM reservations r JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id WHERE r.reservation_date = ? AND rt.table_id = ? AND r.status != 'Rejected'`;
    const [rows] = await db.execute(sql, [date, tableId]);
    return Array.isArray(rows) ? rows.map((row) => row.reservation_time) : [];
  },

  getOccupiedTablesByTime: async (date, startTime, endTime) => {
    const sql = `SELECT rt.table_id, r.status FROM reservations r JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id WHERE r.reservation_date = ? AND r.status IN ('Pending', 'Confirmed', 'Seated') AND r.reservation_time <= ? AND r.end_time > ?`;
    const [rows] = await db.execute(sql, [date, endTime, startTime]);
    return rows;
  },

  checkTableConflicts: async (date, requestedTables, startTime, endTime) => {
    // SAFETY GUARD: Prevent .map() crash if requestedTables is undefined or empty
    if (!Array.isArray(requestedTables) || requestedTables.length === 0)
      return [];

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

  getSpecificTableSchedule: async (tableId, date) => {
    const cleanId = String(tableId).replace(/\D/g, "");
    const sql = `
      SELECT r.reservation_time AS startTime, r.end_time AS endTime, r.status
      FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE rt.table_id = ? AND r.reservation_date = ? 
      AND r.status IN ('Pending', 'Confirmed', 'Seated')`;

    const [rows] = await db.execute(sql, [cleanId, date]);
    return rows;
  },

 getItemsByReservationId: async (reservationId) => {
  const sql = `
    /* 1. Get items from Website Bookings */
    SELECT 
      mi.name, 
      ri.quantity, 
      mi.price,
      ri.customizations
    FROM reservation_items ri
    JOIN menu_items mi ON ri.product_id = mi.item_id
    WHERE ri.reservation_id = ?

    UNION ALL

    /* 2. Get items from Kiosk/Walk-in Orders (THIS WAS MISSING) */
    SELECT 
      mi.name, 
      ko.quantity, 
      mi.price,
      ko.customizations
    FROM kiosk_orders ko
    JOIN menu_items mi ON ko.item_id = mi.item_id
    WHERE ko.reservation_id = ?

    UNION ALL

    /* 3. Fallback: Only show the generic package name if BOTH item tables are empty */
    SELECT 
      r.package_name AS name, 
      1 AS quantity, 
      0 AS price,
      NULL AS customizations
    FROM reservations r
    WHERE r.reservation_id = ? 
    AND NOT EXISTS (SELECT 1 FROM reservation_items WHERE reservation_id = ?)
    AND NOT EXISTS (SELECT 1 FROM kiosk_orders WHERE reservation_id = ?)
  `;

  // Note: We now need to pass the ID 5 times because there are 5 '?'
  const [rows] = await db.execute(sql, [
    reservationId, 
    reservationId, 
    reservationId, 
    reservationId, 
    reservationId
  ]);
  return rows;
},

create: async (data) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      
      // Ensure we are using the Rounded values from the start
      const customId = generateRandomId(); 

      // 1. Insert Main Reservation
      const resQuery = `INSERT INTO reservations (reservation_id, user_id, first_name, last_name, email, phone, reservation_date, reservation_time, end_time, num_guests, package_name, status, receipt_path, brgy_code, allergy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const resValues = [
        customId,
        data.userId && data.userId !== "null" ? data.userId : null,
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
        data.receiptPath || null,
        data.brgyCode || null,
        data.allergy || "None",
      ];
      
      // Use query for better stability over cross-cloud networks
      await conn.query(resQuery, resValues);

      // 2. Insert Tables
      let tableIdsArray = data.tableIds || [];
      if (typeof tableIdsArray === "string") tableIdsArray = JSON.parse(tableIdsArray);

      if (Array.isArray(tableIdsArray) && tableIdsArray.length > 0) {
        const tableLinkQuery = "INSERT INTO reservation_tables (reservation_id, table_id, customer_name, status, check_in_time) VALUES (?, ?, ?, 'confirmed', NOW())";
        for (const tid of tableIdsArray) {
          const cleanTid = parseInt(tid);
          if (!isNaN(cleanTid)) {
            // query is faster and more stable for loops
            await conn.query(tableLinkQuery, [customId, cleanTid, `${data.firstName} ${data.lastName}`]);
          }
        }
      }

      // 3. Insert Items
      let itemsToProcess = data.selectedItems || [];
      if (typeof itemsToProcess === "string") itemsToProcess = JSON.parse(itemsToProcess);

      if (itemsToProcess.length > 0) {
        const itemQuery = `INSERT INTO reservation_items (reservation_id, product_id, quantity, price, customizations) VALUES (?, ?, ?, ?, ?)`;
        for (const item of itemsToProcess) {
          const cleanPrice = Math.round(parseFloat(item.price || 0) * 100) / 100;
          const customs = item.customizations ? JSON.stringify(item.customizations) : null;
          
          await conn.query(itemQuery, [
            customId,
            item.item_id || item.id,
            item.quantity,
            cleanPrice,
            customs
          ]);
        }
      }

      // 4. Insert Payment
      const paymentQuery = `INSERT INTO payments (reservation_id, amount, total_bill, payment_method, payment_status, paid_at) VALUES (?, ?, ?, ?, ?, NOW())`;
      const cleanAmount = Math.round(parseFloat(data.amount || 0) * 100) / 100;
      const cleanTotal = Math.round(parseFloat(data.totalAmount || data.amount || 0) * 100) / 100;

      await conn.query(paymentQuery, [
        customId,
        cleanAmount,
        cleanTotal,
        data.paymentMethod || "Gcash",
        data.paymentStatus || "pending",
      ]);

      // 5. Final Notification (Optional: Wrap in try/catch so it doesn't kill the whole booking)
      try {
          if (data.userId && data.userId !== "null") {
            await Notification.create(conn, {
              userId: data.userId,
              reservationId: customId,
              title: "Reservation Confirmed",
              message: `Your reservation for ${data.guests} guest(s) has been confirmed.`,
              type: "info", // Matching your ENUM fix!
            });
          }
      } catch (notifErr) {
          console.warn("Notification failed, but booking was saved.");
      }

      await conn.commit();
      return customId;
    } catch (err) {
      await conn.rollback();
      console.error("TRANSACTION ERROR:", err.message);
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
    await TableStatus.updateTableStatusByReservation(id, status);
  },

  delete: async (id) => {
    await db.execute("DELETE FROM reservations WHERE reservation_id = ?", [id]);
  },
};

module.exports = Reservation;

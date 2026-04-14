const Reservation = require("../models/Reservation");
const db = require("../config/db");

const reservationController = {
  // --- 1. NEW: Check if user already has an active booking (Fixes 404) ---
  checkUserActive: async (req, res) => {
    try {
      const { userId } = req.params;
      const [rows] = await db.execute(
        "SELECT reservation_id FROM reservations WHERE user_id = ? AND status IN ('Pending', 'Confirmed') LIMIT 1",
        [userId]
      );
      res.json({ hasActive: rows.length > 0 });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // --- 2. NEW: Get statuses for map colors (Green/Orange/Red) (Fixes 404) ---
  getTableStatuses: async (req, res) => {
    try {
      const { date, startTime, endTime } = req.query;
      if (!date || !startTime) return res.json({});

      const [rows] = await db.execute(
        `SELECT rt.table_id, r.status 
         FROM reservations r
         JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
         WHERE r.reservation_date = ? 
         AND r.status IN ('Pending', 'Confirmed', 'Seated')
         AND r.reservation_time <= ? AND r.end_time > ?`,
        [date, endTime, startTime]
      );

      const statusMap = {};
      rows.forEach(row => { statusMap[row.table_id] = row.status; });
      res.json(statusMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // --- 3. UPDATED: Create Reservation (Fixes 500) ---
  createReservation: async (req, res) => {
  // Check your Backend terminal for these logs
  try {
      const {
        date, startTime, endTime, tableIds, userId,
        firstName, lastName, email, phone, guests, allergy, brgyCode,
      } = req.body;

      const requestedTables = typeof tableIds === "string" ? JSON.parse(tableIds) : tableIds;

      // Check conflicts just in case
      const [conflicts] = await db.execute(
        `SELECT rt.table_id FROM reservations r
         JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
         WHERE r.reservation_date = ? 
         AND r.status IN ('Pending', 'Confirmed', 'Seated')
         AND rt.table_id IN (${requestedTables.map(() => "?").join(",")})
         AND r.reservation_time < ? AND r.end_time > ?`,
        [date, ...requestedTables, endTime, startTime]
      );

      if (conflicts.length > 0) {
            return res.status(400).json({ message: "Table already occupied for this time." });
      }

    // 3. INSERT RESERVATION
    const [result] = await db.execute(
      `INSERT INTO reservations 
          (user_id, first_name, last_name, email, phone, reservation_date, reservation_time, end_time, num_guests, allergy, brgy_code, status, receipt_path) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        firstName,
        lastName,
        email,
        phone,
        date,
        startTime,
        endTime,
        guests,
        allergy,
        brgyCode,
        "Confirmed",
        req.file ? req.file.filename : null
      ]
    );

    const newReservationId = result.insertId;

    // 4. LINK TO JUNCTION TABLE
    for (const tid of requestedTables) {
      await db.execute(
        "INSERT INTO reservation_tables (reservation_id, table_id) VALUES (?, ?)",
        [newReservationId, tid]
      );
    }

    if (userId && userId !== "null") {
        const formattedDate = new Date(date).toLocaleDateString();
        const tableInfo = requestedTables.length > 0 ? `at Table ${requestedTables.join(", ")}` : "";
        
        await db.execute(
          "INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)",
          [userId, "Reservation Confirmed! ✅", `Your reservation for ${formattedDate} ${tableInfo} has been approved.`, "success", 0]
        );
        console.log(`Notification sent to User ID: ${userId}`);
      }

    res.status(201).json({ id: newReservationId, message: "Success!" });

  } catch (error) {
    // THIS LOG WILL TELL YOU THE REAL ERROR IN YOUR TERMINAL
    console.error("CRITICAL BACKEND ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
},

  // --- REST OF YOUR FUNCTIONS (PRESERVED) ---
  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();
      res.json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  checkAvailability: async (req, res) => {
    try {
      const { date, tableId } = req.query;
      const [rows] = await db.execute(
        `SELECT r.reservation_time FROM reservations r
         JOIN reservation_tables rt ON r.id = rt.reservation_id
         WHERE r.reservation_date = ? AND rt.table_id = ? AND r.status != 'Rejected'`,
        [date, tableId]
      );
      res.json({ bookedSlots: rows.map(row => row.reservation_time) });
    } catch (error) { res.status(500).json({ error: "Server error" }); }
  },

  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await Reservation.updateStatus(id, status);
      res.json({ message: `Status updated to ${status}` });
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  deleteReservation: async (req, res) => {
    try {
      await Reservation.delete(req.params.id);
      res.json({ message: "Deleted" });
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  checkReservationId: async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (reservation) res.json({ success: true, reservation });
      else res.status(404).json({ success: false, message: "Not found" });
    } catch (error) { res.status(500).json({ error: error.message }); }
  },
};

module.exports = reservationController;
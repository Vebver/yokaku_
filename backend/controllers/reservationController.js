const db = require("../config/db");
const Reservation = require("../models/Reservation");

const formatTimeTo24h = (timeStr) => {
  if (!timeStr) return null;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = parseInt(hours, 10) + 12;
  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
};

const reservationController = {
  checkUserActive: async (req, res) => {
    try {
      const hasActive = await Reservation.checkActiveByUserId(
        req.params.userId,
      );
      res.json({ hasActive });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  checkAvailability: async (req, res) => {
    try {
      const { date, tableId } = req.query;
      if (!date || !tableId) {
        return res
          .status(400)
          .json({ error: "Date and Table ID are required" });
      }

      const bookedSlots = await Reservation.getSlotsByTableAndDate(
        date,
        tableId,
      );
      res.json({ bookedSlots });
    } catch (error) {
      console.error("Availability Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  getTableStatuses: async (req, res) => {
    try {
      const { date, startTime, endTime } = req.query;
      if (!date || !startTime) return res.json({});
      const rows = await Reservation.getOccupiedTablesByTime(
        date,
        startTime,
        endTime,
      );

      const statusMap = {};
      rows.forEach((row) => {
        statusMap[row.table_id] = row.status;
      });
      res.json(statusMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createReservation: async (req, res) => {
    try {
      const body = req.body;

      // 1. Parse Table IDs
      const requestedTables =
        typeof body.tableIds === "string"
          ? JSON.parse(body.tableIds)
          : body.tableIds;

      // 2. CRITICAL FIX: Format times for MySQL
      const dbStart = formatTimeTo24h(body.startTime);
      const dbEnd = formatTimeTo24h(body.endTime);

      // 3. Check Conflicts using the 24h formatted times
      const conflicts = await Reservation.checkTableConflicts(
        body.date,
        requestedTables,
        dbStart, // Using 24h
        dbEnd, // Using 24h
      );

      if (conflicts.length > 0) {
        // Return 400 if a conflict is found
        return res.status(400).json({
          message:
            "One or more tables are already booked for this specific time slot.",
        });
      }

      // 4. Create the Reservation
      // We pass the formatted 24h times to the model so the DB saves them correctly
      const newId = await Reservation.create({ ...body });

      // --- UPDATED NOTIFICATION LOGIC ---
      if (body.userId && body.userId !== "null") {
        const title = "Reservation Confirmed! ✅";
        const message = `Your reservation ${newId} has been confirmed. Check your profile for details.`;

        const notifQuery = `
          INSERT INTO notifications 
          (user_id, reservation_id, title, message, type, is_read) 
          VALUES (?, ?, ?, ?, ?, ?)`;

        await db.execute(notifQuery, [
          body.userId,
          newId, // <--- Save the ID to the new column
          title,
          message,
          "success",
          0,
        ]);
      }

      return res.status(201).json({ id: newId, message: "Success!" });
    } catch (error) {
      console.error("CRITICAL BACKEND ERROR:", error.message);
      if (!res.headersSent) {
        return res.status(500).json({ error: error.message });
      }
    }
  },

  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      await Reservation.updateStatus(req.params.id, req.body.status);
      res.json({ message: `Status updated to ${req.body.status}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteReservation: async (req, res) => {
    try {
      await Reservation.delete(req.params.id);
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  checkReservationId: async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (reservation) res.json({ success: true, reservation });
      else res.status(404).json({ success: false, message: "Not found" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getSpecificTableSchedule: async (req, res) => {
    try {
      const { tableId, date } = req.query;

      // Safety check: if params are missing, don't crash, just return empty
      if (!tableId || !date) {
        return res.json([]);
      }

      // Ensure tableId is a number (if frontend sends "T1", this cleans it)
      const cleanId = String(tableId).replace(/\D/g, "");

      const [rows] = await db.execute(
        `SELECT r.reservation_time AS startTime, r.end_time AS endTime, r.status
         FROM reservations r
         JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
         WHERE rt.table_id = ? AND r.reservation_date = ? 
         AND r.status IN ('Pending', 'Confirmed', 'Seated')`,
        [cleanId, date],
      );

      res.json(rows);
    } catch (error) {
      console.error("Schedule Query Error:", error.message);
      res.status(400).json({ error: error.message }); // This was the 400
    }
  },
};

module.exports = reservationController;

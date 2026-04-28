const axios = require("axios"); // For PayMongo API calls
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

const formatTimeFrom24h = (timeStr) => {
  if (!timeStr) return null;
  let [hours, minutes] = timeStr.split(":");
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hour12.toString().padStart(2, "0")}:${minutes} ${ampm}`;
};

// Helper function to check if a reservation is ongoing
const isReservationOngoing = (startTime, endTime) => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startM = startHours * 60 + startMinutes;
  const endM = endHours * 60 + endMinutes;

  return currentTime >= startM && currentTime <= endM;
};

const isReservationCompleted = (endTime, reservationDate) => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const currentDate = now.toISOString().split("T")[0];

  // If reservation date is in the past, it's completed
  if (reservationDate < currentDate) return true;

  // If reservation date is today, check if end time has passed
  if (reservationDate === currentDate) {
    const endM = timeToMin(endTime);
    return currentTime > endM;
  }

  return false;
};

const reservationController = {
  // --- REAL-TIME STATUS UPDATE ENDPOINT ---
  updateOngoingReservations: async (req, res) => {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDate = now.toISOString().split("T")[0];

      // Update Confirmed/Pending to Seated when current time is between start and end
      const updateToSeated = `
        UPDATE reservations 
        SET status = 'Seated' 
        WHERE reservation_date = ? 
        AND status IN ('Confirmed', 'Pending')
        AND reservation_time <= ?
        AND end_time >= ?
      `;

      const [seatedResult] = await db.execute(updateToSeated, [
        currentDate,
        currentTime,
        currentTime,
      ]);

      // Update Seated to Completed when current time is past end time
      const updateToCompleted = `
        UPDATE reservations 
        SET status = 'Completed' 
        WHERE reservation_date = ? 
        AND status = 'Seated'
        AND end_time < ?
      `;

      const [completedResult] = await db.execute(updateToCompleted, [
        currentDate,
        currentTime,
      ]);

      if (res) {
        res.json({
          updatedToSeated: seatedResult.affectedRows,
          updatedToCompleted: completedResult.affectedRows,
        });
      }

      return {
        seated: seatedResult.affectedRows,
        completed: completedResult.affectedRows,
      };
    } catch (error) {
      console.error("Error updating ongoing reservations:", error);
      if (res) {
        res.status(500).json({ error: error.message });
      }
      return { seated: 0, completed: 0 };
    }
  },

  // --- EXISTING LOGIC ---

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

  getReservationItems: async (req, res) => {
    try {
      const { id } = req.params;
      const items = await Reservation.getItemsByReservationId(id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching reservation items:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  getSpecificTableSchedule: async (req, res) => {
    try {
      const { tableId, date } = req.query;
      if (!tableId || !date) return res.json([]);
      const rows = await Reservation.getSpecificTableSchedule(tableId, date);

      // Add real-time status for ongoing reservations
      const enhancedRows = rows.map((row) => {
        const enhancedRow = { ...row };
        // If status is Confirmed or Pending and current time is between start and end, mark as Seated
        if (
          (row.status === "Confirmed" || row.status === "Pending") &&
          isReservationOngoing(row.startTime, row.endTime)
        ) {
          enhancedRow.status = "Seated";
        }
        return enhancedRow;
      });

      res.json(enhancedRows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getTableStatuses: async (req, res) => {
    try {
      const { date, startTime, endTime } = req.query;
      if (!date) return res.json({});

      let rows;
      // If time is provided, check for specific overlaps (Red/Occupied)
      if (startTime && endTime && startTime !== "" && endTime !== "") {
        rows = await Reservation.getOccupiedTablesByTime(
          date,
          startTime,
          endTime,
        );
      } else {
        // If NO time is provided, check for ANY reservation on that day (Yellow/Reserved)
        const sql = `
          SELECT DISTINCT rt.table_id, r.status, r.reservation_time, r.end_time
          FROM reservations r 
          JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id 
          WHERE r.reservation_date = ? 
          AND r.status IN ('Pending', 'Confirmed', 'Seated')`;
        const [result] = await db.execute(sql, [date]);
        rows = result;
      }

      const statusMap = {};
      rows.forEach((row) => {
        let status = row.status;
        // Check if this reservation should be considered ongoing/occupied
        if (
          (status === "Confirmed" || status === "Pending") &&
          row.reservation_time &&
          row.end_time
        ) {
          // Convert to 24h format if needed
          let startTimeCheck = row.reservation_time;
          let endTimeCheck = row.end_time;

          // If time is in 12h format, convert to 24h for comparison
          if (startTimeCheck.includes("AM") || startTimeCheck.includes("PM")) {
            startTimeCheck = formatTimeTo24h(startTimeCheck);
            endTimeCheck = formatTimeTo24h(endTimeCheck);
          }

          if (isReservationOngoing(startTimeCheck, endTimeCheck)) {
            status = "Seated";
          }
        }
        statusMap[row.table_id] = status;
      });
      res.json(statusMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createReservation: async (req, res) => {
    try {
      const body = req.body;

      const requestedTables =
        typeof body.tableIds === "string"
          ? JSON.parse(body.tableIds)
          : body.tableIds;

      const items =
        typeof body.selectedItems === "string"
          ? JSON.parse(body.selectedItems)
          : body.selectedItems || [];

      const dbStart = formatTimeTo24h(body.startTime);
      const dbEnd = formatTimeTo24h(body.endTime);

      const conflicts = await Reservation.checkTableConflicts(
        body.date,
        requestedTables,
        dbStart,
        dbEnd,
      );

      if (conflicts.length > 0) {
        return res.status(400).json({
          message:
            "One or more tables are already booked for this specific time slot.",
        });
      }

      const reservationData = {
        ...body,
        userId: body.userId || req.user?.userId, // ✅ ADD THIS LINE - IMPORTANT!
        firstName: body.firstName,
        lastName: body.lastName,
        date: body.date,
        guests: body.guests,
        startTime: dbStart,
        endTime: dbEnd,
        tableIds: requestedTables,
        selectedItems: items,
        receiptPath: req.file ? req.file.filename : body.receiptPath || null,
      };

      console.log(
        "🔍 Creating reservation with userId:",
        reservationData.userId,
      ); // Debug log

      const newId = await Reservation.create(reservationData);
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

      // Enhance reservation data with real-time status
      const enhancedData = data.map((reservation) => {
        const enhanced = { ...reservation };
        if (
          (enhanced.status === "Confirmed" || enhanced.status === "Pending") &&
          enhanced.reservation_time &&
          enhanced.end_time
        ) {
          if (
            isReservationOngoing(enhanced.reservation_time, enhanced.end_time)
          ) {
            enhanced.status = "Seated";
          }
        }
        return enhanced;
      });

      res.json(enhancedData);
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
      if (reservation) {
        // Enhance with real-time status
        if (
          (reservation.status === "Confirmed" ||
            reservation.status === "Pending") &&
          reservation.reservation_time &&
          reservation.end_time
        ) {
          if (
            isReservationOngoing(
              reservation.reservation_time,
              reservation.end_time,
            )
          ) {
            reservation.status = "Seated";
          }
        }
        res.json({ success: true, reservation });
      } else {
        res.status(404).json({ success: false, message: "Not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = reservationController;

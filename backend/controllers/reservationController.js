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

// Helper function to convert time string to minutes
const timeToMin = (t) => {
  if (!t) return 0;
  const [time, period] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

// Helper function to check if a reservation is ongoing
const isReservationOngoing = (startTime, endTime) => {
  if (!startTime || !endTime) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const startM = timeToMin(startTime);
  const endM = timeToMin(endTime);

  return currentTime >= startM && currentTime <= endM;
};

const isReservationCompleted = (endTime, reservationDate) => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const currentDate = now.toISOString().split("T")[0];

  if (reservationDate < currentDate) return true;
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

  // Check if user has active reservation
  checkUserActive: async (req, res) => {
    try {
      const { userId } = req.params;
      console.log("🔍 [checkUserActive] Checking for user:", userId);

      // First, check if user has ANY reservation with active status
      const sql = `
        SELECT reservation_id, status, reservation_date, reservation_time, end_time
        FROM reservations 
        WHERE user_id = ? 
        AND status IN ('Pending', 'Confirmed', 'Seated')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const [rows] = await db.execute(sql, [userId]);

      console.log("🔍 [checkUserActive] Found rows:", rows.length);
      if (rows.length > 0) {
        console.log("🔍 [checkUserActive] Reservation:", rows[0]);
      }

      const hasActive = rows.length > 0;
      console.log("🔍 [checkUserActive] Result:", hasActive);

      res.json({ hasActive });
    } catch (error) {
      console.error("Error checking active reservation:", error);
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

      const enhancedRows = rows.map((row) => {
        const enhancedRow = { ...row };
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

  // Get active reservation for a user
  getUserActiveReservation: async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(
        "🔍 [getUserActiveReservation] Getting details for user:",
        userId,
      );

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
        GROUP BY r.reservation_id
        ORDER BY r.created_at DESC
        LIMIT 1
      `;

      const [rows] = await db.execute(sql, [userId]);
      console.log(
        "🔍 [getUserActiveReservation] Found:",
        rows.length > 0 ? rows[0] : "None",
      );

      res.json(rows[0] || null);
    } catch (error) {
      console.error("Error getting active reservation:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getTableStatuses: async (req, res) => {
    try {
      const { date, startTime, endTime } = req.query;
      if (!date) return res.json({});

      let rows;
      if (startTime && endTime && startTime !== "" && endTime !== "") {
        rows = await Reservation.getOccupiedTablesByTime(
          date,
          startTime,
          endTime,
        );
      } else {
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
        if (
          (status === "Confirmed" || status === "Pending") &&
          row.reservation_time &&
          row.end_time
        ) {
          let startTimeCheck = row.reservation_time;
          let endTimeCheck = row.end_time;

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
    
    // 1. Parse JSON strings from FormData (IMPORTANT)
    const items = typeof body.selectedItems === "string" 
      ? JSON.parse(body.selectedItems) 
      : body.selectedItems || [];

      let startDateTime;
      if (body.startTime === "now" || !body.startTime) {
        startDateTime = now;
      } else {
        startDateTime = new Date(`${body.date} ${body.startTime}`);
      }

      const durationHours = parseInt(body.durationHours) || 2;
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + durationHours);

      const dbDate = startDateTime.toISOString().split("T")[0];
      const dbStart = startDateTime.toTimeString().split(" ")[0];
      const dbEnd = endDateTime.toTimeString().split(" ")[0];

      let tableIdsArray = body.tableIds;
      if (typeof tableIdsArray === "string") {
        tableIdsArray = JSON.parse(tableIdsArray);
      }

      let finalPackageName = body.packageName;

      if (!finalPackageName || finalPackageName === "Table Reservation") {
        if (items.length > 0) {
          finalPackageName =
            items[0].name || items[0].item_name || "Product Selection";
          if (items.length > 1) finalPackageName += " + Others";
        } else {
          finalPackageName = "Table Reservation";
        }
      }

      const reservationData = {
        ...body,
        userId: body.userId || req.user?.userId,
        firstName: body.firstName,
        lastName: body.lastName,
        date: body.date,
        guests: body.guests,
        startTime: dbStart,
        endTime: dbEnd,
        packageName: finalPackageName,
        totalAmount: parseFloat(body.totalAmount || 0),
        amount: parseFloat(body.amount || 0),
        tableIds: tableIdsArray,
        selectedItems: items,
        receiptPath: req.file ? req.file.filename : null,
        paymentStatus: body.paymentStatus,
        paymentMethod: body.paymentMethod,
      };

      console.log(
        "🔍 Creating reservation with userId:",
        reservationData.userId,
      );

      const newId = await Reservation.create(reservationData);
      return res.status(201).json({ id: newId });
    } catch (error) {
      console.error("Create reservation error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();

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

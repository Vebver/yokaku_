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
  // Check if a user has an active/pending booking
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

  // Check specific slot availability for a table
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

  // Get food items linked to a specific reservation (Used in Billing)
  getReservationItems: async (req, res) => {
    try {
      const { id } = req.params; // This is the '?' in your SQL

      // Calling the model function that uses the JOIN we fixed
      const items = await Reservation.getItemsByReservationId(id);

      // Send the items back to the React frontend
      res.json(items);
    } catch (error) {
      console.error("Error fetching reservation items:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // Get the full schedule for a specific table on a specific date
  getSpecificTableSchedule: async (req, res) => {
    try {
      const { tableId, date } = req.query;
      if (!tableId || !date) return res.json([]);

      const rows = await Reservation.getSpecificTableSchedule(tableId, date);
      res.json(rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get which tables are occupied at a specific date/time
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
 // Create a new reservation
  createReservation: async (req, res) => {
    try {
      const body = req.body;

      // 1. Parse Table IDs if sent as stringified JSON
      const requestedTables =
        typeof body.tableIds === "string"
          ? JSON.parse(body.tableIds)
          : body.tableIds;

      // 2. Parse Selected Items (THIS WAS THE MISSING PART)
      const items = typeof body.selectedItems === "string"
        ? JSON.parse(body.selectedItems)
        : (body.selectedItems || []);

      // 3. Format times for DB compatibility
      const dbStart = formatTimeTo24h(body.startTime);
      const dbEnd = formatTimeTo24h(body.endTime);

      // 4. Check for double-booking conflicts
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

      // 5. Combine body data with the filename from Multer
      const reservationData = {
        ...body,
        firstName: body.firstName,
        lastName: body.lastName,
        date: body.date,
        guests: body.guests,
        startTime: dbStart,
        endTime: dbEnd,
        tableIds: requestedTables,
        selectedItems: items, // Now 'items' is defined!
        receiptPath: req.file ? req.file.filename : null,
      };

      // 6. Pass the NEW object to the model
      const newId = await Reservation.create(reservationData);

      return res.status(201).json({ id: newId, message: "Success!" });
    } catch (error) {
      console.error("CRITICAL BACKEND ERROR:", error.message);
      if (!res.headersSent) {
        return res.status(500).json({ error: error.message });
      }
    }
  },
  // Get all reservations (Admin Dashboard view)
  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update reservation status (Confirmed, Seated, Cancelled, etc.)
  updateStatus: async (req, res) => {
    try {
      await Reservation.updateStatus(req.params.id, req.body.status);
      res.json({ message: `Status updated to ${req.body.status}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a reservation record
  deleteReservation: async (req, res) => {
    try {
      await Reservation.delete(req.params.id);
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get full details of a specific reservation (Used for receipt validation)
  checkReservationId: async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (reservation) res.json({ success: true, reservation });
      else res.status(404).json({ success: false, message: "Not found" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = reservationController;

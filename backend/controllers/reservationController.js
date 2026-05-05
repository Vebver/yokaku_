const axios = require("axios"); // For PayMongo API calls (future use)
const Reservation = require("../models/Reservation");
const User = require("../models/User");

/**
 * UTILITY HELPERS 
 * These stay in the controller to handle formatting between the 
 * Frontend (AM/PM) and the Backend/DB (24h).
 */
const formatTimeTo24h = (timeStr) => {
  if (!timeStr) return null;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = parseInt(hours, 10) + 12;
  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
};

const reservationController = {
  
  // 1. Triggered by Cron or Admin to sync physical table colors with time
  updateOngoingReservations: async (req, res) => {
    try {
      const results = await Reservation.syncAllStatuses();
      if (res) res.json(results);
      return results;
    } catch (error) {
      console.error("Error updating ongoing reservations:", error);
      if (res) res.status(500).json({ error: error.message });
      return { seated: 0, completed: 0, expired: 0 };
    }
  },

  // 2. Check if a user has an active booking (to prevent double booking)
  checkUserActive: async (req, res) => {
    try {
      const { userId } = req.params;
      const hasActive = await Reservation.checkActiveByUserId(userId);
      res.json({ hasActive });
    } catch (error) {
      console.error("Error checking active reservation:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 3. User cancellation logic
  getCancellationCount: async (req, res) => {
    try {
      const count = await User.getCancellationCount(req.params.userId);
      res.json({ cancellationCount: count });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  recordCancellation: async (req, res) => {
    try {
      await User.incrementCancellationCount(req.body.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 4. Booking Availability logic
  checkAvailability: async (req, res) => {
    try {
      const { date, tableId } = req.query;
      if (!date || !tableId) return res.status(400).json({ error: "Missing params" });
      
      const bookedSlots = await Reservation.getSlotsByTableAndDate(date, tableId);
      res.json({ bookedSlots });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  },

  getSpecificTableSchedule: async (req, res) => {
    try {
      const { tableId, date } = req.query;
      const rows = await Reservation.getSpecificTableSchedule(tableId, date);
      res.json(rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // 5. Get all items (food/drinks) for a specific reservation
  getReservationItems: async (req, res) => {
    try {
      const items = await Reservation.getItemsByReservationId(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // 6. Get data for the "Current Reservation" card on Customer Side
  getUserActiveReservation: async (req, res) => {
    try {
      const reservation = await Reservation.findActiveDetailsByUserId(req.params.userId);
      res.json(reservation || null);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 7. Get history of all active/future bookings for a user
  getUserReservations: async (req, res) => {
    try {
      const rows = await Reservation.findAllActiveByUserId(req.params.userId);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 8. Dashboard Grid logic (Which tables are green/red/yellow)
  getTableStatuses: async (req, res) => {
    try {
      const { date, startTime, endTime } = req.query;
      const statusMap = await Reservation.getTableOccupancyMap(date, startTime, endTime);
      res.json(statusMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 9. Process the reservation from the Website
  createReservation: async (req, res) => {
    try {
      const body = req.body;

      // Parse JSON strings sent from FormData
      const items = typeof body.selectedItems === "string" ? JSON.parse(body.selectedItems) : body.selectedItems || [];
      const tableIdsArray = typeof body.tableIds === "string" ? JSON.parse(body.tableIds) : body.tableIds || [];

      // Calculate end time based on duration (default 2h)
      const startDateTime = new Date(`${body.date} ${body.startTime}`);
      const durationHours = parseInt(body.durationHours) || 2;
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + durationHours);

      const dbStart = startDateTime.toTimeString().split(" ")[0];
      const dbEnd = endDateTime.toTimeString().split(" ")[0];

      // Assemble naming logic
      let finalPackageName = body.packageName;
      if (!finalPackageName || finalPackageName === "Table Reservation") {
        if (items.length > 0) {
          finalPackageName = items[0].name || items[0].item_name || "Order";
          if (items.length > 1) finalPackageName += " + Others";
        } else {
          finalPackageName = "Table Reservation";
        }
      }

      const reservationData = {
        ...body,
        userId: body.userId || req.user?.userId,
        startTime: dbStart,
        endTime: dbEnd,
        packageName: finalPackageName,
        tableIds: tableIdsArray,
        selectedItems: items,
        receiptPath: req.file ? req.file.filename : null, // From Multer
      };

      const newId = await Reservation.create(reservationData);
      return res.status(201).json({ id: newId });
    } catch (error) {
      console.error("Create reservation error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 10. Admin List view
  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 11. Atomic status update (The fix for your 500 error)
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!id) return res.status(400).json({ error: "Reservation ID is required" });

      // Calls the Transactional update in the Model
      await Reservation.updateStatus(id, status);

      res.json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
      console.error("Update status error:", error);
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

  // 12. Finder for specific IDs (e.g. searching/modals)
  checkReservationId: async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (reservation) {
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
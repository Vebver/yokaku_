const Reservation = require("../models/Reservation");
const User = require("../models/User");
const db = require("../config/db"); // Add this for direct database queries

/**
 * UTILITY HELPERS
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
  // ==================== CRON & STATUS ====================
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

  // ==================== USER RESERVATIONS ====================
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

  getUserActiveReservation: async (req, res) => {
    try {
      const reservation = await Reservation.findActiveDetailsByUserId(
        req.params.userId,
      );
      res.json(reservation || null);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getUserReservations: async (req, res) => {
    try {
      const rows = await Reservation.findAllActiveByUserId(req.params.userId);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ==================== TABLE AVAILABILITY ====================
  checkAvailability: async (req, res) => {
    try {
      const { date, tableId } = req.query;
      if (!date || !tableId)
        return res.status(400).json({ error: "Missing params" });
      const bookedSlots = await Reservation.getSlotsByTableAndDate(
        date,
        tableId,
      );
      res.json({ bookedSlots });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  },

  getSpecificTableSchedule: async (req, res) => {
    try {
      const rows = await Reservation.getSpecificTableSchedule(
        req.query.tableId,
        req.query.date,
      );
      res.json(rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getTableStatuses: async (req, res) => {
    try {
      const { date, startTime, endTime } = req.query;
      const statusMap = await Reservation.getTableOccupancyMap(
        date,
        startTime,
        endTime,
      );
      res.json(statusMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ==================== CANCELLATIONS ====================
  getCancellationCount: async (req, res) => {
    try {
      const { userId } = req.params;
      const [rows] = await db.execute(
        "SELECT cancellation_count, last_cancellation_time FROM users WHERE user_id = ?",
        [userId],
      );
      res.json({
        cancellationCount: rows[0]?.cancellation_count || 0,
        lastCancellationTime: rows[0]?.last_cancellation_time || null,
      });
    } catch (error) {
      console.error("Error fetching cancellation count:", error);
      res.status(500).json({ error: error.message });
    }
  },

  recordCancellation: async (req, res) => {
    try {
      const { userId } = req.body;
      await User.incrementCancellationCount(userId);
      // Update last cancellation time
      await db.execute(
        "UPDATE users SET last_cancellation_time = NOW() WHERE user_id = ?",
        [userId],
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording cancellation:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // ==================== RESERVATION ITEMS ====================
  getReservationItems: async (req, res) => {
    try {
      const items = await Reservation.getItemsByReservationId(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // ==================== CREATE RESERVATION ====================
  createReservation: async (req, res) => {
    try {
      const body = req.body;
      const items =
        typeof body.selectedItems === "string"
          ? JSON.parse(body.selectedItems)
          : body.selectedItems || [];
      const tableIdsArray =
        typeof body.tableIds === "string"
          ? JSON.parse(body.tableIds)
          : body.tableIds || [];

      const startDateTime = new Date(`${body.date} ${body.startTime}`);
      const durationHours = parseInt(body.durationHours) || 2;
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + durationHours);

      const dbStart = startDateTime.toTimeString().split(" ")[0];
      const dbEnd = endDateTime.toTimeString().split(" ")[0];

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
        receiptPath: req.file ? req.file.filename : null,
      };

      const newId = await Reservation.create(reservationData);
      return res.status(201).json({ id: newId });
    } catch (error) {
      console.error("Create reservation error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // ==================== ADMIN FUNCTIONS ====================
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
      const { id } = req.params;
      const { status } = req.body;
      if (!id)
        return res.status(400).json({ error: "Reservation ID is required" });
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

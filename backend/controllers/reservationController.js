const Reservation = require("../models/Reservation");
const User = require("../models/User");

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
      const userId = body.userId;
      if (userId && (userId !== "null") !== "null") {
        const noShowCount = await Reservation.countNoShows(userId);

        // Define your limit (e.g., 3 no-shows)
        if (noShowCount >= 3) {
          return res.status(403).json({
            error: "Booking Restricted",
            message:
              "You have 3 or more no-shows. Please contact management to re-enable your account.",
          });
        }
      }
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
  console.log("HIT THE STATUS UPDATE ROUTE!");
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUser = req.user; // This comes from your 'protect' middleware

    // 1. Find the reservation
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ error: "Not found" });

    // 2. SECURITY CHECK
    const isOwner = reservation.user_id === currentUser.userId;
    const isAdmin = currentUser.role === 'admin';

    // If the user is a CUSTOMER
    if (!isAdmin) {
      // Rule A: They can only update their OWN reservation
      if (!isOwner) {
        return res.status(403).json({ error: "You do not own this reservation." });
      }

      // Rule B: They can ONLY change the status to 'Cancelled'
      // They are NOT allowed to set it to 'Seated' or 'Confirmed'
      if (status.toLowerCase() !== "cancelled") {
        return res.status(403).json({ error: "Customers can only cancel reservations." });
      }
    }

    // 3. BLACKLIST CHECK (Only if they are trying to do something OTHER than cancel)
    if (status.toLowerCase() !== "cancelled") {
      const noShowCount = await Reservation.countNoShows(reservation.user_id);
      if (noShowCount >= 3) {
        return res.status(403).json({ error: "Account restricted due to no-shows." });
      }
    }

    // 4. If Admin OR (Owner + Cancelling), proceed!
    await Reservation.updateStatus(id, status);
    res.json({ success: true, message: "Status updated." });

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

  // ==================== KIOSK VERIFICATION ====================
  checkReservationId: async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);

      if (!reservation) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid Reservation ID." });
      }

      // 1. Check if already used
      if (
        reservation.status === "Seated" ||
        reservation.status === "Completed"
      ) {
        return res.status(400).json({
          success: false,
          message: "This reservation is already active or complet ed.",
        });
      }

      // 2. Check if Rejected/Cancelled
      if (
        ["Rejected", "Cancelled", "no-show"].includes(
          reservation.status.toLowerCase(),
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `This reservation is ${reservation.status}. Please see staff.`,
        });
      }

      // 3. TIME WINDOW VALIDATION
      const now = new Date();

      // Combine Date and Time from DB (e.g. "2023-10-25" and "14:30:00")
      const scheduledTime = new Date(
        `${reservation.reservation_date} ${reservation.reservation_time}`,
      );

      // Calculate difference in minutes (Now minus Scheduled)
      const diffInMs = now - scheduledTime;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

      // CASE A: Too Early (More than 30 mins before)
      if (diffInMinutes < -30) {
        return res.status(400).json({
          success: false,
          message: `Too early! Check-in starts 30 mins before. Please wait until ${reservation.reservation_time}.`,
        });
      }

      // CASE B: Too Late (More than 60 mins after)
      if (diffInMinutes > 60) {
        // Automatically update to No-Show in DB
        await Reservation.updateStatus(reservation.reservation_id, "no-show");

        return res.status(400).json({
          success: false,
          message:
            "Reservation expired. You are more than 1 hour late and marked as a No-Show.",
        });
      }

      // 4. IF ALL CHECKS PASS
      res.json({ success: true, reservation });
    } catch (error) {
      console.error("Check ID Error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = reservationController;

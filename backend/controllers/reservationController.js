const Reservation = require("../models/Reservation");
const User = require("../models/User");
const db = require("../config/db");

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

// Helper function to calculate duration in hours
const calculateDurationHours = (startTime, endTime, date) => {
  const startDateTime = new Date(`${date} ${startTime}`);
  const endDateTime = new Date(`${date} ${endTime}`);
  const durationMs = endDateTime - startDateTime;
  const durationHours = durationMs / (1000 * 60 * 60);
  return Math.round(durationHours * 100) / 100;
};

// Helper function to calculate downpayment based on duration
const calculateDownpayment = (durationHours, totalOrderAmount = 0) => {
  let durationBasedDownpayment = 0;

  // 1 hour or less = no downpayment from duration
  if (durationHours >= 2) {
    // Base ₱200 for 2 hours
    durationBasedDownpayment = 200;
    // Add ₱50 for each additional hour beyond 2
    const additionalHours = Math.floor(durationHours - 2);
    durationBasedDownpayment += additionalHours * 50;
  }

  // Calculate 20% of total order amount
  const twentyPercentOfOrder = totalOrderAmount * 0.2;

  // Return the higher amount
  return Math.max(durationBasedDownpayment, twentyPercentOfOrder);
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
    const userId = body.userId;

    if (userId && userId !== "null") {
      const noShowCount = await Reservation.countNoShows(userId);
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

    // Calculate duration in hours from start and end time
    const startDateTime = new Date(`${body.date} ${body.startTime}`);
    const endDateTime = new Date(`${body.date} ${body.endTime}`);
    const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);

    // Calculate total order amount from items
    let totalOrderAmount = 0;
    if (items.length > 0) {
      totalOrderAmount = items.reduce((sum, item) => {
        return sum + parseFloat(item.price) * (item.quantity || 1);
      }, 0);
    } else if (body.totalAmount) {
      totalOrderAmount = parseFloat(body.totalAmount);
    }

    // Calculate downpayment based on duration and order amount
    const calculatedDownpayment = calculateDownpayment(
      durationHours,
      totalOrderAmount,
    );

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
      durationHours: durationHours,
      totalAmount: totalOrderAmount,
      downpayment: calculatedDownpayment,
      packageName: finalPackageName,
      tableIds: tableIdsArray,
      selectedItems: items,
      receiptPath: req.file ? req.file.path : null,
    };

    console.log("Saving receipt URL to DB:", reservationData.receiptPath);

    // 1. Create the database records
    const newId = await Reservation.create(reservationData);

    // 2. Emit real-time updates to all administrators via socket.io
    try {
      const [admins] = await db.execute("SELECT user_id FROM users WHERE role = 'admin'");
      const io = req.app.get("socketio");

      if (io) {
        const numGuests = reservationData.pax || reservationData.guests || reservationData.num_guests || 1;
        const notifMessage = `New reservation created by ${reservationData.firstName} ${reservationData.lastName || ""} for ${numGuests} guests on ${reservationData.date}.`;

        admins.forEach((admin) => {
          io.to(admin.user_id.toString()).emit("new_notification", {
            reservation_id: newId,
            user_id: admin.user_id,
            title: "New Reservation Booking",
            message: notifMessage,
            is_read: 0,
            created_at: new Date().toISOString()
          });
        });
      }
    } catch (socketError) {
      console.warn("Non-blocking Socket emission error:", socketError.message);
    }

    return res.status(201).json({ id: newId });
  } catch (error) {
    console.error("Create reservation error:", error);
    res.status(500).json({ error: error.message });
  }
},createReservation: async (req, res) => {
  try {
    const body = req.body;
    const userId = body.userId;

    if (userId && userId !== "null") {
      const noShowCount = await Reservation.countNoShows(userId);
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

    // Calculate duration in hours from start and end time
    const startDateTime = new Date(`${body.date} ${body.startTime}`);
    const endDateTime = new Date(`${body.date} ${body.endTime}`);
    const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);

    // Calculate total order amount from items
    let totalOrderAmount = 0;
    if (items.length > 0) {
      totalOrderAmount = items.reduce((sum, item) => {
        return sum + parseFloat(item.price) * (item.quantity || 1);
      }, 0);
    } else if (body.totalAmount) {
      totalOrderAmount = parseFloat(body.totalAmount);
    }

    // Calculate downpayment based on duration and order amount
    const calculatedDownpayment = calculateDownpayment(
      durationHours,
      totalOrderAmount,
    );

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
      durationHours: durationHours,
      totalAmount: totalOrderAmount,
      downpayment: calculatedDownpayment,
      packageName: finalPackageName,
      tableIds: tableIdsArray,
      selectedItems: items,
      receiptPath: req.file ? req.file.path : null,
    };

    console.log("Saving receipt URL to DB:", reservationData.receiptPath);

    // 1. Create the database records
    const newId = await Reservation.create(reservationData);

    // 2. Emit real-time updates to all administrators via socket.io
    try {
      const [admins] = await db.execute("SELECT user_id FROM users WHERE role = 'admin'");
      const io = req.app.get("socketio");

      if (io) {
        const numGuests = reservationData.pax || reservationData.guests || reservationData.num_guests || 1;
        const notifMessage = `New reservation created by ${reservationData.firstName} ${reservationData.lastName || ""} for ${numGuests} guests on ${reservationData.date}.`;

        admins.forEach((admin) => {
          io.to(admin.user_id.toString()).emit("new_notification", {
            reservation_id: newId,
            user_id: admin.user_id,
            title: "New Reservation Booking",
            message: notifMessage,
            is_read: 0,
            created_at: new Date().toISOString()
          });
        });
      }
    } catch (socketError) {
      console.warn("Non-blocking Socket emission error:", socketError.message);
    }

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
      const currentUser = req.user;

      const reservation = await Reservation.findById(id);
      if (!reservation) return res.status(404).json({ error: "Not found" });

      const isOwner = reservation.user_id === currentUser.userId;
      const isAdmin = currentUser.role === "admin";

      if (!isAdmin) {
        if (!isOwner) {
          return res
            .status(403)
            .json({ error: "You do not own this reservation." });
        }
        if (status.toLowerCase() !== "cancelled") {
          return res
            .status(403)
            .json({ error: "Customers can only cancel reservations." });
        }
      }

      if (status.toLowerCase() !== "cancelled") {
        const noShowCount = await Reservation.countNoShows(reservation.user_id);
        if (noShowCount >= 3) {
          return res
            .status(403)
            .json({ error: "Account restricted due to no-shows." });
        }
      }

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

      if (
        reservation.status === "Seated" ||
        reservation.status === "Completed"
      ) {
        return res.status(400).json({
          success: false,
          message: "This reservation is already active or completed.",
        });
      }

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

      const now = new Date();
      const scheduledTime = new Date(
        `${reservation.reservation_date} ${reservation.reservation_time}`,
      );
      const diffInMs = now - scheduledTime;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

      if (diffInMinutes < -30) {
        return res.status(400).json({
          success: false,
          message: `Too early! Check-in starts 30 mins before. Please wait until ${reservation.reservation_time}.`,
        });
      }

      if (diffInMinutes > 60) {
        await Reservation.updateStatus(reservation.reservation_id, "no-show");
        return res.status(400).json({
          success: false,
          message:
            "Reservation expired. You are more than 1 hour late and marked as a No-Show.",
        });
      }

      res.json({ success: true, reservation });
    } catch (error) {
      console.error("Check ID Error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== CALENDAR FUNCTIONS ====================
  getReservationsByDateRange: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "startDate and endDate are required" });
      }

      const sql = `
      SELECT 
        r.reservation_id,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d') as date,
        TIME_FORMAT(r.reservation_time, '%H:%i') as startTime,
        TIME_FORMAT(r.end_time, '%H:%i') as endTime,
        r.num_guests as guests,
        r.first_name,
        r.last_name,
        r.status,
        rt.table_id
      FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE r.reservation_date BETWEEN ? AND ?
        AND r.status IN ('Confirmed', 'Pending', 'Seated')
      ORDER BY r.reservation_date ASC, r.reservation_time ASC
    `;

      const [rows] = await db.execute(sql, [startDate, endDate]);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching reservations by date range:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getReservationsByDate: async (req, res) => {
    try {
      const { date } = req.params;

      if (!date) {
        return res.status(400).json({ error: "date is required" });
      }

      const sql = `
      SELECT 
        r.reservation_id,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d') as date,
        TIME_FORMAT(r.reservation_time, '%H:%i') as startTime,
        TIME_FORMAT(r.end_time, '%H:%i') as endTime,
        r.num_guests as guests,
        r.first_name,
        r.last_name,
        CONCAT(r.first_name, ' ', r.last_name) as customerName,
        r.status,
        rt.table_id
      FROM reservations r
      JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
      WHERE r.reservation_date = ?
        AND r.status IN ('Confirmed', 'Pending', 'Seated')
      ORDER BY r.reservation_time ASC
    `;

      const [rows] = await db.execute(sql, [date]);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching reservations by date:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = reservationController;

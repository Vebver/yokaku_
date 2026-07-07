const Reservation = require("../models/Reservation");
const User = require("../models/User");
const Notification = require("../models/Notification");
const db = require("../config/db");
const { logActivity } = require("../utils/logger");
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
  // Add this inside reservationController:
  getAllTables: async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM tables");
      res.json(rows);
    } catch (error) {
      console.error("Error in getAllTables:", error);
      res.status(500).json({ error: error.message });
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
      const info = await User.getCancellationInfo(userId);
      res.json(info);
    } catch (error) {
      console.error("Error fetching cancellation count:", error);
      res.status(500).json({ error: error.message });
    }
  },

  recordCancellation: async (req, res) => {
    try {
      const { userId } = req.body;
      await User.recordCancellation(userId);
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
      console.error("Error fetching reservation items:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // Add this inside reservationController:
  getReservationById: async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found." });
      }
      res.json({ success: true, reservation });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateKioskReservation: async (req, res) => {
    const { reservationId } = req.body;
    if (!reservationId) {
      return res.status(400).json({ error: "Reservation ID is required." });
    }
    try {
      const affectedRows = await Reservation.setKioskReservation(reservationId);
      if (affectedRows === 0) {
        return res.status(404).json({ error: "Reservation not found." });
      }
      res.json({
        message: `Kiosk updated successfully for Reservation ID ${reservationId}.`,
      });
    } catch (error) {
      console.error("Set kiosk reservation error:", error);
      res.status(500).json({
        error: error.message || "Failed to update kiosk reservation.",
      });
    }
  },

  getActiveKiosk: async (req, res) => {
    try {
      const { tableId } = req.query;
      const result = await Reservation.getActiveKioskReservation(tableId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Fetch active kiosk state error:", error);
      res.status(500).json({ error: "Failed to fetch active kiosk state." });
    }
  },

  // ==================== CREATE RESERVATION ====================
  createReservation: async (req, res) => {
    try {
      const body = req.body;

      // Ensure numeric fields are actually numbers
      body.downpayment = parseFloat(body.downpayment) || 0;
      body.totalAmount = parseFloat(body.totalAmount) || 0;
      body.amount = parseFloat(body.amount) || 0;
      body.durationHours = parseFloat(body.durationHours) || 1;

      // ===== FIX: Properly get guest count =====
      let guestCount =
        parseInt(body.guests) ||
        parseInt(body.pax) ||
        parseInt(body.num_guests) ||
        parseInt(body.guestCount) ||
        1;

      if (isNaN(guestCount) || guestCount < 1) {
        guestCount = 1;
      }

      body.guests = guestCount;
      body.num_guests = guestCount;

      console.log("📊 Guest count from request:", {
        guests: body.guests,
        pax: body.pax,
        num_guests: body.num_guests,
        guestCount: body.guestCount,
        finalGuestCount: guestCount,
      });

      // ===== FIX: Safely get reservation type =====
      let reservationType = "per_table";

      // Safely check both possible field names
      if (
        body.reservation_type !== undefined &&
        body.reservation_type !== null
      ) {
        // Convert to string and lowercase
        reservationType = String(body.reservation_type).toLowerCase();
      } else if (
        body.reservationType !== undefined &&
        body.reservationType !== null
      ) {
        // Convert to string and lowercase
        reservationType = String(body.reservationType).toLowerCase();
      }

      console.log("📊 Reservation type from request:", {
        bodyReservationType: body.reservationType,
        bodyReservation_type: body.reservation_type,
        finalType: reservationType,
        typeOfReservationType: typeof body.reservation_type,
        typeOfReservationTypeCamel: typeof body.reservationType,
      });

      // ===== FIX: Detect EVENT from package name if type is still per_table =====
      if (reservationType === "per_table" && body.packageName) {
        const packageName = String(body.packageName).toLowerCase();
        if (
          packageName.includes("standard") ||
          packageName.includes("premium") ||
          packageName.includes("event")
        ) {
          console.log("🔍 Detected EVENT from package name, overriding type");
          reservationType = "event";
        }
      }

      // Better tableIds parsing with error handling
      let tableIdsArray = [];

      // For EVENT reservations, we don't need table IDs (they book the whole venue)
      if (reservationType === "event" || reservationType === "takeout") {
        tableIdsArray = [];
        console.log("✅ EVENT reservation - no specific tables needed");
      } else {
        // PER TABLE: Parse table IDs from request
        if (body.tableIds) {
          try {
            if (typeof body.tableIds === "string") {
              const parsed = JSON.parse(body.tableIds);
              tableIdsArray = Array.isArray(parsed) ? parsed : [parsed];
            } else if (Array.isArray(body.tableIds)) {
              tableIdsArray = body.tableIds;
            } else {
              tableIdsArray = [body.tableIds];
            }
          } catch (e) {
            console.log(
              "Failed to parse tableIds, trying alternative:",
              body.tableIds,
            );
            if (
              typeof body.tableIds === "string" &&
              body.tableIds.includes(",")
            ) {
              tableIdsArray = body.tableIds
                .split(",")
                .map((id) => parseInt(id.trim()));
            } else if (typeof body.tableIds === "string") {
              tableIdsArray = [parseInt(body.tableIds)];
            }
          }
        }

        tableIdsArray = tableIdsArray
          .map((id) => parseInt(id))
          .filter((id) => !isNaN(id) && id > 0);

        console.log("✅ Parsed tableIds:", tableIdsArray);

        if (tableIdsArray.length === 0) {
          throw new Error(
            "No valid table IDs provided. Please select at least one table.",
          );
        }
      }

      // Safety check for dates and fallbacks for missing end times
      const startDateTime = new Date(`${body.date} ${body.startTime}`);
      const duration = parseFloat(
        body.durationHours || body.duration_hours || 1.0,
      );

      const endDateTime = body.endTime
        ? new Date(`${body.date} ${body.endTime}`)
        : new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);

      const dbStart = startDateTime.toTimeString().split(" ")[0];
      const dbEnd = endDateTime.toTimeString().split(" ")[0];

      // For PER TABLE, downpayment should be 0
      let downpayment = parseFloat(body.downpayment) || 0;
      if (reservationType === "per_table") {
        downpayment = 0;
      }

      // Check if the current user placing the order is staff (admin or cashier)
      const isStaff =
        req.user?.role === "admin" || req.user?.role === "cashier";

      // ===== FIX: Build reservationData with correct type =====
      const reservationData = {
        ...body,
        // ===== FIX: Explicitly set both field names as strings =====
        reservation_type: String(reservationType),
        reservationType: String(reservationType),

        // Only link user ID if the client is a real customer. Left as null for staff bookings.
        userId:
          body.userId && body.userId !== "null"
            ? body.userId
            : isStaff
              ? null
              : req.user?.userId,

        startTime: dbStart,
        endTime: dbEnd,
        receiptPath: req.file ? req.file.path : null,
        tableIds: tableIdsArray,
        downpayment: downpayment,
        totalAmount: parseFloat(body.totalAmount) || 0,
        amount: parseFloat(body.amount) || 0,
        durationHours: parseFloat(body.durationHours) || 1,
        guests: guestCount,
        num_guests: guestCount,
      };

      console.log("📊 Reservation data being saved:", {
        reservation_type: reservationData.reservation_type,
        reservationType: reservationData.reservationType,
        guests: reservationData.guests,
        num_guests: reservationData.num_guests,
        packageName: reservationData.packageName,
      });

      // 1. Create the database record for the reservation
      const newId = await Reservation.create(reservationData);

      // >>> ADD THIS AUDIT LOG BLOCK <<<
      await logActivity(
        req.user?.userId || null,
        "CREATE_RESERVATION",
        newId,
        {
          type: reservationType,
          date: body.date,
          startTime: dbStart,
          guests: guestCount,
        },
        req,
      );

      const fName = body.firstName || body.first_name || "Guest";
      const lName = body.lastName || body.last_name || "";
      const fullName = `${fName} ${lName}`.trim();

      const now = new Date();
      const isoDateTime = now.toISOString();

      let notificationId = null;

      try {
        notificationId = await Notification.create(db, {
          userId:
            body.userId && body.userId !== "null"
              ? parseInt(body.userId)
              : req.user?.userId || null,
          reservationId: null,
          title: "New Reservation",
          message: `New booking from ${fullName} (Reservation ID: ${newId})`,
          type: "reservation",
          isAdminAlert: true,
        });
      } catch (dbErr) {
        console.error("Notification DB Error:", dbErr.message);
      }

      const io = req.app.get("io");
      if (io) {
        io.emit("table_updated");
        // io.emit("new_notification", {
        //   id: notificationId,
        //   notification_id: notificationId,
        //   title: "New Reservation",
        //   message: `New booking from ${fullName} (Reservation ID: ${newId})`,
        //   type: "reservation",
        //   is_read: 0,
        //   created_at: isoDateTime,
        // });

        io.emit("new_reservation", {
          id: newId,
          date: body.date,
          time: body.startTime,
          guests: guestCount,
          packageName: body.packageName || "Table Reservation",
        });
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
      const { status, cancellation_reason } = req.body;
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

      // if (status.toLowerCase() !== "cancelled") {
      //   const noShowCount = await Reservation.countNoShows(reservation.user_id);
      //   if (noShowCount >= 3) {
      //     return res
      //       .status(403)
      //       .json({ error: "Account restricted due to no-shows." });
      //   }
      // }

      // Pass the cancellation parameters down to the database model
      await Reservation.updateStatus(id, status, cancellation_reason);

      // >>> ADD THIS AUDIT LOG BLOCK <<<
      await logActivity(
        currentUser?.userId || null,
        "UPDATE_RESERVATION_STATUS",
        id,
        { status, reason: cancellation_reason || null },
        req,
      );
      res.json({ success: true, message: "Status updated." });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteReservation: async (req, res) => {
    try {
      const { id } = req.params;

      // >>> ADD THIS AUDIT LOG BLOCK <<<
      await logActivity(
        req.user?.userId || null,
        "DELETE_RESERVATION",
        id,
        { message: "Reservation record deleted permanently" },
        req,
      );
      // >>> END AUDIT LOG BLOCK <<<

      await Reservation.delete(id);
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

      if (reservation.status === "Completed") {
        return res.status(400).json({
          success: false,
          message: "This reservation is already completed.",
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

      // Skip the "too early" / "no-show" checks for direct Walk-ins
      const isWalkin = (reservation.reservation_id || "")
        .toString()
        .toUpperCase()
        .includes("WALK");

      if (!isWalkin) {
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
      }

      // Auto-seat the reservation if it is still marked as 'Confirmed'
      if (reservation.status !== "Seated") {
        await Reservation.updateStatus(reservation.reservation_id, "Seated");
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

      // Use model layer
      const rows = await Reservation.getByDateRange(startDate, endDate);
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

      // Use model layer
      const rows = await Reservation.getByDate(date);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching reservations by date:", error);
      res.status(500).json({ error: error.message });
    }
  },

// ==================== REFUND FUNCTIONS ====================
    processRefund: async (req, res) => {
    const { id } = req.params; // Reservation ID
    const { refundAmount } = req.body; // Amount from req.body

    if (refundAmount === undefined || isNaN(refundAmount) || refundAmount < 0) {
      return res.status(400).json({ error: "Please provide a valid refund amount." });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Fetch the reservation to verify it exists and get the customer's user_id
      const [rows] = await connection.execute(
        "SELECT user_id, first_name, last_name FROM reservations WHERE reservation_id = ?",
        [id]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Reservation not found." });
      }

      const reservation = rows[0];
      const targetUserId = reservation.user_id;

      // 2. Update the reservation table with the refund amount
      // (Ensure your database reservations table has a refund_amount column)
      await connection.execute(
        "UPDATE refund_requests SET refund_amount = ? WHERE reservation_id = ?",
        [refundAmount, id]
      );

      // 3. Send notification to the customer
      if (targetUserId) {
        await Notification.create(connection, {
          userId: targetUserId,
          reservationId: id,
          title: "Refund Processed",
          message: `A refund of ₱${Number(refundAmount).toFixed(2)} has been processed for your reservation (${id}).`,
          type: "reservation", 
          isAdminAlert: false
        });
      }

      await connection.commit();
      res.json({ message: "Refund updated and customer notified successfully." });
    } catch (error) {
      await connection.rollback();
      console.error("Error processing refund:", error);
      res.status(500).json({ error: "Failed to process refund. " + error.message });
    } finally {
      connection.release();
    }
  }
};

module.exports = reservationController;

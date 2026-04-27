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

const reservationController = {
  // --- PAYMONGO GCASH SESSION CREATION ---
  createPaymentSession: async (req, res) => {
    try {
      const { amount, tableLabel } = req.body;

      // Log arriving data for debugging
      console.log("Payment Request Received:", { amount, tableLabel });

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: "Invalid amount provided" });
      }

      // PayMongo requires amount in centavos (integer)
      const amountInCentavos = Math.round(parseFloat(amount) * 100);

      const options = {
        method: "POST",
        url: "https://api.paymongo.com/v1/checkout_sessions",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
        },
        data: {
          data: {
            attributes: {
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              payment_method_types: ["gcash"],
              line_items: [
                {
                  currency: "PHP",
                  amount: amountInCentavos,
                  description: `Downpayment for Table ${tableLabel || "Reservation"}`,
                  name: "Table Reservation Downpayment",
                  quantity: 1,
                },
              ],
              success_url: `${process.env.CLIENT_URL}/payment-success`,
              cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
              description: "Reservation Security Deposit",
            },
          },
        },
      };

      const response = await axios.request(options);
      res.json({ checkoutUrl: response.data.data.attributes.checkout_url });
    } catch (error) {
      // Detailed error logging to identify why the 500 error is occurring
      console.error("--- PAYMONGO INTEGRATION ERROR ---");
      console.error("Status:", error.response?.status);
      console.error("Data:", JSON.stringify(error.response?.data, null, 2));
      console.error("Message:", error.message);

      res.status(500).json({
        error: "Failed to initiate GCash payment",
        details: error.response?.data?.errors?.[0]?.detail || error.message,
      });
    }
  },

  // --- EXISTING LOGIC (UNTOUCHED) ---

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
      res.json(rows);
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
          SELECT DISTINCT rt.table_id, 'Pending' as status 
          FROM reservations r 
          JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id 
          WHERE r.reservation_date = ? 
          AND r.status IN ('Pending', 'Confirmed', 'Seated')`;
        const [result] = await db.execute(sql, [date]);
        rows = result;
      }

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
};

module.exports = reservationController;

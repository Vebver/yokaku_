const Reservation = require("../models/Reservation");
const db = require("../config/db");

const reservationController = {
  // 1. GET ALL RESERVATIONS
  // The Model.getAll() now handles the complex JOINs for Address and Tables
  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();
      res.json(data);
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 2. CREATE NEW RESERVATION
  // Expects req.body to include: brgyCode, tableIds (array), etc.
  createReservation: async (req, res) => {
    try {
      // 1. Add status manually
      const reservationData = { ...req.body, status: "Confirmed" };

      // 2. Save to DB (This includes the Transaction for tables)
      const newRes = await Reservation.create(reservationData);
      const newId = newRes.id;

      // 3. Fetch details AFTER the tables are linked in the DB
      const resDetails = await Reservation.findById(newId);

      if (resDetails && resDetails.user_id) {
        const formattedDate = new Date(resDetails.reservation_date).toLocaleDateString();
        
        // Ensure tableInfo logic is inside the 'if'
        const tableInfo = resDetails.assigned_tables 
          ? `at Table ${resDetails.assigned_tables}` 
          : "";

        const title = "Reservation Confirmed! ✅";
        const message = `Your reservation for ${formattedDate} ${tableInfo} has been approved.`;
        const type = "success";

        // CRITICAL FIX: Column order (user_id, title, message, type, is_read)
        // Ensure the values array matches this order exactly!
        await db.execute(
          "INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)",
          [resDetails.user_id, title, message, type, 0]
        );

        console.log(`✅ Notification sent for Auto-Accepted Reservation #${newId}`);
      }

      res.status(201).json(newRes);
    } catch (error) {
      console.error("Auto-Accept Create Error:", error.message);
      res.status(500).json({ error: error.message });
    }
},

  // 3. UPDATE STATUS & NOTIFICATIONS
 updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // 1. Perform the update
      await Reservation.updateStatus(id, status);

      // 2. Fetch details for the notification
      const resDetails = await Reservation.findById(id);

      if (resDetails && resDetails.user_id) {
        let title = "";
        let message = "";
        let type = "info";
        const formattedDate = new Date(resDetails.reservation_date).toLocaleDateString();

        // 3. Removed "Confirmed" block (Handled in createReservation)
        if (status === "Seated") {
          title = "Table Ready! 🍽️";
          message = `Welcome! Please proceed to Table ${resDetails.assigned_tables || 'assigned'}. Enjoy your meal!`;
          type = "info";
        } else if (status === "Cancelled") {
          title = "Reservation Cancelled ❌";
          message = `Your reservation for ${formattedDate} has been cancelled.`;
          type = "error";
        }

        // 4. Send Notification if a message was set
        if (title !== "") {
          await db.execute(
            "INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)",
            [resDetails.user_id, title, message, type, 0]
          );
        }
      }

      res.json({ message: `Status updated to ${status} and notification sent.` });
    } catch (error) {
      console.error("Update Status Error:", error);
      res.status(500).json({ error: error.message });
    }
},

  // 4. DELETE RESERVATION
  deleteReservation: async (req, res) => {
    try {
      const { id } = req.params;
      await Reservation.delete(id);
      res.json({ message: "Reservation deleted" });
    } catch (error) {
      console.error("Delete Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 5. KIOSK SCANNER (Modified for Composite Data)
  checkReservationId: async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Checking Reservation ID:", id);
      // We use findById from the Model because it includes the JOINs
      // for the Barangay name and the Table numbers.
      const reservation = await Reservation.findById(id);

      if (reservation) {
        res.json({
          success: true,
          message: "Reservation found",
          reservation: reservation,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Invalid Reservation ID. Not found in our records.",
        });
      }
    } catch (error) {
      console.error("Check ID Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

module.exports = reservationController;

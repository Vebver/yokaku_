const Reservation = require('../models/Reservation');
const db = require('../config/db');

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
      const newReservation = await Reservation.create(req.body);
      res.status(201).json(newReservation);
    } catch (error) {
      console.error("Create Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 3. UPDATE STATUS & NOTIFICATIONS
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await Reservation.updateStatus(id, status);

      // Fetch composite details (this now includes assigned_tables and full_address)
      const resDetails = await Reservation.findById(id);

      if (resDetails && resDetails.user_id) {
          let title = "";
          let message = "";
          let type = "info";

          const formattedDate = new Date(resDetails.reservation_date).toLocaleDateString();

          if (status === "Confirmed") {
              title = "Reservation Confirmed! ✅";
              // We can now include the specific tables in the notification message
              message = `Your reservation for ${formattedDate} at Table ${resDetails.assigned_tables} has been approved.`;
              type = "success";
          } else if (status === "Seated") {
              title = "Table Ready! 🍽️";
              message = `Welcome! Please proceed to Table ${resDetails.assigned_tables}. Enjoy your meal!`;
              type = "info";
          } else if (status === "Cancelled") {
              title = "Reservation Cancelled ❌";
              message = `Your reservation for ${formattedDate} has been cancelled.`;
              type = "error";
          }

          if (title !== "") {
              await db.execute(
                  'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
                  [resDetails.user_id, title, message, type, 0]
              );
          }
      }

      res.json({ message: "Status updated and notification sent." });
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
          reservation: reservation 
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: "Invalid Reservation ID. Not found in our records." 
        });
      }
    } catch (error) {
      console.error("Check ID Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = reservationController;
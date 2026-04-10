const Reservation = require('../models/Reservation');
const db = require('../config/db');

const reservationController = {
  // 1. GET ALL RESERVATIONS (For the Admin Table)
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
  createReservation: async (req, res) => {
    try {
      const newReservation = await Reservation.create(req.body);
      res.status(201).json(newReservation);
    } catch (error) {
      console.error("Create Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 3. UPDATE STATUS & SEND NOTIFICATION (This is the important one)
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // A. Update the status in the reservations table
      await Reservation.updateStatus(id, status);

      // B. Fetch reservation details to get the user_id for the notification
      const resDetails = await Reservation.findById(id);

      if (resDetails && resDetails.user_id) {
          let title = "";
          let message = "";
          let type = "info";

          const formattedDate = new Date(resDetails.reservation_date).toLocaleDateString();

          // C. Define the notification message based on the status sent from React
          if (status === "Confirmed") {
              title = "Reservation Confirmed! ✅";
              message = `Your reservation for ${formattedDate} has been approved. See you at Hangout Resto Bar!`;
              type = "success";
          } else if (status === "Seated") {
              title = "Table Ready! 🍽️";
              message = "Welcome! You have been seated. Enjoy your meal!";
              type = "info";
          }

          // D. Insert the notification into the database
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

  // --- NEW: CHECK IF RESERVATION ID EXISTS (For Kiosk Scanner) ---
  checkReservationId: async (req, res) => {
    try {
      const { id } = req.params; // This is the reservation_id from the scanner/input
      
      const [rows] = await db.execute(
        'SELECT * FROM reservations WHERE reservation_id = ?',
        [id]
      );

      if (rows.length > 0) {
        // ID Found
        res.json({ 
          success: true, 
          message: "Reservation found", 
          reservation: rows[0] 
        });
      } else {
        // ID Not Found
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
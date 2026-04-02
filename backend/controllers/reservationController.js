const Reservation = require('../models/Reservation');

const reservationController = {
  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = reservationController;
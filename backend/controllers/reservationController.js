const Reservation = require('../models/Reservation');

const reservationController = {
  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  createReservation: async (req, res) => {
    try {
      const newReservation = await Reservation.create(req.body);
      res.status(201).json(newReservation);
    } catch (error) {
      console.error("Controller Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = reservationController;
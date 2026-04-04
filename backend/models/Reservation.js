const db = require('../config/db');

const Reservation = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM reservations ORDER BY created_at DESC');
    return rows;
  },
  // Add delete/update methods here later
};

module.exports = Reservation;
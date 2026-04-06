const db = require('../config/db');

const Reservation = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM reservations ORDER BY created_at DESC');
    return rows;
  },
  
  // ADD THIS METHOD:
  create: async (reservationData) => {
    const { userId, firstName, lastName, email, phone, date, time, guests, packageName } = reservationData;
    const query = `
      INSERT INTO reservations 
      (user_id, first_name, last_name, email, phone, reservation_date, reservation_time, num_guests, package_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [userId, firstName, lastName, email, phone, date, time, guests, packageName]);
    return { id: result.insertId, ...reservationData };
  }
};

module.exports = Reservation;
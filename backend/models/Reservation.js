const db = require('../config/db');
const { update } = require('./User');

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
    const [result] = await db.execute(query, [userId, firstName, lastName, email, phone, date, time, guests, packageName]);
    return { id: result.insertId, ...reservationData };
  },
  updateStatus: async (id, status) => {
    const query = 'UPDATE reservations SET status = ? WHERE reservation_id = ?';
    await db.execute(query, [status, id]);
  },
  delete: async (id) => {
    const query = 'DELETE FROM reservations WHERE reservation_id = ?';
    await db.execute(query, [id]);
  }
};

module.exports = Reservation;
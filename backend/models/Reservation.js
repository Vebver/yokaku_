const db = require('../config/db');

const Reservation = {
  getAll: async () => {
    const sql = `
      SELECT 
        r.*, 
        p.payment_status 
      FROM reservations r
      LEFT JOIN payments p ON r.reservation_id = p.reservation_id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // THIS IS THE FIX: findById must be a separate property
  findById: async (id) => {
    const [rows] = await db.execute('SELECT user_id, reservation_date FROM reservations WHERE reservation_id = ?', [id]);
    return rows[0];
  },
  
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
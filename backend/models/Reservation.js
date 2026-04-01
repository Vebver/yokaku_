const pool = require('../config/db'); // Your MySQL pool

const Reservation = {
  create: async (data) => {
    const { 
      userId, firstName, lastName, email, phone, 
      date, time, guests, packageName 
    } = data;

    const sql = `
      INSERT INTO reservations 
      (user_id, first_name, last_name, email, phone, reservation_date, reservation_time, num_guests, package_name, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    // Note: If your DB column is a TIME type, ensure 'time' is in HH:MM:SS format
    return pool.query(sql, [
      userId || null,
      firstName,
      lastName,
      email,
      phone,
      date,
      time || "12:00:00", 
      guests,
      packageName
    ]);
  }
};

module.exports = Reservation;
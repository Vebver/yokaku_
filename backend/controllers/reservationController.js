// controllers/reservationController.js
const User = require('../models/User'); 

const getAllReservations = async (req, res) => {
  try {
    console.log("Fetching reservations for user:", req.user.userId);

    const sql = `SELECT * FROM reservations ORDER BY created_at DESC`;
    
    // In promise clients, we use await and destructure the [rows]
    const [rows] = await User.pool.query(sql);
    
    console.log(`Found ${rows.length} reservations.`);
    
    // Send the rows back to React
    res.json(rows);

  } catch (error) {
    // This will now catch SQL errors properly
    console.error("SQL or Controller Error:", error.message);
    res.status(500).json({ error: "Database query failed: " + error.message });
  }
};

module.exports = { getAllReservations };
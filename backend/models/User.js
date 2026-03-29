const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "yoyaku_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

class User {
  static async findByEmail(email) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE user_id = ?", [
      id,
    ]);
    return rows[0];
  }
// models/User.js
static async update(id, data) {
  try {
    const values = [
      data.firstName || '',
      data.lastName || '',
      data.email || '',
      data.phone || null,
      data.profileImage || null,
      id
    ];

    const query = `
      UPDATE users 
      SET first_name = ?, 
          last_name = ?, 
          email = ?, 
          phone = ?, 
          profile_image = ? 
      WHERE user_id = ?`;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  } catch (sqlError) {
    // THIS WILL TELL YOU THE EXACT COLUMN NAME ERROR IN THE TERMINAL
    console.error("MYSQL ERROR:", sqlError.message); 
    throw sqlError;
  }
}

  static async create(email, password, firstName, lastName) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, "customer")',
      [firstName, lastName, email, hashedPassword],
    );
    return result.insertId;
  }

  static get pool() {
    return pool;
  }
}

module.exports = User;

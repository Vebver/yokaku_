const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'yoyaku_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

class User {
static async findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [id]);
    return rows[0];
  }

static async create(email, password, firstName, lastName) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, "customer")',
      [firstName, lastName, email, hashedPassword]
    );
    return result.insertId;
  }

  static get pool() {
    return pool;
  }
}

module.exports = User;


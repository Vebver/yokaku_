const pool = require("../config/db"); // Your MySQL pool
const bcrypt = require("bcryptjs");

class User {
  // 1. Find by Email (Secure selection - includes password_hash for authentication)
  static async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT user_id, first_name, last_name, email, password_hash, role FROM users WHERE email = ?", 
      [email]
    );
    return rows[0];
  }

  // 2. Find by ID (Secure selection - excludes password_hash)
  static async findById(id) {
    const [rows] = await pool.query(
      "SELECT user_id, first_name, last_name, email, role, cancellation_count, last_cancellation_time FROM users WHERE user_id = ?", 
      [id]
    );
    return rows[0];
  }

  // 3. Get Cancellation Info (For reservationController.js)
  static async getCancellationInfo(userId) {
    const [rows] = await pool.execute(
      "SELECT cancellation_count, last_cancellation_time FROM users WHERE user_id = ?",
      [userId]
    );
    return rows[0] || { cancellation_count: 0, last_cancellation_time: null };
  }

  // 4. Record Cancellation (For reservationController.js)
  static async recordCancellation(userId) {
    await this.incrementCancellationCount(userId);
    return await pool.execute(
      "UPDATE users SET last_cancellation_time = NOW() WHERE user_id = ?",
      [userId]
    );
  }

  // 5. Update user profile details
  static async update(id, data) {
    try {
      // Fetch current user data first to avoid overwriting with NULLs
      const currentUser = await this.findById(id);
      if (!currentUser) return false;

      // Use provided data OR keep existing database values
      const values = [
        data.firstName !== undefined ? data.firstName : currentUser.first_name,
        data.lastName !== undefined ? data.lastName : currentUser.last_name,
        data.email !== undefined ? data.email : currentUser.email,
        data.password_hash !== undefined
          ? data.password_hash
          : currentUser.password_hash,
        data.reset_password_token !== undefined
          ? data.reset_password_token
          : currentUser.reset_password_token,
        data.reset_password_expires !== undefined
          ? data.reset_password_expires
          : currentUser.reset_password_expires,
        id,
      ];

      const query = `
      UPDATE users 
      SET first_name = ?, 
          last_name = ?, 
          email = ?,
          password_hash = ?,
          reset_password_token = ?,
          reset_password_expires = ?
      WHERE user_id = ?`;

      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (sqlError) {
      console.error("MYSQL ERROR:", sqlError.message);
      throw sqlError;
    }
  }

  // 6. Create user (Register)
  static async create(email, password, firstName, lastName) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (first_name, last_name, email, password_hash, role, cancellation_count) VALUES (?, ?, ?, ?, "customer", 0)',
      [firstName, lastName, email, hashedPassword],
    );
    return result.insertId;
  }

  // 7. Get user's cancellation count
  static async getCancellationCount(userId) {
    const [rows] = await pool.query(
      "SELECT cancellation_count FROM users WHERE user_id = ?",
      [userId],
    );
    return rows[0]?.cancellation_count || 0;
  }

  // 8. Increment user's cancellation count
  static async incrementCancellationCount(userId) {
    const [result] = await pool.execute(
      "UPDATE users SET cancellation_count = cancellation_count + 1 WHERE user_id = ?",
      [userId],
    );
    return result.affectedRows > 0;
  }

  // 9. Find by Reset Token (Secure selection)
  static async findByResetToken(token) {
    const [rows] = await pool.query(
      "SELECT user_id, email, reset_password_expires FROM users WHERE reset_password_token = ?",
      [token],
    );
    return rows[0];
  }

  // Static pool getter used by index.js shutdown hook
  static get pool() {
    return pool;
  }
}

module.exports = User;
const pool = require("../config/db"); // Your MySQL pool
const bcrypt = require("bcryptjs");

class User {
  // 1. Find by Email
  static async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT user_id, first_name, last_name, email, password_hash, role, reset_password_token, reset_password_expires FROM users WHERE email = ?",
      [email],
    );
    return rows[0];
  }

  // 2. Find by ID
  static async findById(id) {
    const [rows] = await pool.query(
      "SELECT user_id, first_name, last_name, email, role, cancellation_count, last_cancellation_time, reset_password_token, reset_password_expires FROM users WHERE user_id = ?",
      [id],
    );
    return rows[0];
  }

  // 3. Get Cancellation Info
  static async getCancellationInfo(userId) {
    const [rows] = await pool.execute(
      "SELECT cancellation_count, last_cancellation_time FROM users WHERE user_id = ?",
      [userId],
    );
    return rows[0] || { cancellation_count: 0, last_cancellation_time: null };
  }

  // 4. Record Cancellation
  static async recordCancellation(userId) {
    await this.incrementCancellationCount(userId);
    return await pool.execute(
      "UPDATE users SET last_cancellation_time = NOW() WHERE user_id = ?",
      [userId],
    );
  }

  // 5. Update user profile details - FIXED with dynamic fields
  static async update(id, data) {
    try {
      // Build dynamic update query
      const fields = [];
      const values = [];

      // Only include fields that are provided and not undefined
      if (data.firstName !== undefined && data.firstName !== null) {
        fields.push("first_name = ?");
        values.push(data.firstName);
      }
      if (data.lastName !== undefined && data.lastName !== null) {
        fields.push("last_name = ?");
        values.push(data.lastName);
      }
      if (data.email !== undefined && data.email !== null) {
        fields.push("email = ?");
        values.push(data.email);
      }
      if (data.password_hash !== undefined) {
        fields.push("password_hash = ?");
        values.push(data.password_hash);
      }
      if (data.reset_password_token !== undefined) {
        fields.push("reset_password_token = ?");
        values.push(data.reset_password_token);
      }
      if (data.reset_password_expires !== undefined) {
        fields.push("reset_password_expires = ?");
        values.push(data.reset_password_expires);
      }

      // If no fields to update, return false
      if (fields.length === 0) {
        console.log("No fields to update for user:", id);
        return false;
      }

      values.push(id);
      const query = `UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`;

      console.log("Update Query:", query);
      console.log("Update Values:", values);

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

  // 9. Find by Reset Token - FIXED
  static async findByResetToken(token) {
    const [rows] = await pool.query(
      "SELECT user_id, email, reset_password_token, reset_password_expires FROM users WHERE reset_password_token = ?",
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

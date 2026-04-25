const pool = require("../config/db"); // Your MySQL pool
const bcrypt = require("bcryptjs");

class User {
  static async findByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM users WHERE user_id = ?", [
      id,
    ]);
    return rows[0];
  }

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
        data.phone !== undefined ? data.phone : currentUser.phone,
        data.profileImage !== undefined
          ? data.profileImage
          : currentUser.profile_image,
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
          phone = ?, 
          profile_image = ?,
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

  static async findByResetToken(token) {
    // Corrected 'db' to 'pool' to match your connection
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE reset_password_token = ?",
      [token],
    );
    return rows[0];
  }
}

module.exports = User;

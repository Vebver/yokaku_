const db = require('../config/db');

const Setting = {
  // Get all rows
  getAll: async () => {
    const [rows] = await db.execute("SELECT * FROM system_settings");
    return rows;
  },

  // Update one row by key
  update: async (key, value) => {
    const sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?";
    const [result] = await db.execute(sql, [value, key]);
    return result;
  }
};

module.exports = Setting;
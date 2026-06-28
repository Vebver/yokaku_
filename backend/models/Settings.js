const db = require("../config/db");

const Setting = {
  // Get all rows with fallback
  getAll: async () => {
    try {
      const [rows] = await db.execute(
        "SELECT id,setting_key, setting_value FROM system_settings",
      );
      return rows;
    } catch (error) {
      console.error("Error fetching settings:", error);
      // Return default settings if table doesn't exist
      return [
        { setting_key: "gcash_number", setting_value: "09123456789" },
        { setting_key: "gcash_name", setting_value: "Hangout Resto Bar" },
      ];
    }
  },

  // Update one row by key
  update: async (key, value) => {
    try {
      // Check if key exists first
      const [existing] = await db.execute(
        "SELECT setting_key FROM system_settings WHERE setting_key = ?",
        [key],
      );

      if (existing.length === 0) {
        // Insert if not exists
        await db.execute(
          "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)",
          [key, value],
        );
        return { insertId: 1 };
      } else {
        // Update if exists
        const [result] = await db.execute(
          "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?",
          [value, key],
        );
        return result;
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      throw error;
    }
  },
};

module.exports = Setting;

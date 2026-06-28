const Setting = require("../models/Settings");

const settingController = {
  getSettings: async (req, res) => {
    try {
      const rows = await Setting.getAll();

      // Convert key-value pairs to object
      const settingsMap = {};
      rows.forEach((row) => {
        settingsMap[row.setting_key] = row.setting_value;
      });

      // Return with default values if missing
      res.json({
        gcash_number: settingsMap.gcash_number || "09123456789",
        gcash_name: settingsMap.gcash_name || "Hangout Resto Bar",
        ...settingsMap,
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      // Return default values on error
      res.json({
        gcash_number: "09123456789",
        gcash_name: "Hangout Resto Bar",
      });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings) return res.status(400).json({ error: "No settings" });

      const updatePromises = Object.entries(settings).map(([key, value]) => {
        return Setting.update(key, value.toString());
      });

      await Promise.all(updatePromises);
      res.json({ message: "Updated successfully" });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = settingController;

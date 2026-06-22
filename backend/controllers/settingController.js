const Setting = require('../models/Settings');

const settingController = {
  getSettings: async (req, res) => {
    try {
      const rows = await Setting.getAll();
      const settingsMap = {};
      rows.forEach(row => {
        settingsMap[row.setting_key] = row.setting_value;
      });
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const { settings } = req.body; 
      if (!settings) return res.status(400).json({ error: "No settings" });

      const updatePromises = Object.entries(settings).map(([key, value]) => {
        return Setting.update(key, value.toString()); // Force value to string for DB
      });

      await Promise.all(updatePromises);
      res.json({ message: "Updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = settingController;
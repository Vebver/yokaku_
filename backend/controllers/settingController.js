const Setting = require('../models/Settings');

const settingController = {
  // GET: Fetch all settings and turn them into a single object
  getSettings: async (req, res) => {
    try {
      const rows = await Setting.getAll();
      const settingsMap = {};
      
      // Convert Array [{key: 'a', value: '1'}] to Object {a: '1'}
      rows.forEach(row => {
        settingsMap[row.setting_key] = row.setting_value;
      });
      
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // PUT: Update multiple settings at once
  updateSettings: async (req, res) => {
    try {
      const { settings } = req.body; // Expects { settings: { gcash_number: '...', ... } }
      
      if (!settings) return res.status(400).json({ error: "No settings provided" });

      // Loop through the object and update each one in the DB
      const updatePromises = Object.entries(settings).map(([key, value]) => {
        return Setting.update(key, value);
      });

      await Promise.all(updatePromises);
      
      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = settingController;
const PriceMaintenance = require('../models/PriceMaintenance');

const priceController = {
  getSettings: async (req, res) => {
    try {
      const settings = await PriceMaintenance.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      await PriceMaintenance.updateSettings(req.body);
      res.json({ message: "Pricing updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = priceController;
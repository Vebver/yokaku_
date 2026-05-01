const BlockedDate = require('../models/BlockedDate');

const blockedDateController = {
  add: async (req, res) => {
    try {
      await BlockedDate.add(req.body.date, req.body.reason);
      res.json({ message: "Date blocked successfully!" });
    } catch (err) {
      res.status(400).json({ error: "Date already blocked or invalid." });
    }
  },
  list: async (req, res) => {
    try {
      const data = await BlockedDate.getAll();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  remove: async (req, res) => {
    try {
      await BlockedDate.delete(req.params.id);
      res.json({ message: "Date unblocked!" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = blockedDateController;
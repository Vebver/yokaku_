const Inventory = require('../models/Inventory');

const inventoryController = {
  // 1. Get all inventory items
  getInventory: async (req, res) => {
    try {
      const items = await Inventory.getAll();
      res.json(items);
    } catch (error) {
      console.error("Error in getInventory:", error.message);
      res.status(500).json({ error: "Failed to fetch inventory." });
    }
  },

  // 2. Create a new inventory item
  createInventoryItem: async (req, res) => {
    try {
      // The req.body will contain: item_name, category, quantity, unit, 
      // unit_price, expiry_date, supplier, storage_location, reorder_level
      const newItem = await Inventory.create(req.body);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error in createInventoryItem:", error.message);
      res.status(400).json({ error: "Failed to add item to inventory." });
    }
  },

  // 3. Delete an item from inventory
  deleteInventoryItem: async (req, res) => {
    try {
      const { id } = req.params;
      await Inventory.delete(id);
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error in deleteInventoryItem:", error.message);
      res.status(500).json({ error: "Failed to delete item." });
    }
  }
};

module.exports = inventoryController;
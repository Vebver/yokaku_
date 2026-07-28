const Inventory = require("../models/Inventory");
const { logActivity } = require("../utils/logger");

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
      // unit_price, expiry_date, storage_location, reorder_level
      const newItem = await Inventory.create(req.body);
      await logActivity(
        req.user?.userId || null,
        "CREATE_INVENTORY_ITEM",
        newItem?.inventory_id || null,
        { item_name: req.body.item_name, quantity: req.body.quantity },
        req,
      );
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
      await logActivity(
        req.user?.userId || null,
        "DELETE_INVENTORY_ITEM",
        id,
        { inventory_id: id },
        req,
      );
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error in deleteInventoryItem:", error.message);
      res.status(500).json({ error: "Failed to delete item." });
    }
  },
  updateInventoryItem: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        item_name,
        category,
        quantity,
        unit,
        unit_price,
        expiry_date,
        storage_location,
        reorder_level,
      } = req.body;

      // Call model update
      const updatedData = await Inventory.update(id, {
        item_name,
        category,
        quantity,
        unit,
        unit_price,
        expiry_date,
        storage_location,
        reorder_level,
      });
      await logActivity(
        req.user?.userId || null,
        "UPDATE_INVENTORY_ITEM",
        id,
        { item_name, quantity },
        req,
      );
      return res.status(200).json({
        success: true,
        message: "Inventory item updated successfully",
        data: updatedData,
      });
    } catch (error) {
      console.error("Error updating inventory:", error);
      return res.status(500).json({
        success: false,
        message: "Server error occurred while updating inventory item",
        error: error.message,
      });
    }
  },
  updateRecipeIngredient: async (req, res) => {
    try {
      const { recipeId } = req.params;
      const { quantity_required } = req.body;

      if (!quantity_required || Number(quantity_required) <= 0) {
        return res.status(400).json({
          success: false,
          message: "A valid required quantity is required.",
        });
      }

      const success = await Inventory.updateRecipeIngredientQuantity(
        recipeId,
        quantity_required,
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Recipe ingredient link not found.",
        });
      }

      // >>> ADD THIS AUDIT LOG BLOCK <<<
      await logActivity(
        req.user?.userId || null,
        "UPDATE_RECIPE_INGREDIENT",
        recipeId,
        { quantity_required },
        req,
      );

      return res
        .status(200)
        .json({ success: true, message: "Recipe item updated successfully" });
    } catch (error) {
      console.error("Error updating recipe:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = inventoryController;

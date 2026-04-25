// backend/models/Order.js
const db = require('../config/db');

const Order = {
  // Get the recipe for a specific menu item
  getIngredients: async (conn, itemId) => {
    const [rows] = await conn.execute(
      `SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE item_id = ?`,
      [itemId]
    );
    return rows;
  },

  // Check current stock levels
  checkStock: async (conn, inventoryId) => {
    const [rows] = await conn.execute(
      `SELECT quantity, item_name, reorder_level FROM inventory WHERE inventory_id = ?`,
      [inventoryId]
    );
    return rows[0];
  },

  // Update inventory quantities and status
  updateInventory: async (conn, inventoryId, amountUsed) => {
    const query = `
      UPDATE inventory 
      SET quantity = quantity - ?, 
          last_updated = NOW(),
          status = CASE 
            WHEN (quantity - ?) <= reorder_level AND (quantity - ?) > 0 THEN 'Low Stock' 
            WHEN (quantity - ?) <= 0 THEN 'Out of Stock' 
            ELSE 'Available' 
          END
      WHERE inventory_id = ?`;
    
    return await conn.execute(query, [amountUsed, amountUsed, amountUsed, amountUsed, inventoryId]);
  },

  // Record the actual order
  createOrderEntry: async (conn, reservationId, itemId, quantity) => {
    const query = `INSERT INTO kiosk_orders (reservation_id, item_id, quantity, kitchen_status) VALUES (?, ?, ?, 'Pending')`;
    return await conn.execute(query, [reservationId, itemId, quantity]);
  }
};

module.exports = Order;
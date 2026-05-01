// backend/models/Order.js
const db = require("../config/db");

const Order = {
  // Get the recipe for a specific menu item
  getIngredients: async (conn, itemId) => {
    const [rows] = await conn.execute(
      `SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE item_id = ?`,
      [itemId],
    );
    return rows;
  },

  // Check current stock levels
  checkStock: async (conn, inventoryId) => {
    const [rows] = await conn.execute(
      `SELECT quantity, item_name, reorder_level FROM inventory WHERE inventory_id = ?`,
      [inventoryId],
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

    return await conn.execute(query, [
      amountUsed,
      amountUsed,
      amountUsed,
      amountUsed,
      inventoryId,
    ]);
  },

  // Record the actual order
   createOrderEntry: async (conn, reservationId, itemId, quantity, customizations) => {
    const query = `
      INSERT INTO kiosk_orders 
      (reservation_id, item_id, quantity, kitchen_status, customizations) 
      VALUES (?, ?, ?, 'Pending', ?)`;
    
    const customData = customizations ? JSON.stringify(customizations) : null;
    return await conn.execute(query, [reservationId, itemId, quantity, customData]);
  },

  // Get all orders for a reservation (Kitchen display)
 getOrdersByReservation: async (reservationId) => {
    const [rows] = await db.execute(
      `SELECT 
          o.order_id, 
          o.item_id, 
          o.quantity, 
          o.kitchen_status, 
          o.customizations, 
          m.name AS item_name 
       FROM kiosk_orders o 
       JOIN menu_items m ON o.item_id = m.item_id 
       WHERE o.reservation_id = ?`,
      [reservationId],
    );
    return rows;
  },
  // Get pre-reserved items for a reservation (before they are placed as orders)
  getPreReservedItems: async (reservationId) => {
    const [rows] = await db.execute(
      `SELECT 
          m.*, 
          ri.customizations 
       FROM menu_items m
       JOIN reservation_items ri ON m.item_id = ri.product_id 
       WHERE ri.reservation_id = ?`,
      [reservationId],
    );
    return rows;
  },
   // --- NEW: Create the main reservation record for a Walk-in ---
  createWalkinSession: async (conn, reservationId, firstName = "Walk-in") => {
    const query = `
      INSERT INTO reservations (reservation_id, first_name, status, reservation_date, reservation_time) 
      VALUES (?, ?, 'Seated', CURDATE(), CURTIME())
    `;
    return await conn.execute(query, [reservationId, firstName]);
  },
  // --- NEW: Link the table and update master status (Turns dashboard RED) ---
   linkTableToSession: async (conn, reservationId, tableId) => {
    // 1. Insert into bridge table
    const bridgeQuery = `
      INSERT INTO reservation_tables (reservation_id, table_id, status, check_in_time) 
      VALUES (?, ?, 'seated', NOW())
    `;
    await conn.execute(bridgeQuery, [reservationId, tableId]);

    // 2. Update master tables record
    const tableUpdateQuery = `
      UPDATE tables SET status = 'occupied', available_seats = 0 WHERE table_id = ?
    `;
    return await conn.execute(tableUpdateQuery, [tableId]);
  },
};

module.exports = Order;

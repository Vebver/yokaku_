const db = require("../config/db");

const Order = {
  getIngredients: async (conn, itemId) => {
    const [rows] = await conn.execute(
      `SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE item_id = ?`,
      [itemId]
    );
    return rows;
  },

  checkStock: async (conn, inventoryId) => {
    const [rows] = await conn.execute(
      `SELECT quantity, item_name, reorder_level FROM inventory WHERE inventory_id = ?`,
      [inventoryId]
    );
    return rows[0];
  },

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

  createOrderEntry: async (conn, reservationId, itemId, quantity, customizations) => {
    const query = `
      INSERT INTO kiosk_orders (reservation_id, item_id, quantity, kitchen_status, customizations) 
      VALUES (?, ?, ?, 'Pending', ?)`;
    const customData = customizations ? JSON.stringify(customizations) : null;
    return await conn.execute(query, [reservationId, itemId, quantity, customData]);
  },

  createWalkinSession: async (conn, reservationId, firstName = "Walk-in") => {
    const query = `
      INSERT INTO reservations (
        reservation_id, first_name, last_name, email, phone, status, 
        reservation_date, reservation_time, brgy_code, num_guests, package_name, occasion, highChair
      ) 
      VALUES (?, ?, '', '', '', 'Seated', CURDATE(), CURTIME(), NULL, 1, 'Walk-in', 'None', 0)
    `;
    return await conn.execute(query, [reservationId, firstName]);
  },

  linkTableToSession: async (conn, reservationId, tableId) => {
    await conn.execute(`INSERT INTO reservation_tables (reservation_id, table_id, status, check_in_time) VALUES (?, ?, 'seated', NOW())`, [reservationId, tableId]);
    return await conn.execute(`UPDATE tables SET status = 'occupied', available_seats = 0 WHERE table_id = ?`, [tableId]);
  },

  updateStatus: async (reservationId, status) => {
    return await db.execute(`UPDATE kiosk_orders SET kitchen_status = ? WHERE reservation_id = ?`, [status, reservationId]);
  },

  getPreReservedItems: async (reservationId) => {
    const [rows] = await db.execute(
      `SELECT m.*, ri.customizations FROM menu_items m JOIN reservation_items ri ON m.item_id = ri.product_id WHERE ri.reservation_id = ?`,
      [reservationId]
    );
    return rows;
  }
};

module.exports = Order;
// backend/models/Order.js
const db = require("../config/db");

const Order = {
  // 1. Get the recipe for a specific menu item
  getIngredients: async (conn, itemId) => {
    const [rows] = await conn.execute(
      `SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE item_id = ?`,
      [itemId],
    );
    return rows;
  },

  // 2. Check current stock levels
  checkStock: async (conn, inventoryId) => {
    const [rows] = await conn.execute(
      `SELECT quantity, item_name, reorder_level FROM inventory WHERE inventory_id = ?`,
      [inventoryId],
    );
    return rows[0];
  },

  // 3. Update inventory quantities and status
  updateInventory: async (conn, inventoryId, amountUsed) => {
    const query = `
      UPDATE inventory 
      SET quantity = quantity - ?, 
          last_updated = NOW(),
          status = CASE 
            WHEN (quantity - ?) <= reorder_level AND (quantity - ?) > 0 THEN 'low stock' 
            WHEN (quantity - ?) <= 0 THEN 'out of stock' 
            ELSE 'available' 
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

  // 4. Record the actual food item order
  createOrderEntry: async (
    conn,
    reservationId,
    itemId,
    quantity,
    customizations,
    isRefill = 0,
  ) => {
    const query = `
      INSERT INTO kiosk_orders 
      (reservation_id, item_id, quantity, kitchen_status, customizations, is_refill) 
      VALUES (?, ?, ?, ?, ?, ?)`;
    const customData = customizations ? JSON.stringify(customizations) : null;
    return await conn.execute(query, [
      reservationId,
      itemId,
      quantity,
      "pending",
      customData,
      isRefill,
    ]);
  },

  // 5. Create the main reservation record for a Walk-in
  createWalkinSession: async (conn, reservationId, firstName = "Walk-in") => {
    const query = `
      INSERT INTO reservations (
        reservation_id, first_name, last_name, email, phone, status, 
        reservation_date, reservation_time, brgy_code, num_guests, package_name, occasion, highChair
      ) 
      VALUES (?, ?, '', '', '', 'seated', CURDATE(), CURTIME(), NULL, 1, 'walk-in', 'none', 'no')
    `;
    return await conn.execute(query, [reservationId, firstName]);
  },

  // 6. Link the table and update status to occupied
  linkTableToSession: async (conn, reservationId, tableId) => {
    // 1. Insert into bridge table
    await conn.execute(
      `INSERT INTO reservation_tables (reservation_id, table_id, status, check_in_time) VALUES (?, ?, 'seated', NOW())`,
      [reservationId, tableId],
    );
    // 2. Update master tables record
    return await conn.execute(
      `UPDATE tables SET status = 'occupied', available_seats = 0 WHERE table_id = ?`,
      [tableId],
    );
  },

  // 7. Release Table (Finish Button logic)
  releaseTable: async (conn, tableId, reservationId) => {
    // 1. Mark table as available
    await conn.execute(
      `UPDATE tables SET status = 'available' WHERE table_id = ?`,
      [tableId],
    );

    // 2. Mark the bridge record as completed
    await conn.execute(
      `UPDATE reservation_tables SET status = 'completed' WHERE reservation_id = ? AND table_id = ?`,
      [reservationId, tableId],
    );

    // 3. Mark the main reservation as completed
    return await conn.execute(
      `UPDATE reservations SET status = 'completed' WHERE reservation_id = ?`,
      [reservationId],
    );
  },

  // 8. Update Kitchen Status
  updateStatus: async (reservationId, status) => {
    // This forces 'Preparing' or 'READY' to become 'preparing' or 'ready'
    const cleanStatus = status.toLowerCase();

    return await db.execute(
      `UPDATE kiosk_orders SET kitchen_status = ? WHERE reservation_id = ?`,
      [cleanStatus, reservationId],
    );
  },

  // 9. Get pre-reserved items (for initial kiosk load)
  getPreReservedItems: async (reservationId) => {
    const [rows] = await db.execute(
      `SELECT m.*, ri.customizations FROM menu_items m JOIN reservation_items ri ON m.item_id = ri.product_id WHERE ri.reservation_id = ?`,
      [reservationId],
    );
    return rows;
  },

  // 10. Get all active orders (for Kitchen page)
  getActiveOrders: async () => {
    const [rows] = await db.execute(`
    SELECT 
      ko.order_id as id,
      ko.reservation_id,
      ko.item_id,
      ko.quantity,
      ko.kitchen_status as status,
      ko.customizations,
      ko.created_at as timestamp,
      mi.name as item_name,
      mi.price,
      CASE 
        WHEN rt.table_id IS NOT NULL THEN CONCAT('Table ', rt.table_id)
        ELSE 'Walk-in'
      END as \`table\`
    FROM kiosk_orders ko
    JOIN menu_items mi ON ko.item_id = mi.item_id
    LEFT JOIN reservations r ON ko.reservation_id = r.reservation_id
    LEFT JOIN reservation_tables rt ON r.reservation_id = rt.reservation_id
    WHERE ko.kitchen_status IN ('pending', 'preparing', 'ready')
    ORDER BY ko.created_at DESC
  `);

    // Group items by reservation_id to match KitchenPage expected format
    const groupedOrders = {};
    rows.forEach((row) => {
      if (!groupedOrders[row.reservation_id]) {
        groupedOrders[row.reservation_id] = {
          id: row.reservation_id,
          table: row.table,
          status: row.status,
          timestamp: row.timestamp,
          items: [],
        };
      }
      groupedOrders[row.reservation_id].items.push({
        id: row.item_id,
        name: row.item_name,
        quantity: row.quantity,
        price: row.price,
        customizations: row.customizations,
      });
    });

    return Object.values(groupedOrders);
  },
};

module.exports = Order;

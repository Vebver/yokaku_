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
    allergyNote = null,
  ) => {
    const query = `
      INSERT INTO kiosk_orders 
      (reservation_id, item_id, quantity, kitchen_status, customizations, is_refill, allergy_note) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const customData = customizations ? JSON.stringify(customizations) : null;
    return await conn.execute(query, [
      reservationId,
      itemId,
      quantity,
      "pending",
      customData,
      isRefill,
      allergyNote,
    ]);
  },
  // 5. Create the main reservation record for a Walk-in
  createWalkinSession: async (conn, reservationId, firstName = "Walk-in") => {
    // Generate dates aligned with the local Philippine timezone (Asia/Manila)
    const options = { timeZone: "Asia/Manila", hour12: false };
    const localDate = new Date().toLocaleDateString("en-CA", options); // Returns YYYY-MM-DD
    const localTime = new Date().toLocaleTimeString("en-US", options); // Returns HH:MM:SS

    const query = `
      INSERT INTO reservations (
        reservation_id, first_name, last_name, email, phone, status, 
        reservation_date, reservation_time, brgy_code, num_guests, package_name, occasion
      ) 
      VALUES (?, ?, '', '', '', 'seated', ?, ?, NULL, 1, 'walk-in', 'none')
    `;
    return await conn.execute(query, [reservationId, firstName, localDate, localTime]);
  },

  // 6. Link the table and update status to occupied
  linkTableToSession: async (conn, reservationId, tableId) => {
    await conn.execute(
      `INSERT INTO reservation_tables (reservation_id, table_id, status, check_in_time) VALUES (?, ?, 'seated', NOW())`,
      [reservationId, tableId],
    );
    return await conn.execute(
      `UPDATE tables SET status = 'occupied', available_seats = 0 WHERE table_id = ?`,
      [tableId],
    );
  },

  // 7. Release Table (Finish Button logic)
  releaseTable: async (conn, tableId, reservationId) => {
    await conn.execute(
      `UPDATE tables SET status = 'available' WHERE table_id = ?`,
      [tableId],
    );

    await conn.execute(
      `UPDATE reservation_tables SET status = 'completed' WHERE reservation_id = ? AND table_id = ?`,
      [reservationId, tableId],
    );

    return await conn.execute(
      `UPDATE reservations SET status = 'completed' WHERE reservation_id = ?`,
      [reservationId],
    );
  },

  // 8. Update Kitchen Status, Reservation Status, and Notify (Deduction Added
  updateStatus: async (reservationId, status) => {
    const cleanStatus = status.toLowerCase(); // pending, preparing, ready, served, completed

    // --- FIX STARTS HERE ---
    let reservationStatus = "seated"; 

    // ONLY mark as 'completed' if the status is explicitly 'completed' (from Checkout)
    // Do NOT include 'served' here.
    if (cleanStatus === "completed") {
      reservationStatus = "completed";
    }
    // --- FIX ENDS HERE ---

    let notifType = "info";
    if (cleanStatus === "ready") {
      notifType = "success"; 
    } else if (cleanStatus === "alert") {
      notifType = "alert";
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // --- INVENTORY DEDUCTION ---
      // This part is good - we deduct stock when food is served
      if (cleanStatus === "served" || cleanStatus === "completed") {
        const [orders] = await conn.execute(
          `SELECT item_id, quantity 
           FROM kiosk_orders 
           WHERE reservation_id = ? AND kitchen_status NOT IN ('served', 'completed')`,
          [reservationId]
        );

        for (const order of orders) {
          const ingredients = await Order.getIngredients(conn, order.item_id);
          for (const ingredient of ingredients) {
            const totalUsed = order.quantity * ingredient.quantity_required;
            await Order.updateInventory(conn, ingredient.inventory_id, totalUsed);
          }
        }
      }

      // 1. Update kitchen status for the items
      await conn.execute(
        `UPDATE kiosk_orders SET kitchen_status = ? WHERE reservation_id = ?`,
        [cleanStatus, reservationId],
      );

      // 2. Update the main reservation status
      // With the fix above, this will now remain 'seated' if cleanStatus is 'served'
      await conn.execute(
        `UPDATE reservations SET status = ? WHERE reservation_id = ?`,
        [reservationStatus, reservationId],
      );

      // 3. Notification Logic (Keep as is...)
      const [resData] = await conn.execute(
        `SELECT user_id FROM reservations WHERE reservation_id = ?`,
        [reservationId],
      );

      if (resData.length > 0 && resData[0].user_id && resData[0].user_id !== "null") {
        await conn.execute(
          `INSERT INTO notifications (user_id, reservation_id, title, message, type, is_read, created_at) 
           VALUES (?, ?, ?, ?, ?, 0, NOW())`,
          [
            resData[0].user_id,
            reservationId,
            `Order Status: ${cleanStatus}`,
            `Your order status has been updated to ${cleanStatus}`,
            notifType,
          ],
        );
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error; 
    } finally {
      conn.release();
    }
  },

  // getPreReservedItems: async (reservationId) => {
  //   const query = `
  //     SELECT m.*, ri.quantity, ri.customizations 
  //     FROM menu_items m 
  //     JOIN reservation_items ri ON m.item_id = ri.product_id 
  //     WHERE ri.reservation_id = ?
  //     UNION ALL
  //     SELECT m.*, ko.quantity, ko.customizations 
  //     FROM menu_items m 
  //     JOIN kiosk_orders ko ON m.item_id = ko.item_id 
  //     WHERE ko.reservation_id = ?
  //   `;
  //   const [rows] = await db.execute(query, [reservationId, reservationId]);
  //   return rows;
  // },

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
      ko.allergy_note,
      ko.created_at as timestamp,
      mi.menu_name as item_name,
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

    const groupedOrders = {};
    rows.forEach((row) => {
      if (!groupedOrders[row.reservation_id]) {
        groupedOrders[row.reservation_id] = {
          id: row.reservation_id,
          table: row.table,
          status: row.status,
          timestamp: row.timestamp,
          allergy_note: row.allergy_note, 
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
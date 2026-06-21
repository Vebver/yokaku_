const db = require("../config/db");
const Order = require("../models/Order");

const orderController = {
  // --- 1. Update Status (Fixes the 404) ---
  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      console.log(`📡 [Backend] Request to update order ${id} to ${status}`);

      // Call the model method
      await Order.updateStatus(id, status);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("❌ Update Status Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // --- 2. Place Order (Fixes the missing names) ---
  placeOrder: async (req, res) => {
    const { reservation_id, table_id, items } = req.body;
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // ... (Keep your existing Cooldown Refill logic here) ...

      // 1. Check if reservation exists
      const [existing] = await conn.execute(
  "SELECT reservation_id FROM reservations WHERE reservation_id = ?",
  [reservation_id]
);

if (existing.length === 0) {
  await Order.createWalkinSession(conn, reservation_id);
}

// 2. FORCE the table to be 'seated' in the bridge table
if (table_id && table_id !== "takeout" && table_id !== "null") {
  await conn.execute(
    `INSERT INTO reservation_tables (reservation_id, table_id, status, check_in_time)
     VALUES (?, ?, 'seated', NOW())
     ON DUPLICATE KEY UPDATE status = 'seated'`,
    [reservation_id, table_id]
  );

  await conn.execute("UPDATE tables SET status = 'occupied' WHERE table_id = ?", [table_id]);
  await conn.execute("UPDATE reservations SET status = 'Seated' WHERE reservation_id = ?", [reservation_id]);
}
      // --- FIX ENDS HERE ---

      const enrichedItems = [];

      for (const item of items) {
        const [menuData] = await conn.execute(
          "SELECT menu_name FROM menu_items WHERE item_id = ?",
          [item.item_id || item.id],
        );

        const itemName = menuData[0]?.menu_name || "Unknown Item";

        await Order.createOrderEntry(
          conn,
          reservation_id,
          item.item_id || item.id,
          item.quantity,
          item.customizations,
          item.is_refill ? 1 : 0,
          req.body.allergy_note,
        );

        enrichedItems.push({
          name: itemName,
          qty: item.quantity,
          customizations: item.customizations,
        });
      }

      await conn.commit();

      const io = req.app.get("io");
      if (io) {
        io.emit("new_order", {
          id: reservation_id + "-" + Date.now(),
          table: table_id || "Walk-in",
          status: "pending",
          timestamp: new Date(),
          items: enrichedItems,
        });
        io.emit("table_updated");
        console.log("📡 [Socket] Table update signal sent to Admin"); 
      }

      res.status(201).json({ success: true });
    } catch (error) {
      await conn.rollback();
      console.error("Order Error:", error);
      res.status(400).json({ error: error.message });
    } finally {
      conn.release();
    }
  },

  finishSession: async (req, res) => {
    const { table_id, reservation_id } = req.body;
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      console.log(
        `🏁 Finishing session: Res ${reservation_id}, Table ${table_id}`,
      );

      // 1. Update main reservation status (match existing casing used by kiosk verification)
      await conn.execute(
        "UPDATE reservations SET status = 'Completed' WHERE reservation_id = ?",
        [reservation_id],
      );

      // 2. Update bridge table status
      await conn.execute(
        "UPDATE reservation_tables SET status = 'completed' WHERE reservation_id = ?",
        [reservation_id],
      );

      // 3. Mark kiosk orders as completed (fix UI showing 'confirmed' after finish)
      await conn.execute(
        "UPDATE kiosk_orders SET kitchen_status = 'completed' WHERE reservation_id = ?",
        [reservation_id],
      );

      // 4. Release table if it's a real table
      if (table_id && table_id !== "takeout" && table_id !== "null") {
        await conn.execute(
          "UPDATE tables SET status = 'available' WHERE table_id = ?",
          [table_id],
        );
      }

      await conn.commit();
      res.status(200).json({ success: true });
    } catch (error) {
      await conn.rollback();
      console.error("❌ SQL Finish Error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      conn.release();
    }
  },

  getReservedItems: async (req, res) => {
    try {
      const items = await Order.getPreReservedItems(req.params.id);
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed" });
    }
  },

  // --- Get Active Orders (Pending, Preparing, Ready) ---
  getActiveOrders: async (req, res) => {
    try {
      const orders = await Order.getActiveOrders();
      res.status(200).json(orders);
    } catch (error) {
      console.error("❌ Error fetching active orders:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = orderController;

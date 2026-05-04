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

      const [existing] = await conn.execute(
        "SELECT reservation_id FROM reservations WHERE reservation_id = ?",
        [reservation_id],
      );
      if (existing.length === 0) {
        await Order.createWalkinSession(conn, reservation_id);
        if (table_id)
          await Order.linkTableToSession(conn, reservation_id, table_id);
      }

      const enrichedItems = []; // To store names for the kitchen

      for (const item of items) {
        // 1. Look up the name from menu_items
        const [menuData] = await conn.execute(
          "SELECT name FROM menu_items WHERE item_id = ?",
          [item.item_id || item.id],
        );

        const itemName = menuData[0]?.name || "Unknown Item";
        console.log(`📦 Enriched item: ID ${item.item_id} is ${itemName}`);

        // 2. Save the order to DB
        await Order.createOrderEntry(
          conn,
          reservation_id,
          item.item_id || item.id,
          item.quantity,
          item.customizations,
        );

        // 3. Add to the list for the Kitchen
        enrichedItems.push({
          name: itemName, // THIS is what the kitchen card needs
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
          items: enrichedItems, // Send the items WITH names
        });
      }
      res.status(201).json({ success: true });
    } catch (error) {
      await conn.rollback();
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
      if (table_id && table_id !== "takeout")
        await Order.releaseTable(conn, table_id, reservation_id);
      await conn.commit();
      res.status(200).json({ success: true });
    } catch (error) {
      await conn.rollback();
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
};

module.exports = orderController;

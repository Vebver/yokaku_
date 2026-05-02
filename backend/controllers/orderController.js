// backend/controllers/orderController.js
const db = require("../config/db"); // Needed only for the transaction connection
const Order = require("../models/Order");

const orderController = {
  // 1. Update the status of an order (Kitchen Buttons)
  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params; // reservation_id
      const { status } = req.body;

      // Convert 'preparing' -> 'Preparing' to match your DB strings
      const dbStatus = status.charAt(0).toUpperCase() + status.slice(1);

      // CALLING MODEL METHOD
      await Order.updateStatus(id, dbStatus);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 2. Get items chosen during the initial reservation booking
  getReservedItems: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || id === "WALKIN" || id === "GUEST") {
        return res.status(200).json([]);
      }

      // CALLING MODEL METHOD
      const items = await Order.getPreReservedItems(id);
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pre-reserved items" });
    }
  },

  // 3. Place a new order from the Kiosk
 placeOrder: async (req, res) => {
    const { reservation_id, table_id, items } = req.body;
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();
      await Order.createWalkinSession(conn, reservation_id);
      if (table_id) await Order.linkTableToSession(conn, reservation_id, table_id);

      const enrichedItems = []; // We will store names here

      for (const item of items) {
        // 1. Get the name and stock info for this item
        const [menuDetails] = await conn.execute(
          "SELECT name FROM menu_items WHERE item_id = ?",
          [item.item_id]
        );
        const itemName = menuDetails[0]?.name || "Unknown Item";

        const ingredients = await Order.getIngredients(conn, item.item_id);
        for (const ing of ingredients) {
          const needed = ing.quantity_required * item.quantity;
          const stock = await Order.checkStock(conn, ing.inventory_id);
          if (!stock || stock.quantity < needed) throw new Error(`Out of stock: ${stock.item_name}`);
          await Order.updateInventory(conn, ing.inventory_id, needed);
        }

        await Order.createOrderEntry(conn, reservation_id, item.item_id, item.quantity, item.customizations);
        
        // 2. Add to our enriched list for the socket
        enrichedItems.push({
          name: itemName,
          qty: item.quantity,
          customizations: item.customizations
        });
      }

      await conn.commit();

      // --- EMIT TO KITCHEN WITH NAMES ---
      const io = req.app.get("io");
      if (io) {
        io.emit("new_order", {
          id: reservation_id + "-" + Date.now(), // Unique ID for testing
          table: table_id || "Walk-in",
          status: "pending",
          timestamp: new Date(),
          items: enrichedItems // NOW CONTAINS NAMES!
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
};

module.exports = orderController;

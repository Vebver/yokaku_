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

      // --- STEP 1: CHECK IF SESSION ALREADY EXISTS ---
      const [existing] = await conn.execute(
        "SELECT reservation_id FROM reservations WHERE reservation_id = ?",
        [reservation_id]
      );

      if (existing.length === 0) {
        // This is a NEW session (First order)
        console.log("🆕 Creating new session for:", reservation_id);
        await Order.createWalkinSession(conn, reservation_id);

        if (table_id) {
          await Order.linkTableToSession(conn, reservation_id, table_id);
        }
      } else {
        // This is an EXISTING session (Add to order)
        console.log("➕ Adding items to existing session:", reservation_id);
      }

      // --- STEP 2: PROCESS ITEMS (Always runs) ---
      for (const item of items) {
        // Stock check logic...
        const ingredients = await Order.getIngredients(conn, item.item_id);
        for (const ing of ingredients) {
          const totalNeeded = ing.quantity_required * item.quantity;
          const stock = await Order.checkStock(conn, ing.inventory_id);
          if (!stock || stock.quantity < totalNeeded) {
             throw new Error(`Insufficient stock for ${stock?.item_name || 'ingredient'}`);
          }
          await Order.updateInventory(conn, ing.inventory_id, totalNeeded);
        }

        // Save items to kiosk_orders
        let finalCustoms = item.customizations;
        if (finalCustoms && typeof finalCustoms !== 'string') {
            finalCustoms = JSON.stringify(finalCustoms);
        }

        await Order.createOrderEntry(
          conn,
          reservation_id,
          item.item_id,
          item.quantity,
          finalCustoms
        );
      }

      await conn.commit();
      
      // --- STEP 3: SOCKET EMIT (So kitchen sees the extra items) ---
      const io = req.app.get("io");
      if (io) {
        io.emit("new_order", {
          id: reservation_id + "-" + Date.now(), // Unique ID for kitchen card
          table: table_id || "Walk-in",
          status: "pending",
          timestamp: new Date(),
          items: items // Note: Ideally, you should fetch names here like we did before
        });
      }

      res.status(201).json({ success: true, message: "Order updated successfully!" });

    } catch (error) {
      await conn.rollback();
      console.error("Order Transaction Error:", error.message);
      res.status(400).json({ success: false, error: error.message });
    } finally {
      conn.release();
    }
  },
  // Inside your orderController object

  finishSession: async (req, res) => {
    const { table_id, reservation_id } = req.body;
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // Only release if there is actually a table assigned
      if (table_id && table_id !== "takeout") {
        await Order.releaseTable(conn, table_id, reservation_id);
      }

      await conn.commit();
      res.status(200).json({ success: true, message: "Session finished and table released" });
    } catch (error) {
      await conn.rollback();
      console.error("Finish Session Error:", error.message);
      res.status(500).json({ error: error.message });
    } finally {
      conn.release();
    }
  },
};

module.exports = orderController;

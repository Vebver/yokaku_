const db = require("../config/db");
const Order = require("../models/Order");

const orderController = {
  // --- 1. Update Status ---
  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      console.log(`📡 [Backend] Request to update order ${id} to ${status}`);

      await Order.updateStatus(id, status);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("❌ Update Status Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // --- 2. Place Order (Fixed) ---
  placeOrder: async (req, res) => {
    const { reservation_id, table_id, items } = req.body;
     console.log("📡 [DEBUG] placeOrder called with ID:", reservation_id); // <-- ADD THIS LOG
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

       const hasRefill = items.some((item) => item.is_refill === true);

      if (hasRefill) {
        // Query the database for the last refill for this specific reservation
        const [lastRefill] = await conn.execute(
          `SELECT created_at FROM kiosk_orders 
         WHERE reservation_id = ? AND is_refill = 1
         ORDER BY created_at DESC LIMIT 1`,
          [reservation_id],
        );

        if (lastRefill.length > 0) {
          const lastTime = new Date(lastRefill[0].created_at);
          const now = new Date();
          const diffInMinutes = Math.floor((now - lastTime) / (1000 * 60));

          // 15 MINUTE RULE
          if (diffInMinutes < 15) {
            const remaining = 15 - diffInMinutes;
            // IMPORTANT: Rollback and release if we block the order
            await conn.rollback();
            conn.release();
            return res.status(429).json({
              error: "Cooldown active",
              message: `Please wait ${remaining} more minutes before your next refill.`,
            });
          }
        }
      }

      // 1. Check if reservation exists
      const [existing] = await conn.execute(
        "SELECT reservation_id FROM reservations WHERE reservation_id = ?",
        [reservation_id]
      );

      const isWalkIn = reservation_id && reservation_id.startsWith("WALK");

      if (existing.length === 0) {
        if (isWalkIn) {
          // Automatically create a Walk-in session since it doesn't exist in the database yet
          await Order.createWalkinSession(conn, reservation_id, "Walk-in");
          
          if (table_id && table_id !== "takeout" && table_id !== "null") {
            await Order.linkTableToSession(conn, reservation_id, table_id);
          }
        } else {
          // Reject regular reservations that do not exist
          throw new Error(`Reservation ID ${reservation_id} does not exist. Please create a reservation first.`);
        }
      } else {
        // Update the existing reservation to Seated
        await conn.execute(
          "UPDATE reservations SET status = 'Seated' WHERE reservation_id = ?",
          [reservation_id]
        );

        // Force the 'seated' status on the bridge table (Admin UI looks here)
        if (table_id && table_id !== "takeout" && table_id !== "null") {
          await conn.execute(
            `INSERT INTO reservation_tables (reservation_id, table_id, status, check_in_time)
             VALUES (?, ?, 'seated', NOW())
             ON DUPLICATE KEY UPDATE status = 'seated'`,
            [reservation_id, table_id]
          );

          // Update the master tables table
          await conn.execute(
            "UPDATE tables SET status = 'occupied' WHERE table_id = ?",
            [table_id]
          );
        }
      }

        // Update the master tables table to 'occupied'
        await conn.execute(
          "UPDATE tables SET status = 'occupied' WHERE table_id = ?",
          [table_id],
        );
      }

      // 4. Process order items
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

      // 5. Emit socket events
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

      res.status(201).json({
        success: true,
        message: "Order placed successfully",
        reservation_id,
      });
    } catch (error) {
      await conn.rollback();
      console.error("❌ Order Error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
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

      // 1. Update main reservation status
      await conn.execute(
        "UPDATE reservations SET status = 'Completed' WHERE reservation_id = ?",
        [reservation_id],
      );

      // 2. Update bridge table status
      await conn.execute(
        "UPDATE reservation_tables SET status = 'completed' WHERE reservation_id = ?",
        [reservation_id],
      );

      // 3. Mark kiosk orders as completed
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

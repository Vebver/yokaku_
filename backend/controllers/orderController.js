const db = require("../config/db");
const Order = require("../models/Order");
const Notification = require("../models/Notification");

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
    const requestedGuests = Number.parseInt(
      req.body.guests ?? req.body.num_guests,
      10,
    );
    const guestCount = Number.isInteger(requestedGuests)
      ? Math.min(Math.max(requestedGuests, 1), 35)
      : 1;
    console.log("📡 [DEBUG] placeOrder called with ID:", reservation_id);
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
          await Order.createWalkinSession(
            conn,
            reservation_id,
            "Walk-in",
            guestCount,
          );
          
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

        if (isWalkIn) {
          await conn.execute(
            "UPDATE reservations SET num_guests = ? WHERE reservation_id = ?",
            [guestCount, reservation_id],
          );
        }
        
        if (table_id && table_id !== "takeout" && table_id !== "null") {
          await conn.execute(
            `INSERT INTO reservation_tables (reservation_id, table_id, status, check_in_time)
             VALUES (?, ?, 'seated', NOW())
             ON DUPLICATE KEY UPDATE status = 'seated'`,
            [reservation_id, table_id]
          );
        }
      }

      // Always mark the physical table as occupied for the session, whether the
      // reservation was just created or already existed. The Table Status page
      // reads this through bridge_status, so it must be set on every order.
      if (table_id && table_id !== "takeout" && table_id !== "null") {
        await conn.execute(
          "UPDATE tables SET status = 'occupied', available_seats = 0 WHERE table_id = ?",
          [table_id]
        );
      }

      // 2. Process order items
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

      // ==================== INSTANT BILLING SYNCHRONIZATION ====================
      // Updates payments table automatically using the model layer
      await Order.syncBillingTotal(conn, reservation_id);
      // =========================================================================

      await conn.commit();

      // Persist an admin alert so the order remains visible after refresh.
      try {
        const itemSummary = enrichedItems
          .map((item) => `${item.qty}x ${item.name}`)
          .join(", ");
        await Notification.create(null, {
          reservationId: reservation_id,
          title: "New Kiosk Order",
          message: `${itemSummary || "New items"} from ${table_id ? `Table ${table_id}` : "Walk-in"}.`,
          type: "order",
          isAdminAlert: true,
        });
      } catch (notificationError) {
        // Do not reject a successfully saved order if notification delivery fails.
        console.error("❌ Kiosk order notification error:", notificationError);
      }

      // 3. Emit socket events
      const io = req.app.get("io");
      if (io) {
        // Notify admin screens that the table is now occupied
        io.emit("table_updated");
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

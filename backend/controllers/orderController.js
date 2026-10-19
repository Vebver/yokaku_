const db = require("../config/db");
const crypto = require("crypto");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const { validateUnlimitedPackageOrder } = require("../utils/unlimitedPackageRules");
const REFILL_COOLDOWN_MS = require("../../shared/refillCooldown.json").milliseconds;
const PACKAGE_INCLUDED_MARKER = "[PACKAGE INCLUDED]";
const getManilaDateTime = () => ({
  date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }),
  time: new Date().toLocaleTimeString("en-US", {
    hour12: false,
    timeZone: "Asia/Manila",
  }),
});

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
    const idempotencyKey = String(req.get("Idempotency-Key") || "").trim();
    if (idempotencyKey && (!reservation_id || idempotencyKey.length > 80)) {
      return res.status(400).json({ error: "Invalid order idempotency key." });
    }
    const payloadHash = idempotencyKey
      ? crypto
          .createHash("sha256")
          .update(JSON.stringify({
            reservation_id,
            table_id: table_id ?? null,
            items,
            allergy_note: req.body.allergy_note ?? null,
            guests: req.body.guests ?? req.body.num_guests ?? null,
          }))
          .digest("hex")
      : null;
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

      if (idempotencyKey) {
        const [claim] = await conn.execute(
          `INSERT IGNORE INTO kiosk_order_submissions
             (reservation_id, idempotency_key, payload_hash)
           VALUES (?, ?, ?)`,
          [reservation_id, idempotencyKey, payloadHash],
        );
        if (claim.affectedRows === 0) {
          const [existingSubmissions] = await conn.execute(
            `SELECT payload_hash, response_json
             FROM kiosk_order_submissions
             WHERE reservation_id = ? AND idempotency_key = ?
             FOR UPDATE`,
            [reservation_id, idempotencyKey],
          );
          const submission = existingSubmissions[0];
          if (!submission || submission.payload_hash !== payloadHash) {
            const error = new Error("This order key was already used for a different order.");
            error.statusCode = 409;
            throw error;
          }
          const previousResponse = submission.response_json;
          if (!previousResponse) {
            const error = new Error("This order is still being processed. Retry shortly.");
            error.statusCode = 409;
            throw error;
          }
          await conn.commit();
          const responseBody = typeof previousResponse === "string"
            ? JSON.parse(previousResponse)
            : previousResponse;
          return res.status(200).json({ ...responseBody, duplicate: true });
        }
      }

      const packageValidation = await validateUnlimitedPackageOrder(conn, {
        reservationId: reservation_id,
        tableId: table_id,
        items,
      });
      const { mode: kioskMode } = packageValidation;
      const includedItemIds = new Set(packageValidation.packageIncludedItemIds || []);
      let hasPackageCardInSession = items.some(
        (item) =>
          Number(item.item_id || item.id) ===
          Number(packageValidation.packageCardItemId),
      );
      if (
        !hasPackageCardInSession &&
        packageValidation.packageCardItemId != null &&
        includedItemIds.size > 0
      ) {
        const [existingPackageRows] = await conn.execute(
          `SELECT 1
           FROM kiosk_orders
           WHERE reservation_id = ? AND item_id = ?
           LIMIT 1`,
          [reservation_id, packageValidation.packageCardItemId],
        );
        hasPackageCardInSession = existingPackageRows.length > 0;
      }
      const packageIncludedItemIds = new Set(
        hasPackageCardInSession ? includedItemIds : [],
      );

      const hasRefill = items.some(
        (item) =>
          Boolean(item.is_refill) ||
          String(item.customizations || "").includes("[REFILL]"),
      );

      if (hasRefill) {
        // Query the database for the last refill for this specific reservation
        const [lastRefill] = await conn.execute(
          `SELECT created_at FROM kiosk_orders 
         WHERE reservation_id = ? AND is_refill = 1
           AND COALESCE(customizations, '') LIKE '%[REFILL]%'
         ORDER BY created_at DESC LIMIT 1`,
          [reservation_id],
        );

        if (lastRefill.length > 0) {
          const lastTime = new Date(lastRefill[0].created_at);
          const now = new Date();

          if (now - lastTime < REFILL_COOLDOWN_MS) {
            const remaining = Math.ceil(
              (REFILL_COOLDOWN_MS - (now - lastTime)) / 60000,
            );
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
        `SELECT reservation_id, reservation_type, reservation_date, end_time
         FROM reservations WHERE reservation_id = ? FOR UPDATE`,
        [reservation_id]
      );

      if (
        existing.length > 0 &&
        String(existing[0].reservation_type || "").toLowerCase() === "event"
      ) {
        const { date: manilaDate, time: manilaTime } = getManilaDateTime();
        const [expiredReservations] = await conn.execute(
          `SELECT reservation_id FROM reservations
           WHERE reservation_id = ?
             AND TIMESTAMP(reservation_date, end_time) <= TIMESTAMP(?, ?)`,
          [reservation_id, manilaDate, manilaTime],
        );
        if (expiredReservations.length > 0) {
          throw new Error("This event reservation has ended. No new orders can be placed.");
        }

        const packageCardId = packageValidation.packageCardItemId;
        const packageCardSubmitted = packageCardId != null && items.some(
          (item) => Number(item.item_id || item.id) === Number(packageCardId),
        );
        if (packageCardSubmitted) {
          const [existingPackageOrders] = await conn.execute(
            `SELECT 1 FROM kiosk_orders
             WHERE reservation_id = ? AND item_id = ? LIMIT 1`,
            [reservation_id, packageCardId],
          );
          if (existingPackageOrders.length === 0) {
            const [nearEndReservations] = await conn.execute(
              `SELECT reservation_id FROM reservations
               WHERE reservation_id = ?
                 AND TIMESTAMP(reservation_date, end_time) <= DATE_ADD(TIMESTAMP(?, ?), INTERVAL 30 MINUTE)`,
              [reservation_id, manilaDate, manilaTime],
            );
            if (nearEndReservations.length > 0) {
              throw new Error(
                "Unlimited menus can only be started when more than 30 minutes remain in the reservation.",
              );
            }
          }
        }
      }

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
            if (kioskMode !== "default") {
              await conn.execute(
                "UPDATE reservation_tables SET kiosk_mode = ? WHERE reservation_id = ? AND table_id = ?",
                [kioskMode, reservation_id, table_id],
              );
            }
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

      // An order coming from a kiosk marks that session as a live kiosk, so
      // Kiosk Control / Table Status can spot it automatically instead of the
      // staff having to pick which terminal it belongs to.
      await conn.execute(
        "UPDATE reservations SET is_kiosk_active = 1 WHERE reservation_id = ?",
        [reservation_id],
      );

      // 2. Process order items
      const enrichedItems = [];

      for (const item of items) {
        const itemId = Number(item.item_id || item.id);
        const isPackageIncluded = packageIncludedItemIds.has(itemId);
        let customizations = item.customizations;
        if (isPackageIncluded) {
          const alreadyMarked = JSON.stringify(customizations || "")
            .toLowerCase()
            .includes(PACKAGE_INCLUDED_MARKER.toLowerCase());
          if (!alreadyMarked) {
            if (typeof customizations === "string") {
              customizations = [customizations.trim(), PACKAGE_INCLUDED_MARKER]
                .filter(Boolean)
                .join(" | ");
            } else if (Array.isArray(customizations)) {
              customizations = [...customizations, PACKAGE_INCLUDED_MARKER];
            } else if (customizations && typeof customizations === "object") {
              customizations = {
                ...customizations,
                package_included_marker: PACKAGE_INCLUDED_MARKER,
              };
            } else {
              customizations = PACKAGE_INCLUDED_MARKER;
            }
          }
        }
        const [menuData] = await conn.execute(
          "SELECT menu_name FROM menu_items WHERE item_id = ?",
          [itemId],
        );

        const itemName = menuData[0]?.menu_name || "Unknown Item";

        await Order.createOrderEntry(
          conn,
          reservation_id,
          itemId,
          Number(item.quantity),
          customizations,
          item.is_refill || packageIncludedItemIds.has(itemId) ? 1 : 0,
          req.body.allergy_note,
        );

        enrichedItems.push({
          name: itemName,
          qty: item.quantity,
          customizations,
        });
      }

      // ==================== INSTANT BILLING SYNCHRONIZATION ====================
      // Updates payments table automatically using the model layer
      await Order.syncBillingTotal(conn, reservation_id);
      // =========================================================================

      const responseBody = {
        success: true,
        message: "Order placed successfully",
        reservation_id,
      };
      if (idempotencyKey) {
        await conn.execute(
          `UPDATE kiosk_order_submissions SET response_json = ?
           WHERE reservation_id = ? AND idempotency_key = ?`,
          [JSON.stringify(responseBody), reservation_id, idempotencyKey],
        );
      }
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

      res.status(201).json(responseBody);
    } catch (error) {
      await conn.rollback();
      console.error("❌ Order Error:", error);
      res.status(error.statusCode || (error.code ? 500 : 400)).json({
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
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await Order.reconcilePaidPackageItems(conn, req.params.id);
      await conn.commit();
      const items = await Order.getPreReservedItems(req.params.id);
      res.status(200).json(items);
    } catch (error) {
      await conn.rollback();
      res.status(500).json({ error: "Failed" });
    } finally {
      conn.release();
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

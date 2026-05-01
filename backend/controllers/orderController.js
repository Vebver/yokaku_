// backend/controllers/orderController.js
const db = require("../config/db");
const Order = require("../models/Order");

const orderController = {
  // 1. Get items chosen during the initial reservation booking
  getReservedItems: async (req, res) => {
    try {
      const { id } = req.params;

      // Handle cases where there is no reservation (Walk-ins)
      if (!id || id === "WALKIN" || id === "GUEST") {
        return res.status(200).json([]);
      }

      const items = await Order.getPreReservedItems(id);
      res.status(200).json(items);
    } catch (error) {
      console.error("Controller Error (getReservedItems):", error);
      res.status(500).json({ error: "Failed to fetch pre-reserved items" });
    }
  },

  // 2. Place a new order from the Kiosk (handles session, tables, inventory)
  placeOrder: async (req, res) => {
    // NEW: Expect 'table_id' from the frontend if they are Dine-in
    const { reservation_id, table_id, items } = req.body;
    console.log("--- NEW ORDER RECEIVED ---");
    console.log("ID:", reservation_id, "Table:", table_id);
    console.log("Items:", items);
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // --- STEP 1: CREATE THE SESSION (The Bill) ---
      // This creates the record in the 'reservations' table so the Admin can see the bill
      await Order.createWalkinSession(conn, reservation_id);

      // --- STEP 2: LINK TO TABLE (Turn Dashboard RED) ---
      // If the customer chose a table, link it and update status to 'occupied'
      if (table_id) {
        await Order.linkTableToSession(conn, reservation_id, table_id);
      }

      // --- STEP 3: PROCESS ITEMS (Stock Check & Entry) ---
      for (const item of items) {
        // A. Get Ingredients (Recipe)
        const ingredients = await Order.getIngredients(conn, item.item_id);

        for (const ing of ingredients) {
          const totalAmountNeeded = ing.quantity_required * item.quantity;

          // B. Check Stock Availability
          const stock = await Order.checkStock(conn, ing.inventory_id);

          if (!stock || stock.quantity < totalAmountNeeded) {
            throw new Error(
              `Insufficient stock for ${stock ? stock.item_name : "ingredient"}`,
            );
          }

          // C. Reduce Inventory
          await Order.updateInventory(
            conn,
            ing.inventory_id,
            totalAmountNeeded,
          );
        }

        // D. Save Order Record in kiosk_orders
        // NEW: Pass customizations (Flavor, Drink, etc.) to the model
        await Order.createOrderEntry(
          conn,
          reservation_id,
          item.item_id,
          item.quantity,
          item.customizations, // Passed from the PackageModal
        );
      }

      await conn.commit();
      res
        .status(201)
        .json({ success: true, message: "Order placed successfully!" });
    } catch (error) {
      await conn.rollback();
      console.error("Order Transaction Error:", error.message);
      res.status(400).json({ success: false, error: error.message });
    } finally {
      conn.release();
    }
  },
};

module.exports = orderController;

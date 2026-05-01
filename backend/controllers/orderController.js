// backend/controllers/orderController.js
const db = require('../config/db')
const Order = require('../models/Order');

const orderController = {
  // 1. Get items chosen during the initial reservation booking
  getReservedItems: async (req, res) => {
    try {
      const { id } = req.params;

      // Handle cases where there is no reservation (Walk-ins)
      if (!id || id === "WALKIN" || id === "GUEST") {
        return res.status(200).json([]);
      }

      // Call the Model logic (Make sure getPreReservedItems exists in Order model)
      const items = await Order.getPreReservedItems(id);

      res.status(200).json(items);
    } catch (error) {
      console.error("Controller Error (getReservedItems):", error);
      res.status(500).json({ error: "Failed to fetch pre-reserved items" });
    }
  },

  // 2. Place a new order from the Kiosk (handles inventory and transactions)
  placeOrder: async (req, res) => {
    const { reservation_id, items } = req.body;
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      for (const item of items) {
        // 1. Get Ingredients (Recipe)
        const ingredients = await Order.getIngredients(conn, item.item_id);

        for (const ing of ingredients) {
          const totalAmountNeeded = ing.quantity_required * item.quantity;

          // 2. Check Stock Availability
          const stock = await Order.checkStock(conn, ing.inventory_id);
          
          if (!stock || stock.quantity < totalAmountNeeded) {
            throw new Error(`Insufficient stock for ${stock ? stock.item_name : 'ingredient'}`);
          }

          // 3. Reduce Inventory
          await Order.updateInventory(conn, ing.inventory_id, totalAmountNeeded);
        }

        // 4. Save Order Record in kiosk_orders
        await Order.createOrderEntry(conn, reservation_id, item.item_id, item.quantity);
      }

      await conn.commit();
      res.status(201).json({ success: true, message: "Order placed successfully!" });

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
// backend/controllers/orderController.js
const db = require('../config/db');
const Order = require('../models/Order');

exports.placeOrder = async (req, res) => {
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
          // If stock is too low, we stop the transaction
          throw new Error(`Insufficient stock for ${stock ? stock.item_name : 'ingredient'}`);
        }

        // 3. Reduce Inventory
        await Order.updateInventory(conn, ing.inventory_id, totalAmountNeeded);
      }

      // 4. Save Order Record in kiosk_orders
      await Order.createOrderEntry(conn, reservation_id, item.item_id, item.quantity);
    }

    // If everything is okay, save to database
    await conn.commit();
    res.status(201).json({ success: true, message: "Order placed successfully!" });

  } catch (error) {
    // If anything failed, undo all database changes
    await conn.rollback();
    console.error("Order Transaction Error:", error.message);
    res.status(400).json({ success: false, error: error.message });
  } finally {
    // Release connection back to pool
    conn.release();
  }
};
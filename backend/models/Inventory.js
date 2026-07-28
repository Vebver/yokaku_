const db = require("../config/db");

const Inventory = {
  // GET ALL ITEMS
  getAll: async () => {
    const sql = `
      SELECT 
        inventory_id, 
        item_name,
        category,
        quantity,
        unit,
        unit_price,
        expiry_date,
        storage_location,
        reorder_level,
        last_updated, 
        status
      FROM inventory 
      ORDER BY
        CASE 
          WHEN quantity <= 0 THEN 0
          WHEN quantity <= reorder_level THEN 1
          WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 2
          ELSE 3
        END ASC,
        CASE 
          WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN expiry_date 
          ELSE NULL 
        END ASC,
        last_updated DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  },

  // CREATE NEW ITEM
  create: async (data) => {
    const sql = `INSERT INTO inventory 
            (item_name, category, quantity, unit, unit_price, expiry_date, storage_location, reorder_level) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      data.item_name,
      data.category,
      data.quantity,
      data.unit,
      data.unit_price,
      data.expiry_date,
      data.storage_location,
      data.reorder_level,
    ];

    const [result] = await db.execute(sql, values);
    return { inventory_id: result.insertId, ...data };
  },

  // DELETE ITEM
  delete: async (id) => {
    const sql = "DELETE FROM inventory WHERE inventory_id = ?";
    await db.execute(sql, [id]);
    return true;
  },
  // UPDATE AN EXISTING ITEM
  update: async (id, data) => {
    const sql = `UPDATE inventory 
            SET item_name = ?, 
                category = ?, 
                quantity = ?, 
                unit = ?, 
                unit_price = ?, 
                expiry_date = ?, 
                storage_location = ?, 
                reorder_level = ?,
                last_updated = NOW()
            WHERE inventory_id = ?`;

    const values = [
      data.item_name,
      data.category,
      data.quantity,
      data.unit,
      data.unit_price,
      data.expiry_date ? data.expiry_date : null,
      data.storage_location,
      data.reorder_level,
      id,
    ];

    await db.execute(sql, values);
    return { inventory_id: id, ...data };
  },

  // 1. Get Low Stock Items
  GetLowStockItems: async () => {
    const [rows] = await db.execute(`
      SELECT 
        item_name as name, 
        quantity as current_stock,
        reorder_level as threshold, 
        unit 
      FROM inventory
      WHERE quantity <= reorder_level 
         OR LOWER(status) = 'low stock'
      ORDER BY quantity ASC
    `);
    return rows;
  },
  // Get Expired Items
  GetExpiredItems: async () => {
    const [rows] = await db.execute(`
      SELECT 
        item_name as name,
        quantity as current_stock,
        unit,
        expiry_date
      FROM inventory
      WHERE expiry_date IS NOT NULL 
        AND expiry_date < CURDATE()
      ORDER BY expiry_date ASC
    `);
    return rows;
  },
  // 2. Get Inventory Value and Status (Updated to match React keys)
  GetInventoryUsage: async () => {
    const [rows] = await db.execute(`
      SELECT 
        item_name as name, 
        unit,
        quantity as current_stock,
        ROUND(quantity * 1.25, 2) as starting_stock,
        ROUND(quantity * 0.25, 2) as used_stock,
        ROUND(quantity * unit_price, 2) as inventory_value,
        expiry_date
      FROM inventory
      LIMIT 10
    `);
    return rows;
  },

  // 3. Get Inventory KPIs (New query for overall stats cards)
  GetInventorySummary: async () => {
    const [rows] = await db.execute(`
      SELECT 
        IFNULL(SUM(quantity * unit_price), 0) as total_inventory_value,
        IFNULL(SUM(quantity * 0.25), 0) as items_used,
        IFNULL(SUM(quantity * 0.15), 0) as consumption_rate
      FROM inventory
    `);
    return rows[0];
  },
  updateRecipeIngredientQuantity: async (recipeId, quantityRequired) => {
    const sql = `UPDATE menu_item_ingredients SET quantity_required = ? WHERE recipe_id = ?`;
    const [result] = await db.execute(sql, [quantityRequired, recipeId]);
    return result.affectedRows > 0;
  },
};

module.exports = Inventory;

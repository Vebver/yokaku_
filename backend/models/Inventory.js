const db = require("../config/db");

const Inventory = {
  // GET ALL ITEMS
  // Each row also carries the dishes it is used in, so the inventory table can
  // show "used in" inline without a request per row.
  getAll: async () => {
    const sql = `
      SELECT
        i.inventory_id,
        i.item_name,
        i.category,
        i.quantity,
        i.unit,
        i.unit_price,
        i.expiry_date,
        i.storage_location,
        i.reorder_level,
        i.last_updated,
        i.status,
        COALESCE((
          SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'item_id', m.item_id,
            'name', m.menu_name,
            'quantity_required', r.quantity_required
          ))
          FROM menu_item_ingredients r
          JOIN menu_items m ON m.item_id = r.item_id
          WHERE r.inventory_id = i.inventory_id
        ), JSON_ARRAY()) AS dishes
      FROM inventory i
      -- Alphabetical by name so staff can find an item without hunting.
      -- Stock urgency is still surfaced by the Status column and colours.
      ORDER BY i.item_name ASC
    `;
    const [rows] = await db.query(sql);
    // mysql2 may hand these back as strings depending on driver settings.
    return rows.map((r) => {
      let dishes = r.dishes;
      if (typeof dishes === "string") {
        try {
          dishes = JSON.parse(dishes);
        } catch {
          dishes = [];
        }
      }
      return { ...r, dishes: Array.isArray(dishes) ? dishes : [] };
    });
  },

  // CREATE NEW ITEM
  // Accepts an optional connection so callers that need the insert to be part
  // of a transaction (e.g. linking dishes in the same step) can pass one in.
  create: async (data, conn = db) => {
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

    const [result] = await conn.execute(sql, values);
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

  // Items requiring attention. Expired stock is never considered usable and is
  // included even when its quantity is above the reorder threshold.
  GetLowStockItems: async () => {
    const [rows] = await db.execute(`
      SELECT
        item_name as name,
        quantity as current_stock,
        reorder_level as threshold,
        unit,
        expiry_date,
        CASE
          WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE()
               AND quantity <= reorder_level THEN 'low_stock_expired'
          WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 'expired'
          ELSE 'low_stock'
        END as attention_reason
      FROM inventory
      WHERE quantity <= reorder_level
         OR (expiry_date IS NOT NULL AND expiry_date < CURDATE())
      ORDER BY
        (expiry_date IS NOT NULL AND expiry_date < CURDATE()) DESC,
        quantity ASC,
        item_name ASC
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
  // Inventory report data comes from the same rows as the main Inventory page.
  // There is no stock-movement ledger in this schema, so do not fabricate
  // starting/used quantities from the current balance.
  GetInventoryUsage: async () => {
    const [rows] = await db.execute(`
      SELECT
        item_name as name,
        unit,
        quantity as current_stock,
        NULL as starting_stock,
        NULL as used_stock,
        CASE
          WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 0
          ELSE ROUND(quantity * unit_price, 2)
        END as inventory_value,
        expiry_date,
        reorder_level as threshold
      FROM inventory
      ORDER BY item_name ASC
    `);
    return rows;
  },

  // Inventory value excludes expired stock because it is not usable inventory.
  GetInventorySummary: async () => {
    const [rows] = await db.execute(`
      SELECT
        IFNULL(SUM(CASE WHEN expiry_date IS NULL OR expiry_date >= CURDATE()
          THEN quantity * unit_price ELSE 0 END), 0) as total_inventory_value,
        0 as items_used,
        0 as consumption_rate
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

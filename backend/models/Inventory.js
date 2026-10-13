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

  // ==================== DYNAMIC UNITS & STORAGE LOCATIONS ====================
  // The available units / storage locations are the set of options the admin
  // has created, seeded with sensible defaults so a fresh database is usable
  // immediately. Options are stored as rows, so adding "Sack" or "Walk-in
  // Chiller" requires no code change.
  //
  // NOTE ON MIGRATIONS: the reference tables are created lazily here (CREATE
  // TABLE IF NOT EXISTS) so no manual migration is required. If you prefer a
  // formal migration, run the same SQL in your migration step and this becomes
  // a no-op.
  ensureOptionTables: async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_units (
        unit_id INT NOT NULL AUTO_INCREMENT,
        unit_name VARCHAR(50) NOT NULL,
        unit_group VARCHAR(30) DEFAULT 'Other',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (unit_id),
        UNIQUE KEY uq_inventory_units_name (unit_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_storage_locations (
        storage_id INT NOT NULL AUTO_INCREMENT,
        storage_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (storage_id),
        UNIQUE KEY uq_inventory_storage_name (storage_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed defaults once — the UNIQUE KEY keeps this idempotent.
    await db.query(`
      INSERT IGNORE INTO inventory_units (unit_name, unit_group) VALUES
        ('kg','Weight'), ('g','Weight'), ('lb','Weight'), ('oz','Weight'),
        ('L','Volume'), ('mL','Volume'), ('cup','Volume'), ('tbsp','Volume'),
        ('tsp','Volume'), ('gal','Volume'),
        ('pcs','Count'), ('sachet','Count'), ('can','Count'), ('bottle','Count'),
        ('box','Count'), ('tray','Count'), ('dozen','Count'), ('bunch','Count'),
        ('head','Count'), ('slice','Count'), ('stick','Count'), ('roll','Count'),
        ('bag','Count'), ('set','Count');
    `);
    await db.query(`
      INSERT IGNORE INTO inventory_storage_locations (storage_name) VALUES
        ('Dry Pantry'), ('Fridge'), ('Freezer');
    `);
  },

  getUnits: async () => {
    await Inventory.ensureOptionTables();
    const [rows] = await db.query(
      "SELECT unit_name AS value, unit_name AS label, unit_group AS grp FROM inventory_units ORDER BY unit_group, unit_name",
    );
    return rows;
  },

  addUnit: async (unitName, unitGroup = "Other") => {
    await Inventory.ensureOptionTables();
    const name = String(unitName || "").trim();
    if (!name) throw new Error("Unit name is required.");
    try {
      await db.execute(
        "INSERT IGNORE INTO inventory_units (unit_name, unit_group) VALUES (?, ?)",
        [name, String(unitGroup || "Other").trim() || "Other"],
      );
    } catch (err) {
      throw err;
    }
    return name;
  },

  deleteUnit: async (unitName) => {
    const [result] = await db.execute(
      "DELETE FROM inventory_units WHERE unit_name = ?",
      [unitName],
    );
    return result.affectedRows > 0;
  },

  getStorageLocations: async () => {
    await Inventory.ensureOptionTables();
    const [rows] = await db.query(
      "SELECT storage_name AS value, storage_name AS label FROM inventory_storage_locations ORDER BY storage_name",
    );
    return rows;
  },

  addStorageLocation: async (storageName) => {
    await Inventory.ensureOptionTables();
    const name = String(storageName || "").trim();
    if (!name) throw new Error("Storage location name is required.");
    await db.execute(
      "INSERT IGNORE INTO inventory_storage_locations (storage_name) VALUES (?)",
      [name],
    );
    return name;
  },

  deleteStorageLocation: async (storageName) => {
    const [result] = await db.execute(
      "DELETE FROM inventory_storage_locations WHERE storage_name = ?",
      [storageName],
    );
    return result.affectedRows > 0;
  },

  // ==================== DISH LINKS FOR AN EXISTING ITEM ====================
  // Same relationship the "receive stock" flow creates, but managed after the
  // fact from the dedicated Link Dishes modal.
  getDishLinks: async (inventoryId) => {
    const sql = `
      SELECT r.recipe_id, r.item_id, r.quantity_required, m.menu_name AS name
      FROM menu_item_ingredients r
      JOIN menu_items m ON m.item_id = r.item_id
      WHERE r.inventory_id = ?
      ORDER BY m.menu_name ASC
    `;
    const [rows] = await db.execute(sql, [inventoryId]);
    return rows;
  },

  addDishLink: async (inventoryId, itemId, quantityRequired) => {
    const qty = Number(quantityRequired);
    if (!inventoryId || !itemId || !Number.isFinite(qty) || qty <= 0) {
      throw new Error("A dish and a positive quantity per serving are required.");
    }
    // Prevent duplicates: update the quantity instead of failing outright.
    const [existing] = await db.execute(
      "SELECT recipe_id FROM menu_item_ingredients WHERE item_id = ? AND inventory_id = ?",
      [itemId, inventoryId],
    );
    if (existing.length > 0) {
      await db.execute(
        "UPDATE menu_item_ingredients SET quantity_required = ? WHERE recipe_id = ?",
        [qty, existing[0].recipe_id],
      );
      return { updated: true, recipe_id: existing[0].recipe_id };
    }
    const [result] = await db.execute(
      "INSERT INTO menu_item_ingredients (item_id, inventory_id, quantity_required) VALUES (?, ?, ?)",
      [itemId, inventoryId, qty],
    );
    return { updated: false, recipe_id: result.insertId };
  },

  removeDishLink: async (inventoryId, itemId) => {
    const [result] = await db.execute(
      "DELETE FROM menu_item_ingredients WHERE item_id = ? AND inventory_id = ?",
      [itemId, inventoryId],
    );
    return result.affectedRows > 0;
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

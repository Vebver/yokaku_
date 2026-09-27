const db = require("../config/db");

const Product = {
  create: async (data) => {
    const sql = `
      INSERT INTO menu_items 
      (category_id, menu_name, description, price, image_url, is_available, is_featured, local_path) 
      VALUES (?, ?, ?, ?, ?, ?, ?,?)
    `;
    const values = [
      data.category_id,
      data.menu_name,
      data.description,
      data.price,
      data.image_url,
      data.is_available,
      data.is_featured,
      data.local_path,
    ];
    const [result] = await db.execute(sql, values);
    return { item_id: result.insertId, ...data };
  },

  delete: async (id) => {
    const sql = "DELETE FROM menu_items WHERE item_id = ?";
    await db.execute(sql, [id]);
    return true;
  },
  update: async (id, data) => {
    // 1. Safe fallbacks for potential undefined fields
    const clean_name = data.name ?? data.menu_name ?? null; // Accepts both "name" and "menu_name"
    const clean_description = data.description ?? null;     // Falls back to NULL instead of undefined

    const clean_category = parseInt(data.category_id) || null;
    const clean_price = parseFloat(data.price) || 0.0;
    const clean_available = parseInt(data.is_available) === 1 ? 1 : 0;
    const clean_featured = parseInt(data.is_featured) === 1 ? 1 : 0;

    let sql;
    let values;

    if (data.image_url) {
      // If a new image was uploaded, we update the paths too
      const clean_image_url = data.image_url ?? null;
      const clean_local_path = data.local_path ?? null;

      sql = `
        UPDATE menu_items 
        SET category_id=?, menu_name=?, description=?, price=?, image_url=?, is_available=?, is_featured=?, local_path=?
        WHERE item_id=?`;
      values = [
        clean_category,
        clean_name,          // Using safe clean_name
        clean_description,   // Using safe clean_description
        clean_price,
        clean_image_url,
        clean_available,
        clean_featured,
        clean_local_path,
        id,
      ];
    } else {
      // If no new image was uploaded, we ONLY update the text/status fields
      sql = `
        UPDATE menu_items 
        SET category_id=?, menu_name=?, description=?, price=?, is_available=?, is_featured=? 
        WHERE item_id=?`;
      values = [
        clean_category,
        clean_name,          // Using safe clean_name
        clean_description,   // Using safe clean_description
        clean_price,
        clean_available,
        clean_featured,
        id,
      ];
    }

    const [result] = await db.execute(sql, values);
    return result;
  },
  getAll: async () => {
    // A menu item is sellable only when NONE of its linked raw materials are
    // expired or out of stock. A single bad ingredient blocks the whole item.
    const sql = `
      SELECT
        menu_items.*,
        categories.category_name,
        (
          SELECT COUNT(*)
          FROM menu_item_ingredients r
          JOIN inventory i ON i.inventory_id = r.inventory_id
          WHERE r.item_id = menu_items.item_id
            AND (
              i.quantity <= 0
              OR (i.expiry_date IS NOT NULL AND i.expiry_date < CURDATE())
            )
        ) AS blocked_ingredient_count
      FROM menu_items
      LEFT JOIN categories ON menu_items.category_id = categories.category_id
    `;
    const [rows] = await db.query(sql);
    return rows.map((row) => {
      const blocked = Number(row.blocked_ingredient_count) || 0;
      return {
        ...row,
        is_stock_available: blocked === 0,
        availability_reason: blocked === 0 ? null : "Raw materials expired or out of stock",
      };
    });
  },

  getFeatured: async () => {
    const sql = `
    SELECT 
      item_id AS id,
      menu_name, 
      description, 
      price, 
      image_url,
      local_path 
    FROM menu_items 
    WHERE is_featured = 1 AND is_available = 1
  `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  updateFeatureStatus: async (id, is_featured) => {
    const query = "UPDATE menu_items SET is_featured = ? WHERE item_id = ?";
    const [result] = await db.execute(query, [is_featured, id]);
    return result;
  },
  getIngredients: async (itemId) => {
    const sql = `
      SELECT r.*, i.item_name, i.unit 
      FROM menu_item_ingredients r 
      JOIN inventory i ON r.inventory_id = i.inventory_id 
      WHERE r.item_id = ?`;
    const [rows] = await db.execute(sql, [itemId]);
    return rows;
  },
  addIngredient: async (data) => {
    const { item_id, inventory_id, quantity_required } = data;
    const sql = `
      INSERT INTO menu_item_ingredients 
      (item_id, inventory_id, quantity_required) 
      VALUES (?, ?, ?)`;
    const [result] = await db.execute(sql, [
      item_id,
      inventory_id,
      quantity_required,
    ]);
    return result.insertId;
  },
  // Which menu items already have at least one raw material linked.
  // Returned in ONE query so the UI does not need a request per dish.
  getItemsWithRecipes: async () => {
    const sql = `
      SELECT DISTINCT item_id
      FROM menu_item_ingredients
    `;
    const [rows] = await db.execute(sql);
    return rows.map((r) => Number(r.item_id));
  },
  // Create a dish recipe by linking several raw materials in one call.
  // Used by the seeding script and the "new inventory item" form so staff can
  // define a recipe at the moment they stock an item.
  linkMany: async (links, conn = db) => {
    if (!Array.isArray(links) || links.length === 0) return 0;

    const values = links
      .filter(
        (l) =>
          l &&
          l.item_id &&
          l.inventory_id &&
          Number(l.quantity_required) > 0,
      )
      .map(() => "(?, ?, ?)");

    if (values.length === 0) return 0;

    const params = links
      .filter(
        (l) =>
          l &&
          l.item_id &&
          l.inventory_id &&
          Number(l.quantity_required) > 0,
      )
      .flatMap((l) => [
        l.item_id,
        l.inventory_id,
        Number(l.quantity_required),
      ]);

    const sql = `INSERT INTO menu_item_ingredients
                   (item_id, inventory_id, quantity_required)
                   VALUES ${values.join(", ")}`;

    const [result] = await conn.execute(sql, params);
    return result.affectedRows;
  },
  removeIngredient: async (recipeId) => {
    const sql = "DELETE FROM menu_item_ingredients WHERE recipe_id = ?";
    const [result] = await db.execute(sql, [recipeId]);
    return result.affectedRows > 0;
  },
};

module.exports = Product;

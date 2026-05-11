const db = require("../config/db");

const Product = {
  create: async (data) => {
    const sql = `
      INSERT INTO menu_items 
      (category_id, name, description, price, image_url, is_available, is_featured, local_path) 
      VALUES (?, ?, ?, ?, ?, ?, ?,?)
    `;
    const values = [
      data.category_id,
      data.name,
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
    // --- TINY IMPROVEMENT: DATA CLEANING ---
    // Ensure numbers are actually numbers before sending to SQL
    const clean_category = parseInt(data.category_id);
    const clean_price = parseFloat(data.price) || 0.0;
    const clean_available = parseInt(data.is_available) === 1 ? 1 : 0;
    const clean_featured = parseInt(data.is_featured) === 1 ? 1 : 0;

    let sql;
    let values;

    if (data.image_url) {
      // If a new image was uploaded, we update the paths too
      sql = `
        UPDATE menu_items 
        SET category_id=?, name=?, description=?, price=?, image_url=?, is_available=?, is_featured=?, local_path=?
        WHERE item_id=?`;
      values = [
        clean_category,
        data.name,
        data.description,
        clean_price,
        data.image_url,
        clean_available,
        clean_featured,
        data.local_path,
        id,
      ];
    } else {
      // If no new image was uploaded, we ONLY update the text/status fields
      sql = `
        UPDATE menu_items 
        SET category_id=?, name=?, description=?, price=?, is_available=?, is_featured=? 
        WHERE item_id=?`;
      values = [
        clean_category,
        data.name,
        data.description,
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
    const sql = `
      SELECT 
        menu_items.*, 
        categories.name AS category_name 
      FROM menu_items 
      LEFT JOIN categories ON menu_items.category_id = categories.category_id
    `;
    const [rows] = await db.query(sql);
    return rows;
  },

  getFeatured: async () => {
    const sql = `
    SELECT 
      item_id AS id,
      name, 
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
  removeIngredient: async (recipeId) => {
    const sql = "DELETE FROM menu_item_ingredients WHERE recipe_id = ?";
    const [result] = await db.execute(sql, [recipeId]);
    return result.affectedRows > 0;
  },
};

module.exports = Product;

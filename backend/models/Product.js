const db = require("../config/db");

const Product = {
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
      image_url 
    FROM menu_items 
    WHERE is_featured = 1 AND is_available = 1
  `;
  const [rows] = await db.execute(sql);
  return rows;
},

  create: async (data) => {
    const sql = `
      INSERT INTO menu_items 
      (category_id, name, description, price, image_url, is_available, is_featured) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.category_id,
      data.name,
      data.description,
      data.price,
      data.image_url,
      data.is_available,
      data.is_featured,
    ];
    const [result] = await db.execute(sql, values);
    return { item_id: result.insertId, ...data };
  },

  delete: async (id) => {
    const sql = "DELETE FROM menu_items WHERE item_id = ?";
    await db.execute(sql, [id]);
    return true;
  },
  updateFeatureStatus: async (id, is_featured) => {
    const query = "UPDATE menu_items SET is_featured = ? WHERE item_id = ?";
    const [result] = await db.execute(query, [is_featured, id]);
    return result;
  },
};

module.exports = Product;

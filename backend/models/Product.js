const db = require('../config/db'); 

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

  create: async (data) => {
     const sql = `
      INSERT INTO menu_items 
      (name, description, price, category_id, image_url, is_available) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.name, 
      data.description, 
      data.price, 
      data.category_id, 
      data.image_url, 
      data.is_available
    ];
    const [result] = await db.execute(sql, values);
    return { item_id: result.insertId, ...data };
  },

  delete: async (id) => {
   const sql = 'DELETE FROM menu_items WHERE item_id = ?';
    await db.execute(sql, [id]);
    return true;
  },
};

// MUST BE THIS:
module.exports = Product;
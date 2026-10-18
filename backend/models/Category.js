const db = require('../config/db'); // Check your path to the db config

const Category = {
  getAll: async () => {
    const sql = `
      SELECT 
        category_id, 
        category_name,
        description
      FROM categories
    `;
    const [rows] = await db.query(sql);
    return rows;
  },
  
  create: async (data) => {
    const sql = 'INSERT INTO categories (category_name, description) VALUES (?, ?)';
    const values = [categoryName, description].map((value) => value ?? null);
    const [result] = await db.execute(sql, values);
    return {
      category_id: result.insertId,
      category_name: categoryName,
      description,
    };
  },

  delete: async (id) => {
    await db.execute('DELETE FROM categories WHERE category_id = ?', [id]);
    return true;
  }
};

module.exports = Category;
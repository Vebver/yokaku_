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
    const [result] = await db.execute(sql, [data.name, data.description]);
    return { category_id: result.insertId, ...data };
  },

  delete: async (id) => {
    await db.execute('DELETE FROM categories WHERE category_id = ?', [id]);
    return true;
  }
};

module.exports = Category;
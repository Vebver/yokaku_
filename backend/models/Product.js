const pool = require('../config/db'); 

const Product = {
  getAll: async () => {
    const [rows] = await pool.query("SELECT * FROM inventory");
    return rows;
  },

  create: async (data) => {
    const { item_name, quantity, unit, reorder_level, last_updated } = data;
    const query = `INSERT INTO inventory (item_name, quantity, unit, reorder_level, last_updated) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await pool.query(query, [item_name, quantity, unit, reorder_level, last_updated]);
    return { inventory_id: result.insertId, ...data };
  },

  delete: async (inventory_id) => {
    const [result] = await pool.query("DELETE FROM inventory WHERE inventory_id = ?", [inventory_id]);
    return result;
  },
};

// MUST BE THIS:
module.exports = Product;
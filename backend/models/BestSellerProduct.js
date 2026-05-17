const db = require('../config/db');

const BestSellerProduct = {
  // 1. Get Top 5 Sellers
  GetTopSellers: async () => {
    const [rows] = await db.execute(`
      SELECT 
        m.name, 
        SUM(k.quantity) as total_sold, 
        SUM(k.quantity * m.price) as total_revenue
      FROM kiosk_orders k
      JOIN menu_items m ON k.item_id = m.item_id
      WHERE k.kitchen_status IN ('served', 'completed')
      GROUP BY m.item_id, m.name
      ORDER BY total_sold DESC
    `);
    return rows;
  },

  // 2. Get 5 Slowest Moving Items
  GetSlowMoving: async () => {
    const [rows] = await db.execute(`
      SELECT 
        m.name, 
        IFNULL(SUM(k.quantity), 0) as total_sold
      FROM menu_items m
      LEFT JOIN kiosk_orders k ON m.item_id = k.item_id
      GROUP BY m.item_id, m.name
      ORDER BY total_sold ASC
    `);
    return rows;
  }
};

module.exports = BestSellerProduct;
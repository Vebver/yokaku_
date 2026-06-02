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
        IFNULL(SUM(k.quantity), 0) as total_sold,
        IFNULL(SUM(k.quantity * m.price), 0) as total_revenue
      FROM menu_items m
      LEFT JOIN kiosk_orders k ON m.item_id = k.item_id
      GROUP BY m.item_id, m.name
      ORDER BY total_sold ASC
    `);
    return rows;
  },

  // 3. Get Overall Performance Summary (Total Revenue & Total Items Sold)
  GetPerformanceSummary: async () => {
    const [rows] = await db.execute(`
      SELECT 
        IFNULL(SUM(k.quantity), 0) as total_items_sold, 
        IFNULL(SUM(k.quantity * m.price), 0) as total_revenue
      FROM kiosk_orders k
      JOIN menu_items m ON k.item_id = m.item_id
      WHERE k.kitchen_status IN ('served', 'completed')
    `);
    return rows[0]; // Returns a single object { total_items_sold: X, total_revenue: Y }
  }
};

module.exports = BestSellerProduct;
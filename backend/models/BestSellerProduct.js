const db = require('../config/db');

const ReportModel = {
  // Get Top 5 Sellers
  GetTopSellers: async () => {
    const [rows] = await db.execute(`
      SELECT 
        p.name, 
        SUM(oi.quantity) as total_sold, 
        SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `);
    return rows; // MUST return the data
  },

  // Get Slow Moving Items
  GetSlowMoving: async () => {
    const [rows] = await db.execute(`
      SELECT 
        p.name, 
        IFNULL(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id, p.name
      ORDER BY total_sold ASC
      LIMIT 5
    `);
    return rows;
  }
};

module.exports = ReportModel; // Correct export
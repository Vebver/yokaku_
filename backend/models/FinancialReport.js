const db = require('../config/db');

const FinancialReport = {
  // Helper to get combined revenue from Payments and Kiosk Orders
  // We JOIN menu_items to get the price for Kiosk Orders
  getMonthlyTrend: async () => {
    const query = `
      SELECT 
          DATE_FORMAT(date_col, '%b %Y') as label,
          COALESCE(SUM(amount), 0) as value
      FROM (
          /* 1. Revenue from Reservation Payments */
          SELECT paid_at as date_col, amount FROM payments WHERE payment_status = 'verified'
          
          UNION ALL
          
          /* 2. Revenue from Kiosk Orders (Calculated: Qty * Price) */
          SELECT ko.created_at as date_col, (ko.quantity * m.price) as amount 
          FROM kiosk_orders ko
          JOIN menu_items m ON ko.item_id = m.item_id
          WHERE ko.reservation_id = 'WALKIN'
      ) as combined_revenue
      GROUP BY YEAR(date_col), MONTH(date_col)
      ORDER BY YEAR(date_col) DESC, MONTH(date_col) DESC
      LIMIT 6`;
    const [rows] = await db.execute(query);
    return rows.reverse();
  },

  getFinancialStats: async () => {
    const query = `
      SELECT 
          COALESCE(SUM(CASE WHEN DATE(date_col) = CURDATE() THEN amount ELSE 0 END), 0) as daily_revenue,
          COALESCE(SUM(CASE WHEN date_col >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN amount ELSE 0 END), 0) as weekly_revenue,
          COALESCE(SUM(CASE WHEN MONTH(date_col) = MONTH(CURDATE()) AND YEAR(date_col) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) as monthly_revenue,
          COUNT(*) as total_orders,
          COALESCE(AVG(amount), 0) as aov
      FROM (
          SELECT paid_at as date_col, amount FROM payments WHERE payment_status = 'verified'
          UNION ALL
          SELECT ko.created_at as date_col, (ko.quantity * m.price) as amount 
          FROM kiosk_orders ko
          JOIN menu_items m ON ko.item_id = m.item_id
          WHERE ko.reservation_id = 'WALKIN'
      ) as all_transactions`;
    const [rows] = await db.execute(query);
    return rows[0];
  },

  getPaymentMethods: async () => {
    const query = `
      SELECT label, COALESCE(SUM(amount), 0) as value
      FROM (
          /* Payments table has a payment_method column */
          SELECT IFNULL(payment_method, 'Online') as label, amount FROM payments WHERE payment_status = 'verified'
          
          UNION ALL
          
          /* Kiosk orders usually default to Cash if not specified */
          SELECT 'Cash' as label, (ko.quantity * m.price) as amount 
          FROM kiosk_orders ko
          JOIN menu_items m ON ko.item_id = m.item_id
          WHERE ko.reservation_id = 'WALKIN'
      ) as payments_combined
      GROUP BY label`;
    const [rows] = await db.execute(query);
    return rows;
  },

  getRevenueSources: async () => {
    const query = `
      SELECT label, COALESCE(SUM(amount), 0) as value
      FROM (
          SELECT 'Reservation' as label, amount FROM payments WHERE payment_status = 'verified'
          
          UNION ALL
          
          SELECT 'Walk-in' as label, (ko.quantity * m.price) as amount 
          FROM kiosk_orders ko
          JOIN menu_items m ON ko.item_id = m.item_id
          WHERE ko.reservation_id = 'WALKIN'
      ) as src
      GROUP BY label`;
    const [rows] = await db.execute(query);
    return rows;
  }
};

module.exports = FinancialReport;
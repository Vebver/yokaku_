// models/FinancialReport.js
const db = require("../config/db");

const FinancialReport = {
  getFinancialStats: async () => {
    // We remove all "Today" filters. This will sum EVERY verified transaction.
    const query = `
      SELECT 
          CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) as daily_revenue,
          CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) as monthly_revenue,
          COUNT(*) as total_orders,
          CAST(COALESCE(AVG(amount), 0) AS DECIMAL(10,2)) as aov
      FROM (
          SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
          UNION ALL
          SELECT ko.created_at as d, (ko.quantity * m.price) as amount 
          FROM kiosk_orders ko 
          JOIN menu_items m ON ko.item_id = m.item_id
          WHERE (ko.reservation_id = 'WALKIN' OR ko.reservation_id IS NULL)
      ) as all_tx`;

    const [rows] = await db.execute(query);
    return rows[0];
  },

  getMonthlyTrend: async () => {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(d, '%b %Y') as label, SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT created_at as d, (ko.quantity * m.price) as amount 
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
      ) as combined GROUP BY label LIMIT 6`);
    return rows;
  },

  getPaymentMethods: async () => {
    const [rows] = await db.execute(`
      SELECT label, SUM(amount) as value FROM (
        SELECT payment_method as label, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT 'Cash' as label, (ko.quantity * m.price) as amount 
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
      ) as combined GROUP BY label`);
    return rows;
  },

  getRevenueSources: async () => {
    const [rows] = await db.execute(`
      SELECT label, SUM(amount) as value FROM (
        SELECT 'Reservation' as label, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT 'Walk-in' as label, (ko.quantity * m.price) as amount 
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
      ) as combined GROUP BY label`);
    return rows;
  }
};

module.exports = FinancialReport;
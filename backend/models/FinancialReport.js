// models/FinancialReport.js
const db = require("../config/db");

const FinancialReport = {
  // 1. Fetches daily/monthly overview KPIs, total counts, and averages
  getFinancialStats: async () => {
    const query = `
      SELECT 
          CAST(COALESCE(SUM(CASE WHEN DATE(d) = CURDATE() THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as today_revenue,
          CAST(COALESCE(SUM(CASE WHEN MONTH(d) = MONTH(CURDATE()) AND YEAR(d) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as monthly_revenue,
          COUNT(*) as total_orders,
          CAST(COALESCE(AVG(amount), 0) AS DECIMAL(10,2)) as aov
      FROM (
          SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
          UNION ALL
          SELECT ko.created_at as d, (ko.quantity * m.price) as amount 
          FROM kiosk_orders ko 
          JOIN menu_items m ON ko.item_id = m.item_id
          WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
      ) as all_tx`;
    const [rows] = await db.execute(query);
    return rows[0];
  },

  // 2. Fetches monthly values for the Monthly Tab & Table
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

  // 3. Fetches daily values for the Weekly Tab & Table
  getWeeklyProfitTrend: async (days = 13) => {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(d, '%b %e') as label, SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
      ) as combined
      WHERE d >= DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)
      GROUP BY DATE(d)
      ORDER BY DATE(d) ASC
      LIMIT ${days}
    `);
    return rows;
  },

  // 4. Fetches yearly values for the Yearly Tab & Table
  getYearlyProfitTrend: async (years = 5) => {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(d, '%Y') as label, SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
      ) as combined
      WHERE d >= DATE_SUB(CURDATE(), INTERVAL ${years - 1} YEAR)
      GROUP BY YEAR(d)
      ORDER BY YEAR(d) ASC
      LIMIT ${years}
    `);
    return rows;
  },
};

module.exports = FinancialReport;
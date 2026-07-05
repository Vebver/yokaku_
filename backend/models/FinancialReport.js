// models/FinancialReport.js
const db = require("../config/db");

const FinancialReport = {
  // 1. Parameterized with todayStr to prevent server timezone shifting
  getFinancialStats: async (todayStr) => {
    const query = `
      SELECT 
          CAST(COALESCE(SUM(CASE WHEN DATE(d) = ? THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as today_revenue,
          CAST(COALESCE(SUM(CASE WHEN d >= DATE_SUB(?, INTERVAL 6 DAY) THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as weekly_revenue,
          CAST(COALESCE(SUM(CASE WHEN MONTH(d) = MONTH(?) AND YEAR(d) = YEAR(?) THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as monthly_revenue,
          CAST(COALESCE(SUM(CASE WHEN YEAR(d) = YEAR(?) THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as yearly_revenue,
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
    const [rows] = await db.execute(query, [todayStr, todayStr, todayStr, todayStr, todayStr]);
    return rows[0];
  },

  // 2. Used in Reports
  getMonthlyTrend: async () => {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(d, '%b %Y') as label, SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount 
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
        WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
      ) as combined GROUP BY label LIMIT 6`);
    return rows;
  },

  // 3. Restored: Used in adminController.getFinancialOverview
  // getRevenueSources: async () => {
  //   const [rows] = await db.execute(`
  //     SELECT label, SUM(amount) as value FROM (
  //       SELECT 'Reservation' as label, amount FROM payments WHERE payment_status = 'verified'
  //       UNION ALL
  //       SELECT 'Walk-in' as label, (ko.quantity * m.price) as amount 
  //       FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
  //       WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
  //     ) as combined GROUP BY label`);
  //   return rows;
  // },

  // 4. Parameterized with todayStr
  getRecentTrend: async (todayStr) => {
    const query = `
      SELECT DATE_FORMAT(d, '%a') as label, SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount 
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
        WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
      ) as combined 
      WHERE d >= DATE_SUB(?, INTERVAL 6 DAY)
      GROUP BY DATE(d), label
      ORDER BY DATE(d) ASC`;
    const [rows] = await db.execute(query, [todayStr]);
    return rows;
  },

  // 5. Parameterized with todayStr
  getWeeklyProfitTrend: async (todayStr, days = 13) => {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(d, '%b %e') as label, SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
        WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
      ) as combined
      WHERE d >= DATE_SUB(?, INTERVAL ${days - 1} DAY)
      GROUP BY DATE(d)
      ORDER BY DATE(d) ASC
      LIMIT ${days}
    `, [todayStr]);
    return rows;
  },

  // 6. Parameterized with todayStr
  getYearlyProfitTrend: async (todayStr, years = 5) => {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(d, '%Y') as label, SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
        WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
      ) as combined
      WHERE d >= DATE_SUB(?, INTERVAL ${years - 1} YEAR)
      GROUP BY YEAR(d)
      ORDER BY YEAR(d) ASC
      LIMIT ${years}
    `, [todayStr]);
    return rows;
  },

  // 7. RESTORED & Parameterized: Used in PDF Exporter
  getProfitWeekly: async (todayStr) => {
    const [rows] = await db.execute(`
      SELECT SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
        WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
      ) as combined
      WHERE d >= DATE_SUB(?, INTERVAL 6 DAY)
    `, [todayStr]);
    return rows[0]?.value ? Number(rows[0].value) : 0;
  },

  // 8. RESTORED & Parameterized: Used in PDF Exporter
  getProfitMonthly: async (todayStr) => {
    const [rows] = await db.execute(`
      SELECT SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
        WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
      ) as combined
      WHERE MONTH(d) = MONTH(?) AND YEAR(d) = YEAR(?)
    `, [todayStr, todayStr]);
    return rows[0]?.value ? Number(rows[0].value) : 0;
  },

  // 9. RESTORED & Parameterized: Used in PDF Exporter
  getProfitYearly: async (todayStr) => {
    const [rows] = await db.execute(`
      SELECT SUM(amount) as value
      FROM (
        SELECT paid_at as d, amount FROM payments WHERE payment_status = 'verified'
        UNION ALL
        SELECT ko.created_at as d, (ko.quantity * m.price) as amount
        FROM kiosk_orders ko JOIN menu_items m ON ko.item_id = m.item_id
        WHERE (ko.reservation_id LIKE 'WALK%' OR ko.reservation_id IS NULL)
      ) as combined
      WHERE YEAR(d) = YEAR(?)
    `, [todayStr]);
    return rows[0]?.value ? Number(rows[0].value) : 0;
  },
};

module.exports = FinancialReport;
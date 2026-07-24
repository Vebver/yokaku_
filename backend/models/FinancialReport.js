const db = require("../config/db");

const FinancialReport = {
  // Parameterized with todayStr to prevent server timezone shifting
  getFinancialStats: async (todayStr) => {
    const query = `
      SELECT 
          CAST(COALESCE(SUM(CASE WHEN DATE(paid_at) = ? THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as today_revenue,
          CAST(COALESCE(SUM(CASE WHEN paid_at >= DATE_SUB(?, INTERVAL 6 DAY) THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as weekly_revenue,
          CAST(COALESCE(SUM(CASE WHEN MONTH(paid_at) = MONTH(?) AND YEAR(paid_at) = YEAR(?) THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as monthly_revenue,
          CAST(COALESCE(SUM(CASE WHEN YEAR(paid_at) = YEAR(?) THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as yearly_revenue,
          COUNT(*) as total_orders,
          CAST(COALESCE(AVG(amount), 0) AS DECIMAL(10,2)) as aov
      FROM payments
      WHERE payment_status = 'verified'`;
    const [rows] = await db.execute(query, [
      todayStr,
      todayStr,
      todayStr,
      todayStr,
      todayStr,
    ]);
    return rows[0];
  },

  // Used in Reports Dashboard
  getMonthlyTrend: async () => {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(paid_at, '%b %Y') as label, SUM(amount) as value
      FROM payments 
      WHERE payment_status = 'verified'
      GROUP BY label 
      LIMIT 6`);
    return rows;
  },

  // Parameterized with todayStr
  getRecentTrend: async (todayStr) => {
    const query = `
      SELECT DATE_FORMAT(paid_at, '%a') as label, SUM(amount) as value
      FROM payments
      WHERE payment_status = 'verified' 
        AND paid_at >= DATE_SUB(?, INTERVAL 6 DAY)
      GROUP BY DATE(paid_at), label
      ORDER BY DATE(paid_at) ASC`;
    const [rows] = await db.execute(query, [todayStr]);
    return rows;
  },

  getWeeklyProfitTrend: async (todayStr, days = 13) => {
    const [rows] = await db.execute(
      `
      SELECT DATE_FORMAT(paid_at, '%b %e') as label, SUM(amount) as value
      FROM payments
      WHERE payment_status = 'verified' 
        AND paid_at >= DATE_SUB(?, INTERVAL ${days - 1} DAY)
      GROUP BY DATE(paid_at) 
      ORDER BY DATE(paid_at) ASC 
      LIMIT ${days}
    `,
      [todayStr],
    );
    return rows;
  },

  getYearlyProfitTrend: async (todayStr, years = 5) => {
    const [rows] = await db.execute(
      `
      SELECT DATE_FORMAT(paid_at, '%Y') as label, SUM(amount) as value
      FROM payments
      WHERE payment_status = 'verified' 
        AND paid_at >= DATE_SUB(?, INTERVAL ${years - 1} YEAR)
      GROUP BY YEAR(paid_at) 
      ORDER BY YEAR(paid_at) ASC 
      LIMIT ${years}
    `,
      [todayStr],
    );
    return rows;
  },

  getProfitWeekly: async (todayStr) => {
    const [rows] = await db.execute(
      `
      SELECT SUM(amount) as value
      FROM payments
      WHERE payment_status = 'verified' 
        AND paid_at >= DATE_SUB(?, INTERVAL 6 DAY)
    `,
      [todayStr],
    );
    return rows[0]?.value ? Number(rows[0].value) : 0;
  },

  getProfitMonthly: async (todayStr) => {
    const [rows] = await db.execute(
      `
      SELECT SUM(amount) as value
      FROM payments
      WHERE payment_status = 'verified' 
        AND MONTH(paid_at) = MONTH(?) AND YEAR(paid_at) = YEAR(?)
    `,
      [todayStr, todayStr],
    );
    return rows[0]?.value ? Number(rows[0].value) : 0;
  },

  getProfitYearly: async (todayStr) => {
    const [rows] = await db.execute(
      `
      SELECT SUM(amount) as value
      FROM payments
      WHERE payment_status = 'verified' AND YEAR(paid_at) = YEAR(?)
    `,
      [todayStr],
    );
    return rows[0]?.value ? Number(rows[0].value) : 0;
  },

  // ============ PDF EXPORT SPECIFIC QUERIES ============

  getPdfStats: async (start, end) => {
    const [rows] = await db.execute(
      `
      SELECT COUNT(*) as total_orders, CAST(COALESCE(AVG(amount), 0) AS DECIMAL(10,2)) as aov
      FROM payments 
      WHERE payment_status = 'verified' 
        AND paid_at BETWEEN ? AND ?`,
      [start, end],
    );
    return rows[0];
  },

  // Daily Trend (Days) for PDF Export
  getPdfDailyTrend: async (start, end) => {
    const [rows] = await db.execute(
      `
      SELECT DATE_FORMAT(paid_at, '%b %d, %Y') as label, SUM(amount) as value
      FROM payments 
      WHERE payment_status = 'verified' 
        AND paid_at BETWEEN ? AND ? 
      GROUP BY DATE(paid_at) 
      ORDER BY DATE(paid_at) ASC`,
      [start, end],
    );
    return rows;
  },
};

module.exports = FinancialReport;
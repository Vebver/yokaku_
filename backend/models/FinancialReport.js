const db = require("../config/db");

const FinancialReport = {
  getMonthlyTrend: async () => {
    const query = `
      SELECT 
          DATE_FORMAT(clean_date, '%b %Y') as label,
          SUM(amount) as value
      FROM (
          /* Use paid_at only, since created_at doesn't exist */
          SELECT DATE(paid_at) as clean_date, CAST(amount AS DECIMAL(10,2)) as amount 
          FROM payments 
          WHERE LOWER(payment_status) = 'verified' AND paid_at IS NOT NULL
          
          UNION ALL
          
          SELECT DATE(ko.created_at) as clean_date, CAST((ko.quantity * m.price) AS DECIMAL(10,2)) as amount 
          FROM kiosk_orders ko
          JOIN menu_items m ON ko.item_id = m.item_id
          WHERE ko.reservation_id = 'WALKIN' AND ko.created_at IS NOT NULL
      ) as combined_revenue
      GROUP BY YEAR(clean_date), MONTH(clean_date), label
      ORDER BY YEAR(clean_date) ASC, MONTH(clean_date) ASC
      LIMIT 6`;

    const [rows] = await db.execute(query);
    return rows;
  },

 getFinancialStats: async () => {
  const query = `
    SELECT 
        /* 1. Daily Revenue: Money paid between the start of today and the end of today */
        CAST(COALESCE(SUM(CASE 
            WHEN date_col >= DATE_FORMAT(NOW(), '%Y-%m-%d 00:00:00') 
             AND date_col <= DATE_FORMAT(NOW(), '%Y-%m-%d 23:59:59') 
            THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as daily_revenue,

        /* 2. Monthly Revenue: Money paid within this calendar month */
        CAST(COALESCE(SUM(CASE 
            WHEN MONTH(date_col) = MONTH(NOW()) 
             AND YEAR(date_col) = YEAR(NOW()) 
            THEN amount ELSE 0 END), 0) AS DECIMAL(10,2)) as monthly_revenue,

        /* 3. Stats */
        COUNT(*) as total_orders,
        CAST(COALESCE(AVG(amount), 0) AS DECIMAL(10,2)) as aov

    FROM (
        /* Combine Payments (verified) */
        SELECT paid_at as date_col, CAST(amount AS DECIMAL(10,2)) as amount 
        FROM payments 
        WHERE LOWER(payment_status) = 'verified' AND paid_at IS NOT NULL

        UNION ALL

        /* Combine Kiosk Orders (Walk-ins) */
        SELECT created_at as date_col, CAST((ko.quantity * m.price) AS DECIMAL(10,2)) as amount 
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
  },
};

module.exports = FinancialReport;

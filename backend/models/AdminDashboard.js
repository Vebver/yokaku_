const db = require("../config/db");

const Dashboard = {
  getDashboardStats: async (req, res) => {
    try {
      // 1. Total Bookings
      const [bookingsResult] = await db.execute(
        "SELECT COUNT(*) as totalBookings FROM reservations",
      );

      // 2. Active Tables
      const [activeResult] = await db.execute(
        "SELECT COUNT(*) as activeTables FROM reservations WHERE status = 'Seated'",
      );

      // 3. Kitchen Queue
      const [queueResult] = await db.execute(
        "SELECT COUNT(*) as kitchenQueue FROM kiosk_orders WHERE kitchen_status = 'Pending'",
      );

      // 4. Total Revenue
      const [revenueResult] = await db.execute(
        "SELECT SUM(amount) as revenue FROM payments WHERE payment_status = 'verified'",
      );
      return {
        totalBookings: bookingsResult[0]?.totalBookings || 0,
        activeTables: activeResult[0]?.activeTables || 0,
        kitchenQueue: queueResult[0]?.kitchenQueue || 0,
        revenue: revenueResult[0]?.revenue || 0,
      };

      // IMPORTANT: You must send the response back to the frontend!
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      throw error;
    }
  },
  getRevenueChartData: async (req, res) => {
    try {
      const [rows] = await db.execute(`
                SELECT 
                    MONTHNAME(paid_at) as labels, 
                    SUM(amount) as data 
                FROM payments
                WHERE payment_status = 'verified'
                GROUP BY MONTH(paid_at), MONTHNAME(paid_at)
                ORDER BY MONTH(paid_at) ASC
                LIMIT 6
            `);

      const labels = rows.map((r) => r.labels);
      const data = rows.map((r) => parseFloat(r.data) || 0);

      return { labels, data };
    } catch (error) {
      console.error("Revenue Chart Error:", error);
      throw error;
    }
  },
};

module.exports = Dashboard;

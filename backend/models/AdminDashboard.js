const db = require("../config/db");

const Dashboard = {
  getQuickStats: async () => {
    try {
      // 1. Total Bookings (All except cancelled)
      const [bookings] = await db.execute(
        "SELECT COUNT(*) as total FROM reservations WHERE status != 'cancelled'",
      );
      const [tables] = await db.execute(
        "SELECT COUNT(*) as total FROM tables WHERE status = 'occupied' OR bridge_status = 'seated'",
      );
      // 3. Kitchen Queue (Pending orders)
      const [queue] = await db.execute(
        "SELECT COUNT(*) as total FROM kiosk_orders WHERE kitchen_status = 'pending'",
      );
      console.log("DB QuickStats Result:", {
        bookings: bookings[0].total,
        tables: tables[0].total,
        queue: queue[0].total,
      });
      return {
        totalBookings: bookings[0]?.total || 0,
        activeTables: tables[0]?.total || 0,
        kitchenQueue: queue[0]?.total || 0,
      };
    } catch (error) {
      console.error("Model Error (QuickStats):", error.message);
      return { totalBookings: 0, activeTables: 0, kitchenQueue: 0 };
    }
  },
};

module.exports = Dashboard;

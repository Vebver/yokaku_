const db = require("../config/db");

const Dashboard = {
  getQuickStats: async () => {
    try {
      // Use [rows] to safely destructure
      const [bookings] = await db.execute("SELECT COUNT(*) as total FROM reservations WHERE status != 'cancelled'");
      const [tables] = await db.execute("SELECT COUNT(*) as total FROM tables WHERE bridge_status = 'seated'");
      const [queue] = await db.execute("SELECT COUNT(*) as total FROM kiosk_orders WHERE kitchen_status = 'pending'");

      return {
        // The ?. total prevents "Cannot read property total of undefined"
        totalBookings: bookings[0]?.total || 0,
        activeTables: tables[0]?.total || 0,
        kitchenQueue: queue[0]?.total || 0,
      };
    } catch (error) {
      console.error("DATABASE ERROR IN QUICKSTATS:", error.message);
      // Return zeros instead of throwing an error to prevent 500 crash
      return { totalBookings: 0, activeTables: 0, kitchenQueue: 0 };
    }
  }
};

module.exports = Dashboard;
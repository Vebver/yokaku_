const db = require("../config/db");

const Dashboard = {
  getQuickStats: async () => {
    try {
      // 1. Total Bookings (Count all that are NOT cancelled or rejected)
      const [bookings] = await db.execute(
        "SELECT COUNT(*) as total FROM reservations WHERE LOWER(status) NOT IN ('cancelled', 'rejected', 'no-show')"
      );
      
      // 2. Tables Occupied (Fixed: Removed bridge_status)
      // Check your DB: if the column is named 'table_status', change 'status' below to 'table_status'
      const [tables] = await db.execute(
        "SELECT COUNT(*) as total FROM tables WHERE LOWER(status) IN ('occupied', 'seated', 'busy')"
      );
      
      // 3. Kitchen Queue
      const [queue] = await db.execute(
        "SELECT COUNT(*) as total FROM kiosk_orders WHERE LOWER(kitchen_status) IN ('pending', 'preparing')"
      );

      return {
        totalBookings: bookings[0]?.total || 0,
        activeTables: tables[0]?.total || 0,
        kitchenQueue: queue[0]?.total || 0,
      };
    } catch (error) {
      console.error("Dashboard Model Error:", error.message);
      // Return 0s so the frontend doesn't crash
      return { totalBookings: 0, activeTables: 0, kitchenQueue: 0 };
    }
  }
};

module.exports = Dashboard;
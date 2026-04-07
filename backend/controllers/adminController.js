const db = require('../config/db');

const adminController = {
    // 1. Get stats for the top 4 cards
    getDashboardStats: async (req, res) => {
        try {
            // Query 1: Total Bookings (How many reservations in total)
            const [bookingsResult] = await db.execute('SELECT COUNT(*) as totalBookings FROM reservations');
            
            // Query 2: Active Tables (Guests currently seated/eating)
            const [activeResult] = await db.execute("SELECT COUNT(*) as activeTables FROM reservations WHERE status = 'Seated'");
            
            // Query 3: Kitchen Queue (How many items are waiting to be cooked)
            const [queueResult] = await db.execute("SELECT COUNT(*) as kitchenQueue FROM kiosk_orders WHERE kitchen_status = 'Pending'");
            
            // Query 4: Total Revenue (Sum of Downpayments collected)
            const [revenueResult] = await db.execute("SELECT SUM(amount) as revenue FROM payments WHERE payment_status = 'verified'");

            // Send response back to React Dashboard
            res.json({
                totalBookings: bookingsResult[0].totalBookings || 0,
                activeTables: activeResult[0].activeTables || 0,
                kitchenQueue: queueResult[0].kitchenQueue || 0,
                revenue: parseFloat(revenueResult[0].revenue) || 0
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error fetching dashboard stats", error });
        }
    },

    // 2. Monthly Revenue Chart (Based on when Downpayments were created)
    getRevenueChartData: async (req, res) => {
        try {
            // Groups the total downpayment money by month name
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
            
            const labels = rows.map(r => r.labels);
            const data = rows.map(r => parseFloat(r.data) || 0);
            
            res.json({ labels, data });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error fetching chart data" });
        }
    }
};

module.exports = adminController;
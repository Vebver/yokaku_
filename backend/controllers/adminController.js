const Dashboard = require("../models/AdminDashboard");
const AccountManagement = require("../models/AccountManagement");
const TableStatus = require("../models/TableStatus");
const FinancialReport = require("../models/FinancialReport");
const { get } = require("node:http");

const adminController = {
  getDashboardStats: async (req, res) => {
    try {
      const stats = await Dashboard.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getAllUsers: async (req, res) => {
    try {
      const users = await AccountManagement.getAll();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getTodaySchedule: async (req, res) => {
  try {
    const schedule = await TableStatus.getTodaySchedule();
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},
  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // 1. FIXED VALIDATION: Added 'cashier' to the allowed list
      const allowedRoles = ["admin", "customer", "cashier"]; 
      
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ 
          error: "Invalid role. Must be 'admin', 'customer', or 'cashier'." 
        });
      }

      // 2. Update the database
      // Ensure the Model function is called correctly
      await AccountManagement.updateUserRole(userId, role);

      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Update Role Error:", error);
      res.status(500).json({ error: error.message });
    }
},
  getTable: async (req, res) => {
    try {
      const status = await TableStatus.getTableStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  addTable: async (req, res) => {
    try {
      const { table_number, capacity } = req.body;
      await TableStatus.createNewTable(table_number, capacity);
      res.status(201).json({ message: "Table created successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  Walkin: async (req, res) => {
    try {
      const { tableId } = req.params;
      const { customerName } = req.body; // Ensure this matches frontend key

      if (!customerName) {
        return res.status(400).json({ error: "Name is required" });
      }

      const result = await TableStatus.createWalkIn(tableId, customerName);
      res.json({ success: true, message: "Walk-in session created", result });
    } catch (error) {
      // THIS LOG IS CRITICAL. Look at your VS Code terminal!
      console.error("BACKEND CRASH:", error);
      res.status(500).json({ error: error.message });
    }
  },
  CheckOut: async (req, res) => {
    try {
      const { tableId } = req.params;
      const result = await TableStatus.checkoutTable(tableId);
      res.json({ message: "Checked out successfully", result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  // controllers/adminController.js
  getFinancialOverview: async (req, res) => {
    try {
      console.log("!!! API CALLED: Fetching Financial Data !!!");

      const [monthlyTrend, stats, paymentMethods, sources] = await Promise.all([
        FinancialReport.getMonthlyTrend(),
        FinancialReport.getFinancialStats(),
        FinancialReport.getPaymentMethods(),
        FinancialReport.getRevenueSources(),
      ]);

      console.log("DATABASE STATS:", stats);

      res.status(200).json({
        success: true,
        data: {
          summary: stats,
          monthlyTrend,
          paymentMethods,
          sources,
        },
      });
    } catch (error) {
      console.error("REPORT ERROR:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  resetNoShows: async (req, res) => {
  const { userId } = req.params;
  // Mark all 'no-show' reservations as 'cancelled' so they don't count towards strikes
  await db.query("UPDATE reservations SET status = 'cancelled' WHERE user_id = ? AND status = 'no-show'", [userId]);
  res.json({ message: "No-show strikes reset." });
}
};

module.exports = adminController;

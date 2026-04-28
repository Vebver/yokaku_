const Dashboard = require("../models/AdminDashboard");
const AccountManagement = require("../models/AccountManagement");
const TableStatus = require("../models/TableStatus");
const FinancialReport  = require("../models/FinancialReport")
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
  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Validate role is either 'admin' or 'customer'
      if (!["admin", "customer"].includes(role)) {
        return res
          .status(400)
          .json({ error: "Invalid role. Must be 'admin' or 'customer'." });
      }

      await AccountManagement.updateUserRole(userId, role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
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
  Walkin: async (req, res) => {
    try {
      const { tableId } = req.params;
      const result = await TableStatus.createWalkIn(
        tableId,
        req.body.customerName,
      );
      res.json({ message: "Walk-in session created", result });
    } catch (error) {
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
  getFinancialOverview: async (req, res) => {
    try {
      // Use Promise.all to run all database queries at the same time (faster)
      const [monthlyTrend, stats, paymentMethods, sources] = await Promise.all([
        FinancialReport.getMonthlyTrend(),
        FinancialReport.getFinancialStats(),
        FinancialReport.getPaymentMethods(),
        FinancialReport.getRevenueSources()
      ]);

      res.status(200).json({
        success: true,
        data: {
          monthlyTrend,
          summary: stats,
          paymentMethods,
          sources
        }
      });
    } catch (error) {
      console.error("Financial Report Controller Error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate financial reports" 
      });
    }
  },
};

module.exports = adminController;

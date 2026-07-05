const Dashboard = require("../models/AdminDashboard");
const AccountManagement = require("../models/AccountManagement");
const TableStatus = require("../models/TableStatus");
const FinancialReport = require("../models/FinancialReport");
const Reservation = require("../models/Reservation");
const { logActivity } = require("../utils/logger");
const { get } = require("node:http");
const db = require("../config/db");

const adminController = {
  getDashboardStats: async (req, res) => {
    try {
      // Fetch the exact current date in Philippine Time (YYYY-MM-DD)
      const todayStr = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      });

      const [finStats, trendData, quickStats] = await Promise.all([
        FinancialReport.getFinancialStats(todayStr), // Passed todayStr
        FinancialReport.getRecentTrend(todayStr), // Passed todayStr
        Dashboard.getQuickStats(),
      ]);

      // 1. Process Trend Data
      const revenueTrend = trendData
        ? trendData.map((t) => Number(t.value || 0))
        : [0, 0, 0, 0, 0, 0, 0];
      const trendLabels = trendData
        ? trendData.map((t) => t.label || "")
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      const calculatedWeeklyTotal = revenueTrend.reduce((a, b) => a + b, 0);

      res.json({
        totalBookings: quickStats.totalBookings,
        activeTables: quickStats.activeTables,
        kitchenQueue: quickStats.kitchenQueue,

        weeklyRevenue: calculatedWeeklyTotal,
        monthlyRevenue: Number(finStats?.monthly_revenue || 0),
        todayRevenue: Number(finStats?.today_revenue || 0),
        avgOrder: Number(finStats?.aov || 0),
        totalOrders: Number(finStats?.total_orders || 0),

        revenueTrend: revenueTrend,
        trendLabels: trendLabels,
      });
    } catch (error) {
      console.error("DASHBOARD STATS ERROR:", error);
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
          error: "Invalid role. Must be 'admin', 'customer', or 'cashier'.",
        });
      }

      // 2. Update the database
      // Ensure the Model function is called correctly
      await AccountManagement.updateUserRole(userId, role);

      await logActivity(
        req.user?.userId || null,
        "UPDATE_USER_ROLE",
        userId,
        { role },
        req,
      );

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
      await logActivity(
        req.user?.userId || null,
        "ADD_TABLE",
        table_number,
        { capacity },
        req,
      );
      res.status(201).json({ message: "Table created successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  deleteTable: async (req, res) => {
    try {
      const { tableId } = req.params;
      const result = await TableStatus.deleteTable(tableId);
      await logActivity(
        req.user?.userId || null,
        "ADD_TABLE",
        table_number,
        { capacity },
        req,
      );
      res.json({ message: "Table deleted successfully", result });
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
      await logActivity(
        req.user?.userId || null,
        "CREATE_WALKIN_SESSION",
        tableId,
        { customer_name: customerName },
        req
      );

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
      await logActivity(
        req.user?.userId || null,
        "CREATE_WALKIN_SESSION",
        tableId,
        { customer_name: customerName },
        req
      );

      res.json({ message: "Checked out successfully", result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  // controllers/adminController.js
  // Inside controllers/adminController.js

  // getFinancialOverview: async (req, res) => {
  //   try {
  //     // 1. Calculate the timezone-safe local date string
  //     const todayStr = new Date().toLocaleDateString("en-CA", {
  //       timeZone: "Asia/Manila",
  //     });

  //     // 2. Fetch all values, passing todayStr down
  //     const [monthlyTrend, stats, sources] = await Promise.all([
  //       FinancialReport.getMonthlyTrend(),
  //       FinancialReport.getFinancialStats(todayStr), // Passed todayStr here
  //       FinancialReport.getRevenueSources(),
  //     ]);

  //     console.log("DATABASE STATS:", stats);

  //     res.status(200).json({
  //       success: true,
  //       data: {
  //         summary: stats,
  //         monthlyTrend,
  //         sources,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("REPORT ERROR:", error);
  //     res.status(500).json({ success: false, error: error.message });
  //   }
  // },
};

module.exports = adminController;

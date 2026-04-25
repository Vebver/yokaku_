const Dashboard = require("../models/AdminDashboard");
const AccountManagement = require("../models/AccountManagement");
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
  getRevenueChartData: async (req, res) => {
    try {
      const data = await Dashboard.getRevenueChartData();
      res.json(data);
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
      const { userId, isAdmin } = req.body;
      await AccountManagement.updateUserRole(userId, isAdmin);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = adminController;

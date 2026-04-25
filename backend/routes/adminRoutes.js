const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Define the routes for your React app to call
router.get('/stats', protect, adminOnly, adminController.getDashboardStats);
router.get('/revenue-chart', protect, adminOnly, adminController.getRevenueChartData);

module.exports = router;
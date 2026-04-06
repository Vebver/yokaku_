const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Define the routes for your React app to call
router.get('/stats', adminController.getDashboardStats);
router.get('/revenue-chart', adminController.getRevenueChartData);

module.exports = router;
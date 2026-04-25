const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Define the routes for your React app to call
router.get('/stats', protect, adminOnly, adminController.getDashboardStats);
router.get('/revenue-chart', protect, adminOnly, adminController.getRevenueChartData);
router.put('/users/:userId/update-role', protect, adminOnly, adminController.updateUserRole);
router.get('/users', protect, adminOnly, adminController.getAllUsers);
router.get('/table-status', protect, adminOnly, adminController.getTable);
router.post('/walk-in/:tableId', protect, adminOnly, adminController.Walkin);
router.put('/checkout/:tableId', protect, adminOnly, adminController.CheckOut);

module.exports = router;
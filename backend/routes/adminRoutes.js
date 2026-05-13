const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const maintenanceController = require('../controllers/maintenanceController');
const blockedDateController = require('../controllers/blockedDateController');
const { protect, adminOnly } = require("../middleware/authMiddleware");

// --- DASHBOARD & TABLE ROUTES (Accessible by Admin and Cashier) ---
router.get('/today-schedule', protect, adminOnly, adminController.getTodaySchedule);
router.get('/stats', protect, adminOnly, adminController.getDashboardStats);
router.get('/reports/financial', protect, adminOnly, adminController.getFinancialOverview);
router.get('/table-status', protect, adminOnly, adminController.getTable);
router.get('/getTable', protect, adminOnly, adminController.getTable);
router.get('/public/getTable', adminController.getTable);

// --- OPERATIONAL ROUTES (Walk-in / Checkout) ---
router.post('/walk-in/:tableId', protect, adminOnly, adminController.Walkin);
router.put('/checkout/:tableId', protect, adminOnly, adminController.CheckOut);
router.post('/add-table', protect, adminOnly, adminController.addTable);

// --- USER MANAGEMENT (Keep this for Admin and Cashier update permissions) ---
router.put('/users/:userId/update-role', protect, adminOnly, adminController.updateUserRole);
router.get('/users', protect, adminOnly, adminController.getAllUsers);

// --- MAINTENANCE ROUTES (Keep protected) ---
router.post('/clean-reserve', protect, adminOnly, maintenanceController.cleanReserve);
router.post('/clean-storage', protect, adminOnly, maintenanceController.cleanStorage);
router.get('/backup', protect, adminOnly, maintenanceController.backupDatabase);

// --- BLOCKED DATES ---
router.get('/blocked-dates', blockedDateController.list); 
router.post('/blocked-dates', protect, adminOnly, blockedDateController.add);
router.delete('/blocked-dates/:id', protect, adminOnly, blockedDateController.remove);

module.exports = router;
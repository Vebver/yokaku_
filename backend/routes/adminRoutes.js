const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const maintenanceController = require('../controllers/maintenanceController');
const blockedDateController = require('../controllers/blockedDateController');
const { protect, adminOnly } = require("../middleware/authMiddleware");

// --- ADMIN PRIVATE ROUTES (Locked) ---
router.get('/today-schedule', protect, adminOnly, adminController.getTodaySchedule);
router.get('/stats', protect, adminOnly, adminController.getDashboardStats);
router.get('/reports/financial', protect, adminOnly, adminController.getFinancialOverview);
router.put('/users/:userId/update-role', protect, adminOnly, adminController.updateUserRole);
router.get('/users', protect, adminOnly, adminController.getAllUsers);
router.get('/table-status', protect, adminOnly, adminController.getTable);

router.post('/walk-in/:tableId', protect, adminOnly, adminController.Walkin);
router.put('/checkout/:tableId', protect, adminOnly, adminController.CheckOut);

// --- MAINTENANCE ROUTES (Locked) ---
router.post('/clean-reserve', protect, adminOnly, maintenanceController.cleanReserve);
router.post('/clean-storage', protect, adminOnly, maintenanceController.cleanStorage);
router.get('/backup', protect, adminOnly, maintenanceController.backupDatabase);

// --- BLOCKED DATES ROUTES ---

// 1. PUBLIC: Customers need this for the date picker (NO MIDDLEWARE)
router.get('/blocked-dates', blockedDateController.list); 

// 2. PRIVATE: Only Admin can add or delete (LOCKED)
router.post('/blocked-dates', protect, adminOnly, blockedDateController.add);
router.delete('/blocked-dates/:id', protect, adminOnly, blockedDateController.remove);
router.get('/getTable',adminController.getTable)

router.post('/add-table', protect, adminOnly, adminController.addTable);

module.exports = router;
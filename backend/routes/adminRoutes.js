const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const maintenanceController = require('../controllers/maintenanceController');
const blockedDateController = require('../controllers/blockedDateController');
const backupController = require('../controllers/backupController');
const { getFinancialAnalytics } = require('../controllers/reportController');
const { protect, adminOnly } = require("../middleware/authMiddleware");

// --- DASHBOARD & TABLE ROUTES (Accessible by Admin and Cashier) ---
router.get('/today-schedule', protect, adminOnly, adminController.getTodaySchedule);
router.get('/stats', protect, adminOnly, adminController.getDashboardStats);
// router.get('/reports/financial', protect, adminOnly, adminController.getFinancialOverview);
router.get('/table-status', protect, adminOnly, adminController.getTable);
router.get('/getTable', protect, adminOnly, adminController.getTable);
router.get('/public/getTable', adminController.getTable);
router.get('/reports/financial-analytics', protect, adminOnly, getFinancialAnalytics);

// --- OPERATIONAL ROUTES (Walk-in / Checkout) ---
router.post('/walk-in/:tableId', protect, adminOnly, adminController.Walkin);
router.put('/checkout/:tableId', protect, adminOnly, adminController.CheckOut);
router.post('/add-table', protect, adminOnly, adminController.addTable);
router.delete('/tables/:tableId', protect, adminOnly, adminController.deleteTable);

// --- USER MANAGEMENT (Keep this for Admin and Cashier update permissions) ---
router.put('/users/:userId/update-role', protect, adminOnly, adminController.updateUserRole);
router.get('/users', protect, adminOnly, adminController.getAllUsers);

// --- MAINTENANCE ROUTES (Keep protected) ---
router.post('/set-kiosk-reservation',protect, adminOnly, maintenanceController.updateKioskReservation);
router.post('/reset', protect, adminOnly, maintenanceController.reset);
router.get('/export-csv', protect, adminOnly, maintenanceController.exportData);
router.get('/export-financial-pdf', protect, adminOnly, maintenanceController.exportFinancialPdf);

// --- BACKUP & RESTORE ROUTES ---
router.post('/backup', protect, adminOnly, backupController.createBackup);
router.get('/backups', protect, adminOnly, backupController.listBackups);
router.post('/backup/restore/:filename', protect, adminOnly, backupController.restoreBackup);
router.delete('/backup/:filename', protect, adminOnly, backupController.deleteBackup);
router.get('/backup/download/:filename', protect, adminOnly, backupController.downloadBackup);

// --- BLOCKED DATES ---
router.get('/blocked-dates', blockedDateController.list); 
router.post('/blocked-dates', protect, adminOnly, blockedDateController.add);
router.delete('/blocked-dates/:id', protect, adminOnly, blockedDateController.remove);

module.exports = router;

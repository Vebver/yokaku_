const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');

router.post('/clean-reserve',maintenanceController.cleanReserve)
router.post('/clean-storage', maintenanceController.cleanStorage);
router.get('/backup', maintenanceController.backupDatabase);

module.exports = router;
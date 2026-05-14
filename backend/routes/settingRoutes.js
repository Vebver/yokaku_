const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const priceController = require('../controllers/priceController'); // Import the new controller

// ORIGINAL: /api/settings
router.get('/', settingController.getSettings);
router.put('/', settingController.updateSettings);
module.exports = router;
const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const priceController = require('../controllers/priceController'); // Import the new controller

// ORIGINAL: /api/settings
router.get('/', settingController.getSettings);
router.put('/', settingController.updateSettings);

// NEW: /api/settings/peak-pricing
// Since this router is likely mounted at '/api/settings', we just add '/peak-pricing'
router.get('/peak-pricing', priceController.getSettings);
router.put('/peak-pricing', priceController.updateSettings);

module.exports = router;
const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const priceController = require('../controllers/priceController'); // Import the new controller
const { protect, adminOnly } = require('../middleware/authMiddleware');

// ORIGINAL: /api/settings
// GET is public (customer footer / payment info need it without login).
// PUT is admin-only so only the Admin can change footer/payment content.
router.get('/', settingController.getSettings);
router.put('/', protect, adminOnly, settingController.updateSettings);
module.exports = router;
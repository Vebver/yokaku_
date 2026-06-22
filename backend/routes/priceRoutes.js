const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController'); // Import the new controller

router.get('/', priceController.getSettings);
router.put('/', priceController.updateSettings);

module.exports = router;
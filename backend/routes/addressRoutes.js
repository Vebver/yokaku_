const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');

// Route to get Municipalities for Bulacan
router.get('/municipalities', addressController.getMunicipalities);

// Route to get Barangays
router.get('/barangays/:municipalityCode', addressController.getBarangays);

module.exports = router;
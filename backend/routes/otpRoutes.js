const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// This handles: POST /api/otp/send
router.post("/send", authController.sendReservationOTP);

// This handles: POST /api/otp/verify
router.post("/verify", authController.verifyReservationOTP);

module.exports = router;
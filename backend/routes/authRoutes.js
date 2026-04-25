const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  message: { error: "Too many OTP requests, please try again later." },
});

// Apply it only to the send routes
router.post("/signup", otpLimiter, authController.signup);
router.post("/otp/send", otpLimiter, authController.sendReservationOTP);

// --- User Authentication Routes ---
router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyOTP);

// --- Reservation OTP Routes ---
// These match: axios.post("http://localhost:5000/api/otp/send", ...)
router.post("/otp/send", authController.sendReservationOTP);
router.post("/otp/verify", authController.verifyReservationOTP);

// FORGOT PASSWORD
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password-final", authController.resetPasswordFinal);

module.exports = router;

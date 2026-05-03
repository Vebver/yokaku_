const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  message: { error: "Too many OTP requests, please try again later." },
});

// --- User Authentication Routes ---
router.post("/signup", otpLimiter, authController.signup);
router.post("/login", authController.login);
router.post("/verify-otp", authController.verifyOTP);

// --- Reservation OTP Routes ---
router.post("/otp/send", otpLimiter, authController.sendReservationOTP);
router.post("/otp/verify", authController.verifyReservationOTP);

// --- Forgot Password Routes ---
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password-final", authController.resetPasswordFinal);

module.exports = router;

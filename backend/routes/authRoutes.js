const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");
const {
  validateLogin,
  validateSignup,
  validateOTP,
  validateForgotPassword,
  validateResetPassword,
} = require("../middleware/validators");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  message: { error: "Too many OTP requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: { error: "Too many authentication attempts, please try again later." },
});

// --- User Authentication Routes (with input validation) ---
router.post("/signup", authLimiter, otpLimiter, validateSignup, authController.signup);
router.post("/login", authLimiter, validateLogin, authController.login);
router.post("/verify-otp", validateOTP, authController.verifyOTP);

// --- Reservation OTP Routes ---
router.post("/otp/send", otpLimiter, authController.sendReservationOTP);
router.post("/otp/verify", validateOTP, authController.verifyReservationOTP);

// --- Forgot Password Routes (with input validation) ---
router.post("/forgot-password", authLimiter, validateForgotPassword, authController.forgotPassword);
router.post("/reset-password-final", authLimiter, validateResetPassword, authController.resetPasswordFinal);

// --- Change Password Route (with input validation) ---
const { validateChangePassword } = require("../middleware/validators");
router.post("/reset-password", authLimiter, validateChangePassword, authController.resetPassword);

module.exports = router;

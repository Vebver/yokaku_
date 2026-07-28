/**
 * INPUT VALIDATION MIDDLEWARE
 * Uses express-validator to sanitize and validate all user inputs.
 */

const { body, validationResult } = require("express-validator");

// ──────────────────────────────────────
// 1. Validation result handler
// ──────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      error: firstError.msg,
      field: firstError.path,
    });
  }
  next();
};

// ──────────────────────────────────────
// 2. LOGIN VALIDATION
// ──────────────────────────────────────
const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 1 })
    .withMessage("Password cannot be empty"),

  handleValidationErrors,
];

// ──────────────────────────────────────
// 3. SIGNUP VALIDATION
// ──────────────────────────────────────
const validateSignup = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("First name can only contain letters, spaces, hyphens, and apostrophes")
    .escape(),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Last name can only contain letters, spaces, hyphens, and apostrophes")
    .escape(),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),

  handleValidationErrors,
];

// ──────────────────────────────────────
// 4. OTP VERIFICATION VALIDATION
// ──────────────────────────────────────
const validateOTP = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),

  handleValidationErrors,
];

// ──────────────────────────────────────
// 5. FORGOT PASSWORD VALIDATION
// ──────────────────────────────────────
const validateForgotPassword = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  handleValidationErrors,
];

// ──────────────────────────────────────
// 6. RESET PASSWORD VALIDATION
// ──────────────────────────────────────
const validateResetPassword = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ min: 32, max: 64 })
    .withMessage("Invalid reset token format")
    .isHexadecimal()
    .withMessage("Invalid reset token format"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),

  handleValidationErrors,
];

// ──────────────────────────────────────
// 7. PROFILE UPDATE VALIDATION
// ──────────────────────────────────────
const validateProfileUpdate = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("First name can only contain letters, spaces, hyphens, and apostrophes")
    .escape(),

  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Last name can only contain letters, spaces, hyphens, and apostrophes")
    .escape(),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  handleValidationErrors,
];

// ──────────────────────────────────────
// 8. CHANGE PASSWORD VALIDATION
// ──────────────────────────────────────
const validateChangePassword = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),

  handleValidationErrors,
];

module.exports = {
  validateLogin,
  validateSignup,
  validateOTP,
  validateForgotPassword,
  validateResetPassword,
  validateProfileUpdate,
  validateChangePassword,
};


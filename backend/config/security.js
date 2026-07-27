/**
 * SECURITY CONFIGURATION
 * Centralized security settings for the Yokaku backend.
 * Validates critical env vars and exports security middleware configs.
 */

require("dotenv").config();

// ──────────────────────────────────────
// 1. CRITICAL ENVIRONMENT VALIDATION
// ──────────────────────────────────────
const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "BREVO_PASS",
  "CLOUDINARY_NAME",
  "CLOUDINARY_KEY",
  "CLOUDINARY_SECRET",
];

const missingVars = REQUIRED_ENV_VARS.filter(
  (varName) => !process.env[varName]
);

if (missingVars.length > 0) {
  console.error("❌ CRITICAL: Missing required environment variables:");
  missingVars.forEach((v) => console.error(`   - ${v}`));
  console.error(
    "⚠️  Server will start but some features may not work correctly."
  );
}

// Check JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn(
    "⚠️  WARNING: JWT_SECRET is too short (< 32 chars). Use a strong random string."
  );
}

// ──────────────────────────────────────
// 2. GLOBAL RATE LIMIT CONFIG
// ──────────────────────────────────────
const globalRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// ──────────────────────────────────────
// 3. AUTH RATE LIMIT CONFIG (stricter)
// ──────────────────────────────────────
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// ──────────────────────────────────────
// 4. HELMET CONTENT SECURITY POLICY
// ──────────────────────────────────────
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", ...(process.env.FRONTEND_URL || "http://localhost:5173").split(",")],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
};

module.exports = {
  REQUIRED_ENV_VARS,
  missingVars,
  globalRateLimit,
  authRateLimit,
  helmetConfig,
};


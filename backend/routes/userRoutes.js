const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { validateProfileUpdate } = require("../middleware/validators");

// Mount at /api/profile in server.js
router.get("/", protect, userController.getProfile);
router.put("/", protect, validateProfileUpdate, userController.updateProfile);

module.exports = router;

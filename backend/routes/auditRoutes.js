const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const auditLogController = require("../controllers/auditLogController");

// Secure all audit trail access routes with your standard session token protection middleware
router.get("/", protect, auditLogController.getAuditLogs);

module.exports = router;
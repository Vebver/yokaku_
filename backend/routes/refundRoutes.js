// routes/refundRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");
const {
  sendRefundNotificationEmail,
  sendRefundConfirmationEmail,
} = require("../utils/emailService");

router.post("/request", protect, async (req, res) => {
  try {
    console.log("🔍 Refund request received");
    console.log("📦 Request body:", req.body);
    console.log("👤 req.user:", req.user);

    const { reservationId, subject, comment, email, reason, reservationType } =
      req.body;

    // Handle both userId and id from token
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      console.error("❌ No userId found in token");
      return res.status(401).json({ error: "User ID not found in token" });
    }

    if (!reservationId) {
      return res.status(400).json({ error: "Reservation ID is required" });
    }

    // Get user name from database
    const [userRows] = await db.execute(
      "SELECT first_name, last_name FROM users WHERE id = ?",
      [userId],
    );

    const userName =
      userRows.length > 0
        ? `${userRows[0].first_name} ${userRows[0].last_name}`
        : "Customer";

    console.log("✅ Inserting into database...");

    const [result] = await db.execute(
      `INSERT INTO refund_requests (user_id, reservation_id, subject, comment, email, reason, reservation_type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [userId, reservationId, subject, comment, email, reason, reservationType],
    );

    console.log("✅ Refund request inserted, ID:", result.insertId);

    // Prepare refund data for email
    const refundData = {
      reservationId,
      subject,
      comment,
      email,
      reason,
      reservationType,
      userName,
    };

    // Send email notifications (don't await - let them run in background)
    Promise.all([
      sendRefundNotificationEmail(refundData),
      sendRefundConfirmationEmail(refundData),
    ])
      .then(() => {
        console.log("✅ Both emails sent successfully");
      })
      .catch((error) => {
        console.error("❌ Email sending error (non-blocking):", error);
      });

    res.json({
      success: true,
      message:
        "Refund request submitted successfully. You will receive a confirmation email shortly.",
      refundId: result.insertId,
    });
  } catch (error) {
    console.error("❌ Refund request error:", error);
    console.error("📋 Error stack:", error.stack);

    // Handle specific database errors
    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({
        error: "Database column mismatch. Please check table structure.",
        details: error.message,
      });
    }

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        error: "refund_requests table does not exist. Please create it first.",
      });
    }

    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

module.exports = router;

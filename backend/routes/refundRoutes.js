// routes/refundRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");
const {
  sendRefundNotificationEmail,
  sendRefundConfirmationEmail,
} = require("../utils/emailService");

// ===== TEST ROUTE - Uses environment variable =====
router.get("/test-http", async (req, res) => {
  try {
    console.log("🔍 Testing Brevo HTTP API...");
    console.log("📧 API Key exists:", !!process.env.BREVO_PASS);
    console.log("📧 BREVO_USER:", process.env.BREVO_USER);

    // Get API key from environment variable ONLY
    const apiKey = process.env.BREVO_PASS;

    if (!apiKey) {
      return res.status(500).json({
        error: "BREVO_PASS environment variable not set",
        env: {
          hasApiKey: !!process.env.BREVO_PASS,
          hasUser: !!process.env.BREVO_USER,
        },
      });
    }

    const brevo = require("@getbrevo/brevo");
    const apiInstance = new brevo.TransactionalEmailsApi();
    const auth = apiInstance.authentications["apiKey"];
    auth.apiKey = apiKey; // Use from env, NOT hardcoded

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = "Test Email - HTTP API";
    sendSmtpEmail.htmlContent =
      "<h1>Test Email</h1><p>HTTP API is working on Render!</p>";
    sendSmtpEmail.sender = {
      email: process.env.BREVO_USER || "leabrescarl@gmail.com",
      name: "Restaurant Test",
    };
    sendSmtpEmail.to = [{ email: "leabrescarl@gmail.com" }];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Test email sent:", response.messageId);
    res.json({ success: true, messageId: response.messageId });
  } catch (error) {
    console.error("❌ HTTP API test error:", error);
    res.status(500).json({
      error: error.message,
      details: error.response?.body || error.stack,
    });
  }
});

// ===== Main Refund Route =====
router.post("/request", protect, async (req, res) => {
  try {
    console.log("🔍 Refund request received");
    console.log("📦 Request body:", req.body);
    console.log("👤 req.user:", req.user);

    const { reservationId, subject, comment, email, reason, reservationType } =
      req.body;

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

    console.log("📧 Attempting to send emails...");

    // Send email notifications
    const storeResult = await sendRefundNotificationEmail(refundData);
    console.log("📧 Store email result:", storeResult);

    const customerResult = await sendRefundConfirmationEmail(refundData);
    console.log("📧 Customer email result:", customerResult);

    res.json({
      success: true,
      message: "Refund request submitted successfully.",
      refundId: result.insertId,
    });
  } catch (error) {
    console.error("❌ Refund request error:", error);
    console.error("📋 Error stack:", error.stack);

    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;

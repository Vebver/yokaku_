// routes/refundRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const Reservation = require("../models/Reservation");
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

    const axios = require("axios");

    const data = {
      sender: {
        email: process.env.BREVO_USER || "leabrescarl@gmail.com",
        name: "Restaurant Test",
      },
      to: [{ email: "leabrescarl@gmail.com" }],
      subject: "Test Email - HTTP API",
      htmlContent: "<h1>Test Email</h1><p>HTTP API is working on Render!</p>",
    };

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      data,
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Test email sent:", response.data.messageId);
    res.json({ success: true, messageId: response.data.messageId });
  } catch (error) {
    console.error("❌ HTTP API test error:", error);
    res.status(500).json({
      error: error.message,
      details: error.response?.data || error.stack,
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

    // ===== FIXED: Use 'user_id' column (matches your User model) =====
    const [userRows] = await db.execute(
      "SELECT first_name, last_name FROM users WHERE user_id = ?",
      [userId],
    );

    const userName =
      userRows.length > 0
        ? `${userRows[0].first_name} ${userRows[0].last_name}`
        : "Customer";

    console.log("✅ User found:", userName);

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      console.log("✅ Inserting into refund_requests table...");

      const [result] = await conn.execute(
        `INSERT INTO refund_requests (user_id, reservation_id, subject, comment, email, reason, reservation_type, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [userId, reservationId, subject, comment, email, reason, reservationType],
      );

      const cancellationReason = comment
        ? `${reason || "Refund request"} | Comment: ${comment}`
        : reason || "Refund request submitted by customer";

      await Reservation.updateStatus(
        reservationId,
        "Cancelled",
        cancellationReason,
      );

      await conn.commit();

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
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("❌ Refund request error:", error);
    console.error("📋 Error stack:", error.stack);

    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;

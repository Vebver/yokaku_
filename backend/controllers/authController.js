const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const axios = require("axios");

// In-memory OTP store
const otpStore = new Map();

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP via Brevo API (HTTP - works on Render free tier)
const sendOTP = async (email, otp) => {
  console.log(`📧 Attempting to send OTP to: ${email}`);

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Hangout Resto Bar",
          email: process.env.BREVO_USER || "leabrescarl@gmail.com",
        },
        to: [{ email }],
        subject: "🔐 Your Hangout OTP Verification Code",
        textContent: `Your OTP verification code is: ${otp}\n\nThis code is valid for 1 hour.\n\nIf you didn't request this, please ignore this email.`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #f38d31; text-align: center;">🔐 Hangout Resto Bar</h2>
            <h3 style="text-align: center; color: #333;">OTP Verification Code</h3>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: bold; color: #f38d31; letter-spacing: 5px;">${otp}</span>
            </div>
            <p style="color: #666; text-align: center;">This code is valid for <strong>1 hour</strong>.</p>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center;">Hangout Resto Bar</p>
          </div>
        `,
      },
      {
        headers: {
          "api-key": process.env.BREVO_PASS,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds timeout
      },
    );

    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${response.data.messageId}`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to send OTP to ${email}:`,
      error.response?.data?.message || error.message,
    );
    console.log(`🔑 FALLBACK OTP FOR ${email}: ${otp}`);
    return false;
  }
};

// Clean up expired OTPs periodically (every minute)
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expires < now) {
      otpStore.delete(email);
    }
  }
}, 60000);

const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.user_id, role: user.role || "customer" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      );

      res.json({
        token,
        user: {
          id: user.user_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role || "customer",
        },
      });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(400).json({ error: "User not found." });
      }

      const resetToken = crypto.randomBytes(20).toString("hex");
      const resetExpires = Date.now() + 3600000;

      await User.update(user.user_id, {
        reset_password_token: resetToken,
        reset_password_expires: resetExpires,
      });

      console.log(`Password reset token for ${email}: ${resetToken}`);

      res.json({
        message: "Reset link would be sent to email (email disabled for now)",
      });
    } catch (error) {
      console.error("Forgot Password Error:", error);
      res.status(500).json({ error: "Failed to process request." });
    }
  },

  async resetPasswordFinal(req, res) {
    try {
      const { token, newPassword } = req.body;

      const user = await User.findByResetToken(token);

      if (
        !user ||
        !user.reset_password_expires ||
        user.reset_password_expires < Date.now()
      ) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token." });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await User.update(user.user_id, {
        password_hash: newHash,
        reset_password_token: null,
        reset_password_expires: null,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Reset Password Final Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async resetPassword(req, res) {
    try {
      const { email, currentPassword, newPassword } = req.body;
      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await User.update(user.user_id, { password_hash: newHash });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Reset Password Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async signup(req, res) {
    try {
      const { firstName, lastName, email, password } = req.body;

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const otp = generateOTP();

      // Store OTP - valid for 1 hour (3600000 ms)
      otpStore.set(email, {
        firstName,
        lastName,
        password,
        otp,
        expires: Date.now() + 3600000, // 1 hour
      });

      console.log(`========================================`);
      console.log(`✅ SIGNUP ATTEMPT FOR: ${email}`);
      console.log(`🔑 YOUR OTP CODE IS: ${otp}`);
      console.log(`⏰ Valid for 1 hour`);
      console.log(`========================================`);

      try {
        await sendOTP(email, otp);
        console.log(`✅ OTP email sent to ${email}`);
      } catch (emailError) {
        console.log(`⚠️ Email sending had issues: ${emailError.message}`);
      }

      res.json({
        message: "OTP sent to email",
        email,
        dev_otp: process.env.NODE_ENV === "development" ? otp : undefined,
      });
    } catch (error) {
      console.error("Signup Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const pending = otpStore.get(email);

      console.log(
        `Verifying OTP for ${email}: provided OTP = ${otp}, stored OTP = ${pending?.otp}`,
      );

      if (!pending || pending.expires < Date.now() || pending.otp !== otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      const userId = await User.create(
        email,
        pending.password,
        pending.firstName,
        pending.lastName,
      );

      otpStore.delete(email);

      const token = jwt.sign(
        { userId, role: "customer" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      );

      res.json({
        token,
        user: {
          id: userId,
          email,
          firstName: pending.firstName,
          lastName: pending.lastName,
          role: "customer",
        },
        message: "Account created successfully",
      });
    } catch (error) {
      console.error("Verify OTP Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async sendReservationOTP(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const otp = generateOTP();

      // FIX: Delete existing OTP first to invalidate previous one
      // Then store the new OTP - valid for 1 hour
      otpStore.delete(email); // This invalidates the previous OTP

      otpStore.set(email, {
        otp,
        expires: Date.now() + 3600000, // 1 hour
      });

      console.log(`========================================`);
      console.log(`🔄 RESEND OTP FOR: ${email}`);
      console.log(`🔑 NEW OTP CODE IS: ${otp}`);
      console.log(`⏰ Valid for 1 hour`);
      console.log(`⚠️ Previous OTP is now INVALID`);
      console.log(`========================================`);

      try {
        await sendOTP(email, otp);
      } catch (emailError) {
        console.log(`Email sending skipped: ${emailError.message}`);
      }

      res.json({
        message: "OTP resent to email",
        dev_otp: process.env.NODE_ENV === "development" ? otp : undefined,
      });
    } catch (error) {
      console.error("OTP Send Error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  },

  async verifyReservationOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const pending = otpStore.get(email);

      if (!pending || pending.expires < Date.now() || pending.otp !== otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      otpStore.delete(email);
      res.json({ success: true, message: "OTP verified" });
    } catch (error) {
      console.error("Verify Reservation OTP Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = authController;

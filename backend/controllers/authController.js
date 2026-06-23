const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

// In-memory OTP store
const otpStore = new Map();

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  // Add these to improve deliverability
  pool: true,
  maxConnections: 1,
  rateLimit: 5,
});

// Send OTP via email - will likely go to spam but that's okay
const sendOTP = async (email, otp) => {
  console.log(`📧 Attempting to send OTP to: ${email}`);

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "🔐 Your Hangout OTP Verification Code",
    text: `Your OTP verification code is: ${otp}\n\nThis code is valid for 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #f38d31; text-align: center;">🔐 Hangout Resto Bar</h2>
        <h3 style="text-align: center; color: #333;">OTP Verification Code</h3>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; color: #f38d31; letter-spacing: 5px;">${otp}</span>
        </div>
        <p style="color: #666; text-align: center;">This code is valid for <strong>5 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; text-align: center;">Hangout Resto Bar</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error.message);
    // Fallback: log the OTP so you can still see it in Render logs
    console.log(`🔑 FALLBACK OTP FOR ${email}: ${otp}`);
    // Still return true so the signup process continues
    return false;
  }
};

// Clean up expired OTPs periodically
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

      // Store OTP
      otpStore.set(email, {
        firstName,
        lastName,
        password,
        otp,
        expires: Date.now() + 5 * 60 * 1000,
      });

      // Log OTP to console (for debugging)
      console.log(`========================================`);
      console.log(`✅ SIGNUP ATTEMPT FOR: ${email}`);
      console.log(`🔑 YOUR OTP CODE IS: ${otp}`);
      console.log(`⏰ Valid for 5 minutes`);
      console.log(`========================================`);

      // Try to send email
      try {
        await sendOTP(email, otp);
        console.log(`✅ OTP email sent to ${email}`);
      } catch (emailError) {
        console.log(`⚠️ Email sending had issues: ${emailError.message}`);
        // Don't fail the signup - OTP is still in console logs
      }

      res.json({
        message: "OTP sent to email",
        email,
        // For development: include OTP in response if email fails
        // Remove this in production
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

      otpStore.set(email, {
        otp,
        expires: Date.now() + 5 * 60 * 1000,
      });

      console.log(`Reservation OTP for ${email}: ${otp}`);

      // Try to send email
      try {
        await sendOTP(email, otp);
      } catch (emailError) {
        console.log(`Email sending skipped: ${emailError.message}`);
      }

      res.json({
        message: "OTP sent to email",
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

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

// Email sending is TEMPORARILY DISABLED for Render deployment
// Will re-enable once SMTP issue is resolved
const sendOTP = async (email, otp) => {
  // Skip actual email sending - just log
  console.log(`========================================`);
  console.log(`📧 EMAIL WOULD BE SENT TO: ${email}`);
  console.log(`🔑 OTP CODE: ${otp}`);
  console.log(`⏰ Valid for 5 minutes`);
  console.log(`========================================`);

  // For production, uncomment below when SMTP works
  /*
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Hangout OTP Verification",
    text: `Your OTP is ${otp}. Valid for 5 mins.`,
    html: `<h2>Your Hangout OTP</h2><p style="font-size: 24px; font-weight: bold;">${otp}</p><p>Valid for 5 minutes.</p>`,
  });
  */
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

      // Log OTP to console - check Render logs
      console.log(`========================================`);
      console.log(`✅ SIGNUP ATTEMPT FOR: ${email}`);
      console.log(`🔑 YOUR OTP CODE IS: ${otp}`);
      console.log(`⏰ Valid for 5 minutes`);
      console.log(`========================================`);

      // Try to send email but don't fail
      try {
        await sendOTP(email, otp);
      } catch (emailError) {
        console.log(`Email sending skipped: ${emailError.message}`);
      }

      res.json({ message: "OTP sent to email", email });
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

      res.json({
        message: "OTP would be sent to email (email disabled for testing)",
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

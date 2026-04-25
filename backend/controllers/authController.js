const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Hangout OTP Verification",
    text: `Your OTP is ${otp}. Valid for 5 mins.`,
    html: `<h2>Your Hangout OTP</h2><p style="font-size: 24px; font-weight: bold;">${otp}</p><p>Valid for 5 minutes.</p>`,
  });
};

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
      res.status(500).json({ error: error.message });
    }
  },

  // 1. FORGOT PASSWORD - Generate token and send email
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(400).json({ error: "User not found." });
      }

      const resetToken = crypto.randomBytes(20).toString("hex");
      const resetExpires = Date.now() + 3600000; // 1 hour

      // Update DB with token
      await User.update(user.user_id, {
        reset_password_token: resetToken,
        reset_password_expires: resetExpires,
      });

      // Match this to your frontend port (3000 or 5173)
      const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Password Reset Link",
        html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Please click the link below to proceed:</p>
        <a href="${resetUrl}" style="background: #ffd400; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset My Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
      });

      res.json({ message: "Reset link sent to email" });
    } catch (error) {
      console.error("Forgot Password Error:", error);
      res.status(500).json({ error: "Failed to send email." });
    }
  },

  // 2. RESET PASSWORD FINAL - Missing function that was causing your error
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
      res.status(500).json({ error: error.message });
    }
  },

  // 3. RESET PASSWORD - For logged in users
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
      req.app.locals.pendingOTPs = req.app.locals.pendingOTPs || {};
      req.app.locals.pendingOTPs[email] = {
        firstName,
        lastName,
        password,
        otp,
        expires: Date.now() + 5 * 60 * 1000,
      };

      await sendOTP(email, otp);
      res.json({ message: "OTP sent to email", email });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const pending = req.app.locals.pendingOTPs?.[email];

      if (!pending || pending.expires < Date.now() || pending.otp !== otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      const userId = await User.create(
        email,
        pending.password,
        pending.firstName,
        pending.lastName,
      );

      delete req.app.locals.pendingOTPs[email];

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
      res.status(500).json({ error: error.message });
    }
  },

  async sendReservationOTP(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const otp = generateOTP();

      req.app.locals.pendingOTPs = req.app.locals.pendingOTPs || {};
      req.app.locals.pendingOTPs[email] = {
        otp,
        expires: Date.now() + 5 * 60 * 1000,
      };

      await sendOTP(email, otp);
      res.json({ message: "OTP sent to email successfully" });
    } catch (error) {
      console.error("OTP Send Error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  },

  async verifyReservationOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const pending = req.app.locals.pendingOTPs?.[email];

      if (!pending || pending.expires < Date.now() || pending.otp !== otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      delete req.app.locals.pendingOTPs[email];
      res.json({ success: true, message: "OTP verified" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = authController;
